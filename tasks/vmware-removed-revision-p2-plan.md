# Implementačný plán: P2 regresia removedRevision

Dátum: 2026-10-22. Stav: spresnený plán vykonaný inline; P2-1 až P2-4 overené, výsledky a Git súbeh v samostatnom P2 todo.
Checklist: [vmware-removed-revision-p2-todo.md](vmware-removed-revision-p2-todo.md).
Používateľ výslovne schválil tieto samostatné cesty. Súbežný nedokončený Snapshot Policy plán v tasks/plan.md a tasks/todo.md sa neprepisuje.

## Cieľ a hranice

Odstrániť potvrdené blokovanie automatického VMware inventory fetchu po úspešnom provider/credential update bez cached dát. Zachovať dvojhodnotový revision guard, pôvodný delete-provider regresný test, latest-request-wins, pending/error settlement, providerless odmietnutie, debounce a generated query identitu. Automatický fetch po recreate musí fungovať v stále pripojených hookoch bez manuálneho refreshu alebo remountu. Navyše explicitne odmietnuť manuálny `forceRefresh()` počas platného delete markeru a zabrániť tomu, aby oneskorený starý delete po novšom recreate odstránil obnovenú cache.

Vykonanie prebehlo na existujúcej vetve, bez stash/reset/worktree/commitu/pushu a bez subagentov. Povolenie vytvoriť commit de05e953 patrilo pôvodnej úlohe; na túto následnú opravu sa nevzťahuje. Súbežné OpenAPI/Snapshot Policy ani Policy Catalog zmeny sa neupravujú.

## Overený aktuálny stav

- Vetva `spike/ant-design-shell`, HEAD `de05e953` (`fix(resources): guard VMware refresh results against provider changes`).
- Hook test súbor má pred týmto plánovaním diff 85 additions / 1 deletion: šesť P2 reprodukčných prípadov zo samostatného preverenia. Zachovať ich aj ich assertions.
- Cudzie zmeny pri začiatku: `openapi/abco-api.json` a generated Zod súbory `snapshotPoliciesResponse.gen.ts`, `snapshotPolicy.gen.ts`, `snapshotPolicyRecord.gen.ts`, `submitPolicyBody.gen.ts`. Počas plánovania ďalší agent zmenil tasks/plan.md a tasks/todo.md na Snapshot Policy FlashCopy plán; kontrola pred zápisom to zachytila. Neboli prepísané.
- CodeGraph použitý pred čítaním kódu. `useVmwareResourceInventory.ts:128–131` nastaví removedRevision pri neplatnom snapshote a chýbajúcich dátach bez dôkazu delete. Riadky 100–109 následne odovzdajú useQuery enabled=false. Focus/reconnect disabled observer neobnoví, remount lokálny stav vymaže.
- `providerMutationInvalidation.ts:20–28`: infra revision bump → await cancel → pri delete remove → await invalidate. Credential vetva zachytí infra/platform vzťahy pred await a zachová complete/fallback pravidlá.
- `createAppQueryClient.ts:8–10`: úspešné generated mutations už prechádzajú spoločným MutationCache.onSuccess. Nový globálny callback ani feature-specific provider mutations netreba.
- Nainštalovaný QueryClient.refetchQueries vynecháva disabled queries. WeakMap sama o sebe React nere-renderuje. Subscription a poradie odblokovania sú preto súčasťou opravy.
- ADR 0002 zachováva generated hooks/fetchers/keys a povoľuje existujúci inventory facade pre forced refresh. Nevytvárať ďalšie metadata query keys ani upravovať generated súbory.

## Čerstvá reprodukcia počas plánovania

```powershell
node node_modules/vitest/vitest.mjs run src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx -t 'automatically recovers an empty inventory'
```

Výsledok: **4 failed, 2 passed, 48 skipped**, exit 1. Provider aj credential update zlyhajú na focus/reconnect obnove: cache ostane undefined namiesto Recovered VM. Obe remount vetvy prejdú. Zlyhanie je na finálnej cache assertion, nie na štarte requestov alebo nesprávnom poradí Promise.

Predchádzajúce preverenie piatich súborov: **113 passed / 4 failed (117)**. Je to historický baseline z review, nie nový beh piatich súborov počas plánovania. Vtedy typecheck hlásil chýbajúce flashcopy_copy_rate v Snapshot Policy fixtures. Aktuálny typecheck sa vykoná v P2-4; tieto cudzie fixtures sa tu neopravujú.

## Vybraný návrh

### Oddelené zodpovednosti v existujúcom malom helperi

1. **Platnosť výsledku:** zachovať Readonly<{ providerRevision: number; infraEpoch: number }> aj porovnanie oboch hodnôt. Infra provider a credential ID/fallback bump zostane synchronne pred prvým await. Revisions sa pri query GC, delete ani recreate nevynulujú.
2. **Explicitné lokálne odstránenie:** samostatný delete marker podľa QueryClient a infra provider ID. Vzniká iba v úspešnej infra delete vetve. Neobsahuje inventory dáta ani query keys a neodvodzuje odstránenie z chýbajúcich cached dát.
3. **Reaktivita:** úzka subscription podľa klienta a provider ID, konzumovaná v existujúcom hooku cez useSyncExternalStore. React snapshot je stabilný boolean deleted, nie zakaždým nový objekt. Odber sa uprace pri zmene providera, klienta a unmount. Žiadny druhý lokálny deleted useState/useRef ani falošná metadata query.
4. **Hook:** odstrániť removedRevision z ForceRefreshState, settlementu a canFetch. canFetch závisí od pôvodného enabled/provider/debounce a explicitného deleted snapshotu. Mutation onSuccess naďalej kontroluje requestId aj oba revision údaje synchronne pred zápisom. `forceRefresh()` musí pred spustením mutation **synchronne prečítať aktuálny delete marker priamo zo shared helpera**, nie sa spoliehať len na posledný React render: ak je provider deleted, vráti odmietnutý Promise s jasnou chybou, bez HTTP, pending stavu alebo zápisu do cache. Po úspešnom recreate a odblokovaní je nové legitímne manuálne volanie možné. Force-refresh lokálny stav opäť vlastní iba pending/error.

### Lifecycle a poradie

| Udalosť | Revision | Deleted metadata a notifikácia |
| --- | --- | --- |
| Úspešný infra delete A | Bump A pred await | Nastaviť marker a oznámiť zmenu pred cancel/remove. Pri ďalšom renderi hook zostane disabled aj bez dát; manuálny `forceRefresh()` tiež odmietnuť synchronne. |
| Úspešný infra submit A, A je aktívny | Bump A pred await | Bez false→false notifikácie; existujúca cancel/invalidate cesta refetchuje ako dnes. |
| Úspešný infra submit/recreate A, A je deleted | Bump A pred await | Počas cancel/invalidate ponechať disabled. Až po dokončení tejto cesty podmienene zrušiť marker a oznámiť zmenu; enabled false→true začne nový fetch. |
| Úspešný credential update/delete | Pôvodný ID/fallback bump | Deleted metadata nemení ani nemaže, vrátane predtým odstráneného providera. |
| Failed mutation | Bez zmeny | Bez zmeny a lifecycle notifikácie. |
| Platform provider s rovnakým ID | Pôvodná platform invalidácia | Infra deleted metadata ani infra revision nemení. |

Recreate sa odblokuje až po cancellation/invalidation. Skoršie odblokovanie by mohlo spustiť request, ktorý tá istá mutation hneď zruší alebo zopakuje. Dva hooky rovnakého key využijú existujúce TanStack Query zdieľanie jedného requestu. Reaktivitu treba dokázať bez explicitného testového rerenderu, remountu alebo manuálneho refreshu.

**Nový race medzi lifecycle operáciami nesmie vzniknúť v oboch smeroch:**

- **Starší submit → novší delete:** starší submit čakajúci na invalidáciu nesmie po novšom úspešnom delete vymazať jeho marker. Submit si zachytí identitu delete markeru pri vstupe do callbacku a vymaže ho iba vtedy, ak sa marker nezmenil.
- **Starší delete → novší submit/recreate:** starý delete môže čakať v `await client.cancelQueries(...)`; medzičasom úspešný submit/recreate môže odstrániť marker a spustiť aktuálny fetch. Starý delete potom **nesmie** pokračovať do `removeQueries()` ani do vlastnej zastaranej `invalidateQueries()` tak, aby zmazal alebo zrušil nový výsledok. Pred každým účinkom po `await` overiť aktuálnu identitu/generáciu príslušnej infra lifecycle operácie; ak je prekonaná novším úspešným submitom/delete, neaplikovať zastaraný zásah. Ak jednoduchá identitná kontrola nestačí na ochranu pending cancel/invalidate, zvoliť minimálne per-provider usporiadanie operácií a zdôvodniť ho; nezavádzať globálny framework.

Každý nový delete má novú identitu, aj pri už nastavenom `deleted=true`. Ide o jednu aktuálnu značku odstránenia (s dostatočným identifikačným tokenom pre asynchrónne hranice), nie históriu operácií. Credential bump identitu nemení, preto nezablokuje platné dokončenie recreate. Preskúmať aj vplyv starého `cancelQueries()` na nový request: finálny výsledok musí byť aktuálny bez opakovaného fetch loopu. Konkrétne názvy vnútorného helper API sa doladia v P2-1.

### Vlastníctvo stavu a obnova

Vlastníkom je WeakMap existujúceho helpera. Stav je spoločný všetkým hookom jedného QueryClient a oddelený podľa provider ID aj od platform namespace. Úspešný lokálny submit/recreate rovnakého ID ho zruší; GC, focus, credential mutation ani remount ho nezrušia. WeakMap dovolí uvoľniť celý stav s klientom, unsubscribe uvoľní odbery. Nejde o permanentný zákaz ID.

Oprava riadi automatické `useQuery({enabled})` správanie **aj** explicitné volanie `forceRefresh()`: pri aktívnom lokálnom delete markeri je zakázané začať nové manuálne inventory HTTP volanie, a to aj cez starú referenciu hooku ešte pred jeho rerenderom. Už rozbehnutý Live Refresh naďalej podlieha revision guardu; po úspešnom recreate môže začať nový legitímny request. Providerless odmietnutie zostáva zachované. Zmeny iného klienta/tabu bez lokálnej úspešnej mutation mechanizmus nevidí. Súbežné úspechy sa posudzujú v poradí lokálne oznámených lifecycle udalostí, nie podľa neznámeho backend poradia zápisov.

## Posúdené alternatívy

| Možnosť | Posúdenie |
| --- | --- |
| Presun removedRevision do WeakMap | Stále zamieňa update/delete a nedáva React reaktivitu. |
| Úplné odstránenie blokovania | Observer môže po delete znovu načítať odstránenú query; pôvodný delete test sa nesmie oslabiť. |
| Odhad existencie z provider-list cache alebo inventory dát | Zoznam môže byť stale/neúplný, dáta bežne chýbajú pri chybe. |
| Metadata query v QueryCache | Pridáva novú query identitu a GC pravidlá pre lokálny lifecycle stav. |
| Explicitný delete marker a úzka subscription | Vybrané: jeden vlastník pravdy, pôvodné mutation vetvy a žiadna závislosť od inventory cache. |

## Spresnenie desiatich credential testov bez oslabenia assertions

Dve existujúce parametrické skupiny v hook test súbore majú desať prípadov: osem fallback a dve complete-mapping vetvy. Ručne odstránia query stále pripojeného platného providera a po stale odpovedi vyžadujú undefined. Posledná assertion bola doteraz splnená aj vďaka chybnému blokovaniu automatického fetchu. Po korektnej oprave sa smú objaviť nové Current VM dáta z legitímneho obyčajného query requestu.

Zachovať tieto scenáre aj existujúcu undefined assertion, ale urobiť poradie deterministické: po úvodnom načítaní držať nové obyčajné inventory HTTP odpovede samostatným kontrolovaným Promise. Dokončiť starý Live Refresh a overiť undefined, kým nový obyčajný fetch ešte nemá odpoveď. Potom overiť, že automatický request skutočne začal bez manuálnej akcie, uvoľniť aktuálnu odpoveď a pridať presnú assertion na Current VM. Cez QueryCache notifikácie navyše zachytiť, že Stale VM nebola zapísaná ani prechodne. Odpovede pri viacerých HTTP volaniach vytvárať samostatne, nie znovu použiť už spotrebované Response telo.

Žiadny unmount, skip, odstránenie testu, sleep ani nahradenie presného očakávania slabším not.toBe(Stale VM). Pôvodný skutočný delete-provider test a všetkých šesť P2 reprodukčných assertions ostanú nezmenené. Tento dodatok testuje súčasne neprítomnosť stale zápisu aj schopnosť nového automatického načítania.

## Úlohy a závislosti

P2-1 (helper kontrakt) → P2-2 (reaktívny update/delete/recreate slice) → checkpoint A → P2-3 (failure, izolácia a interleaving) → P2-4 (focused regresie a report) → checkpoint B. Stav a akceptácia sú iba v samostatnom todo súbore. Práca je sekvenčná kvôli zdieľaným modulom a testom.

Plánované TS/TSX súbory (6): providerInventoryRevision.ts/.test.ts, providerMutationInvalidation.ts/.test.tsx a useVmwareResourceInventory.ts/.test.tsx. Dokumentácia (2): tieto samostatné P2 plan/todo súbory. Každá úloha upravuje najviac päť súborov. createAppQueryClient, generated súbory, query keys, cache policy a Resources/Recovery Groups produkčné komponenty nevyžadujú zmenu.

## Riziká a overenie

- Markovanie delete musí predchádzať prvému await; recreate notifikácia musí nasledovať až po existujúcom cancellation/invalidation kroku. Deterministicky testovať **oba smery**: starší submit dokončený po novšom delete **aj** starší delete pozastavený v `cancelQueries`, po ktorom novší recreate uloží `Current VM` a až následne starý delete pokračuje. Starý delete nesmie odstrániť aktuálnu cache ani znovu invalidovať/rušiť novší request; overiť aj medzistavy a počet requestov.
- WeakMap bez odberu nestačí. Testovať delete aj bez pending refreshu, dva pripojené hooky, automatický recreate fetch bez remountu a cleanup subscription. Manuálny `forceRefresh()` pri platnom delete markeri musí odmietnuť Promise bez HTTP/pending/cache zápisu, **aj pred React rerenderom**; po recreate musí znovu fungovať. Pôvodný providerless guard zachovať.
- Request counts musia dokázať jeden zdieľaný nový fetch rovnakého key. Použiť kontrolované Promise, dokončené query/mutation operácie a flush notifikácií; nevytvárať poradie náhodným timeoutom/sleep.
- Credential update počas recreate nesmie zrušiť deleted marker ani znemožniť jeho správne podmienené clear. Failed mutácie, iný provider, druhý QueryClient a platform rovnaké ID zostanú izolované.
- Stabilný getSnapshot a unsubscribe zabránia render loopu/leaku; nevytvárať generický lifecycle dispatcher, polling alebo ďalší lokálny deleted stav.
- Typecheck môže hlásiť cudzie Snapshot Policy fixtures. Zaznamenať presné diagnostiky a oddeliť ich od vlastných zmien; neslabovať typové kontroly a neopravovať cudzie fixtures.
- Na konci focused Vitest piatich požadovaných súborov, npm.cmd run typecheck, focused ESLint a git diff --check. Kompletnú suite ani production build nespúšťať.

## Otvorené body pred vykonaním

- Plán schválený najnovším pokynom vykonať inline; ďalšie potvrdenie sa nevyžaduje.
- Názvy interného helper API sa vyberú v P2-1; životný cyklus, stabilita snapshotu, timing a zachovanie tokenu sú záväzné. Synchronous helper getter pre `forceRefresh()` a kontrola zastaranosti asynchrónnych delete krokov po `await` sú súčasťou akceptácie.
- Produkčná backend možnosť reuse ID sa nedokazuje mock HTTP testom. Klientsky submit/recreate tok sa otestuje cez existujúce generated options bez zmeny API.

## Výsledná konkretizácia a odovzdanie

P2-1 až P2-4 sú dokončené: 138/138 focused testov v piatich súboroch, typecheck, focused ESLint a diff/whitespace kontroly prešli. Implementácia používa jednu aktuálnu objektovú entry identity pre každý úspešný infra submit/delete; handle isCurrent/complete chráni oba smery post-await súbehu. Boolean deleted je samostatný stabilný React snapshot a credential revisions identitu nemenia. removedRevision je odstránený, manuálny deleted guard číta helper synchronne. Pôvodné cache assertions sa zachovali, credential fixtures pribudli riadené nové odpovede a silnejšie kontroly výsledku.

Bez mnou vykonaného stage/commitu/pushu alebo zásahu do cudzej Snapshot Policy práce. V zdieľanom workspace sa medzitým objavil externý commit b52d9377 obsahujúci hook/test; helper a invalidation zostávajú necommitnuté. Kompletná suite/build neboli spustené. Presné príkazy, výsledky, úplný zoznam súborov a hranice sú v samostatnom P2 todo reporte.
