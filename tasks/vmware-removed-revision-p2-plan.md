# Implementačný plán: VMware refetch/prefetch a stale placeholder follow-up

Dátum: 2026-10-22. Stav: F1–F5 dokončené inline; testy, focused lint a cielený typecheck upravených súborov prešli. Výsledná implementácia a presné výsledky sú v follow-up reporte v TODO. Aktuálne úlohy F1–F5: prvá časť [vmware-removed-revision-p2-todo.md](vmware-removed-revision-p2-todo.md). Pokračujeme v používateľom určených samostatných VMware task súboroch; dokončená P2 evidencia zostáva pod čiarou. Snapshot Policy tasks/plan.md a tasks/todo.md sa nemenia.

## Cieľ a obmedzenia

Pokryť existujúce pravidelné VMware query cesty vrátane explicitného refetch/fetchQuery/prefetchQuery a zabrániť zobrazeniu dát odstráneného providera cez placeholder alebo starý observer result. Deleted stav zostáva výhradne v providerInventoryRevision helperi. Zachovať jeho revision token, subscriptions a lifecycle identity guards, generated keys/fetcher, aktuálne retry správanie bežných HTTP chýb a všetkých pôvodných 138 prípadov. Po recreate musia automatické aj explicitné fetch cesty fungovať bez remountu.

Používateľ schválil spresnený follow-up plán pokynom vykonať inline. Vykonanie prebieha na existujúcej vetve, bez subagentov, stage/commitu/pushu, reset/stash, zmeny vetvy alebo worktree. Žiadne BE/generated/OpenAPI/locale/Snapshot Policy úpravy, nová cache, query keys, generický event bus ani druhý deleted store.

## Východiskový stav a dôkazy pred follow-up opravou

- Vetva spike/ant-design-shell, HEAD pri analýze b52d9377. Hook/test sú v tomto súbežne vytvorenom commite; potrebné helper/invalidation súbory a ich testy zostávajú upravené vo worktree. Neposudzovať len HEAD checkout: baseline platí pre aktuálny workspace vrátane týchto zmien.
- Preexistujú cudzie OpenAPI/generated Zod a EN/SK/CS locale zmeny. V tomto plánovaní sa nemenia ani nestageujú.
- CodeGraph použitý pred lokálnym vyhľadávaním; následné rg doplnilo úplný zoznam volaní factory a priamych volaní generated postVmsSearch. Žiadny ďalší produkčný postVmsSearch caller mimo inventoryQueries nebol nájdený.
- inventoryQueries.ts:60–65 vracia generated key a queryFn, ktorá iba odovzdá signal generated postVmsSearch; deleted ani revision nekontroluje. force_refresh cesta je oddelená a už chránená v hooku.
- useVmwareResourceInventory.ts:108 používa deleted v enabled, ale vracia pôvodný query.refetch. Placeholder na :117–120 kontroluje iba rovnaké provider ID, nie lifecycle platnosť.
- TanStack QueryFunctionContext v nainštalovanom query-core obsahuje client aj signal. fetchQuery/prefetchQuery a observer používajú ten istý queryFn kontext; nie je nutné meniť factory(search) na factory(search, client).
- QueryClient.prefetchQuery štandardne premení fetchQuery success/error na Promise<void> bez propagácie rejection. fetchQuery rejectuje; observer.refetch bez throwOnError štandardne vráti result v error stave. queryFn nesmie vracať undefined ani fiktívne úspešné prázdne inventory.
- Nainštalovaný retryer nerozpoznáva obyčajné vyhodenie CancelledError ako automatické zastavenie retries. Query catch pri CancelledError(revert) môže vrátiť zachované staré dáta; silent cancellation predpokladá ďalší fetch. Nepoužiť tieto príznaky ako neoverený shortcut.

### Čerstvý baseline počas plánovania

```powershell
node node_modules/vitest/vitest.mjs run src/shared/query/providerInventoryRevision.test.ts src/shared/query/providerMutationInvalidation.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
```

**138 passed, 0 failed, 5 súborov**, exit 0. To potvrdzuje pôvodnú sadu, nie bezpečnosť nových refetch/prefetch/placeholder prípadov. Izolované bypass a placeholder pozorovania sú podklady od používateľa; skutočné FE integračné reprodukcie ešte treba vytvoriť vo F1–F4. Počas plánovania sa nemení žiadny produkčný ani testový kód.

## Mapa existujúcich ciest

| Produkčný caller | Vstup do factory a použitie | Kritické overenie |
| --- | --- | --- |
| resources/hooks/useVmwareResourceInventory.ts | vmwareInventoryQuery(search) → useQuery; query.refetch je verejný výstup | Stále pripojený deleted A, aj stará refetch referencia; žiadny nový HTTP, data bez Old VM. |
| resources/components/vmware/VmwareResourcesPage.tsx | Z hooku handleRefetch; idle background prefetchQuery factory pre iný source provider | Marker sa zmení medzi naplánovaním idle callbacku a jeho vykonaním; recreate a pôvodná error-skip podmienka. |
| resources/hooks/useInitialResourcePrefetch.ts | Dashboard idle task → fetchQuery generated provider listu → prefetchQuery VMware | Oneskorený/stale provider list stále obsahuje už deleted A; žiadny inventory HTTP pre A. |
| recovery-groups/components/RecoveryGroupBuilder.tsx | Step 4 → prefetchQuery scoped VMware factory | Provider scope a credential preconditions nestačia ako dôkaz aktuálneho lifecycle. Recreate opäť prefetchuje. |
| infrastructure/hooks/useInfrastructureInventory.ts | useMemo factory → useQuery a jeho refetch | Ďalší reálny caller mimo pôvodného zoznamu; centrálny guard sa musí uplatniť aj tu. |
| recovery-groups/hooks/useRecoveryGroupResourceInventory.ts | VMware vetva používa resource hook | Bez stale resourceNames/VM metadata po delete; placeholder výstup musí zostať korektný. |
| Priame fetchQuery/prefetchQuery/QueryObserver s factory | Verejné query options môžu byť použité explicitne | Kontext client musí patriť vykonávajúcemu QueryClient; žiadne spoliehanie sa na enabled. |
| fetchVmwareInventoryLive | Samostatný generated fetcher s force_refresh=true, spustený mutation hooku | Zachovať synchronný manual deleted guard a post-request revision/latest guard; nemiešať s bežným query výsledkom. |

Factory podporuje aj providerless search v existujúcich priamych testoch. Reálni VMware inventory calleri používajú konkrétne ID; nepřidávať nový providerless UI tok ani meniť nesúvisiaci backend kontrakt. Ochrana konkrétneho ID sa riadi normalizovaným providerId, nie zmenou generated key identity.

## Preferovaný minimálny návrh, podmienený reprodukciou

### 1. Jedna hranica bežného query fetchu

Ponechať vmwareInventoryQuery(search) a generated getPostVmsSearchQueryKey. queryFn použije client a signal z TanStack kontextu (napr. úzky Pick<QueryFunctionContext, 'client' | 'signal'>). Pred zavolaním generated fetchera prečíta existujúci deleted stav a zachytí oba revision údaje. Ak je ID deleted, reject bez HTTP. Po odpovedi znovu overí deleted aj oba revision údaje; neplatná odpoveď sa nevráti ako query data. Signal naďalej odovzdá generated fetcheru.

To pokrýva aj delete→recreate počas starého HTTP: samotné aktuálne deleted=false nestačí, starý token ostáva neplatný. Bežný TanStack cancellation zostáva aktívny; test zahŕňa transport ignorujúci abort a prechodné QueryCache zápisy. Nepridávať vlastný cache write ani duplicate lifecycle/ref counter.

Produkčné factory call sites nemajú dostať nový povinný client parameter: native QueryFunctionContext ho dodáva automaticky. Priame testové queryFn({signal}) volania v inventoryQueries.test.ts a virtualMachinesHelpers.test.ts musia doplniť reálny client; key-only factory volania sa nemenia. Žiadny fallback na globálny/singleton QueryClient alebo nechránený fetch pri chýbajúcom kontexte.

### 1a. P2 – fresh cache hit medzi markerom a `removeQueries`

Izolovaný QueryClient experiment potvrdil, že `fetchQuery` s čerstvým cached `Old VM` a platným `staleTime` vráti dáta pri `deleted=true` aj bez jediného volania `queryFn`; `prefetchQuery` preskočí queryFn rovnako. Default `staleTime` je 15 minút. Preto samotný guard v `vmwareInventoryQuery().queryFn` nestačí.

F1: kontrolovaným Promise pozastaviť úspešný delete po synchronnom nastavení deleted markeru a pred `removeQueries` (napríklad počas `await cancelQueries`), pričom cached `Old VM` je stále fresh. Zavolať `client.fetchQuery` aj `client.prefetchQuery` a overiť skutočne vrátenú hodnotu, QueryCache stav, queryFn a HTTP counts. RED baseline musí preukázať cache-hit bez queryFn. GREEN musí bezpečne znemožniť stale návrat aj z cache, napríklad minimálnou lifecycle-safe zmenou poradia eviction/invalidation, bez globálneho QueryClient wrappera alebo fake empty success. Zachovať obe poradia delete/recreate a bezpečnosť pending starých odpovedí.

### 2. Promise, retry a error sémantika

Preferované je jasne rozlíšiteľné odmietnutie neprípustného/obsolete query výsledku, nie no-op success, undefined, nekonečný pending Promise alebo prázdne inventory. Uložená error query bez VM dát nie je obnovené inventory. fetchQuery reject, observer refetch defaultný error result a prefetch Promise<void> sa overia cez skutočné API vrátane throwOnError a unhandled rejection.

Aktuálna app policy má retry=1; guard sa musí kontrolovať pri každom pokuse, takže ani retry počas deleted nezačne HTTP. Obyčajné backend chyby zachovajú pôvodné retry a error správanie. Pri výbere konkrétneho domain error a prípadnej non-retry klasifikácie vo F1 treba otestovať nulovú/kladnú retry policy, finálne idle/error správanie a settle Promise. Nezapínať retry=true ani nenahrádzať per-client/per-query defaults pevným novým počtom retries. Ak je nutná query-specific retry voľba, musí sa propagovať cez hook/infrastructure callers, ktoré dnes destructurujú iba key/fn; toto rozšírenie sa musí explicitne odôvodniť pred zväčšením rozsahu. Samotný throw CancelledError bez overenia nepovažovať za riešenie.

### 2a. P3 – automatické zotavenie pending normálneho fetchu po UPDATE

Po rozšírení revision guardu na bežný `queryFn` môže úspešný provider alebo credential UPDATE zmeniť revision počas pending `/vms/search`. Starý výsledok musí byť odmietnutý, no invalidácia sa už mohla dokončiť pred jeho settlementom; iba domain error by potom mohol ponechať platný provider v stave bez ďalšieho automatického refetchu.

F1 musí parametricky reprodukovať provider aj credential update, riadené pending HTTP Promise a variant ignorujúci abort. Overiť neprítomnosť prechodného stale cache zápisu, nový automatický request s `Current VM` bez remountu/manuálneho refreshu, a zotavenie cez focus/reconnect aj po zlyhaní nového aktuálneho fetchu. Kontrolovať counts, retry 0/1, žiadny fetch loop; credential update nesmie nastaviť deleted marker. Zachovať štandardné správanie skutočných backend HTTP chýb.

### 3. Deleted observer a placeholder výstup

Reprodukcia musí oddeliť: dáta ešte uložené v query pred dokončením cancel/remove, retained placeholder v starom observeri po remove a novú prázdnu query. Callback placeholderData sa nesmie pri deleted uspokojiť len s rovnakým ID. Pri aktívnom deleted markeri verejné data hooku nesmú obsahovať Old VM ani v krátkom okne pred fyzickým removeQueries; query factory samotná nezabráni pamäťovému placeholderu.

Zachovať same-provider placeholder pre platný filter/name debounce. Podľa potvrdených medzistavov vo F1 vybrať najmenšie doplnenie callbacku a prípadne konzistentný inactive/deleted výstup facade. Ak treba projekciu, data=undefined, isSuccess=false, isPlaceholderData=false, isEmpty=false a isInitialLoading=false musia súhlasiť s ostatnými verejnými status/fetch príznakmi; nevytvárať falošný success empty ani meniť iba jeden flag pri zostávajúcom status=success. Deleted stav je stále výlučne z existujúceho helpera, nie ďalší useState/useRef.

Otestovať tabulku, metriky aj Recovery Groups resourceNames s reálnym hookom. Bežná stránka môže prepnúť provider po refetchi listu; tento pohodlný tok nesmie nahradiť test s pripojeným A a nezmeneným ID. Recreate v tom istom observeri musí odomknúť nové dáta, nie starý placeholder predošlej generácie.

### 4. Prefetch scheduling a error-skip po recreate

VmwareResourcesPage:132 dnes bezpodmienečne preskočí background prefetch query v stave error. Ak nový domain guard ponechá taký stav po deleted prefetch pokuse, samotné cleared marker nemusí obnoviť túto cestu. Vo F3 otestovať rovnaký provider ID bez remountu a vykonanie skutočného idle callbacku po recreate. Len ak je reprodukované, minimálne odlíšiť lifecycle-blocked query od skutočnej backend chyby v pôvodnej skip podmienke a preveriť jej lifecycle závislosti. Bez všeobecného opakovania zlyhaných background requestov, refetch loopu alebo druhého deleted mechanizmu.

Bezpečnosť HTTP musí zostať v centrálnej factory aj keď UI scheduling pridá availability precondition. Nepovažovať callback guard len v dvoch komponentoch za ochranu QueryObserver.refetch alebo priameho client.prefetchQuery.

## Úlohy a závislosti

F1: základná end-to-end refetch/query/placeholder ochrana → F2: Dashboard initial prefetch → checkpoint A → F3: background a Recovery Group prefetch/recreate → F4: reálne UI a Infrastructure výstupy → checkpoint B → F5: focused regresie a report. Presné kritériá, súbory a príkazy sú v prvej časti samostatného todo.

Každá úloha má najviac päť súborov. Produkčné zmeny predbežne inventoryQueries.ts a useVmwareResourceInventory.ts; VmwareResourcesPage.tsx len pri potvrdenej recreate/error-skip medzere. Žiadne plánované zmeny helper vlastnenia deleted stavu, mutation invalidácie alebo generated kódu. Nové cohesive test suite sú vhodnejšie než ďalšie zväčšovanie už rozsiahleho hook test súboru; pôvodný 138-case baseline zostáva nezmenený.

## Riziká a otvorené rozhodnutia pri plánovaní (uzavretie v reporte)

- Oba nové nálezy sú zatiaľ integračné hypotézy pre konkrétne UI cesty; používateľovo izolované potvrdenie ich nenahrádza. F1–F4 najprv RED a určenie presného okna, až potom nevyhnutné produkčné zmeny.
- QueryFn pre-check sám nestačí na in-flight ABA delete/recreate; post-check používa pôvodný token aj aktuálny deleted stav. Starý cleanup nesmie zrušiť nový query rovnakého key.
- **P2 – potvrdený fresh-cache-hit bypass:** `fetchQuery`/`prefetchQuery` pri fresh cache a platnom deleted markeri môže vrátiť `Old VM` bez jediného volania `queryFn`. F1 musí reprodukovať úspešný delete A pozastavený po nastavení markeru v `await cancelQueries`, kým `removeQueries` ešte neprebehlo; zavolať oba API s `staleTime=15 min` a kontrolovať vrátenú hodnotu, QueryCache, HTTP/queryFn počty aj prechodné stavy. Samotná ochrana v `queryFn` nestačí. Riešenie má minimálne, lifecycle-safe odstrániť či zneplatniť toto cache-hit okno bez oslabenia starého delete/recreate interleavingu; nesmie zaviesť fiktívny empty success. Svojvoľný externý setQueryData nie je existujúca produkčná fetch cesta.
- Explicitné refetch ignoruje enabled; UI callbacky alebo stale provider zoznamy preto nie sú dostatočnou hranicou.
- Infrastructure hook získava spoločný queryFn, ale nepoužíva resource hook deleted subscription. F4 musí preveriť aj jeho pozorované dáta, status a obnovu; prípadné malé produkčné doplnenie iba po potvrdenej medzere, bez veľkého infra refaktoringu.
- Retry=1 je aktuálna policy, nie oprávnenie zaviesť nekonečné guard retries pri akejkoľvek future override. Neprezentovať domain rejection ako cancellation ani skryť pôvodnú HTTP chybu za empty success.
- P3 definícia je z doplneného zadania kompletná. Zostáva vybrať presnú inactive result projekciu len ak ju reálne callback/cancel poradie vyžaduje; overiť data, status, isSuccess/isEmpty/isInitialLoading, fetchStatus a UI bez zavádzajúcej success metriky.
- F1 musí výslovne testovať P2 fresh-cache hit (bez spustenia queryFn) medzi delete markerom a `removeQueries`; bezpečnosť len vo factory queryFn nedokazuje ochranu tejto hranice.
- F1/F5 musí overiť P3 pending normálny fetch po provider/credential UPDATE, late old result a automatické zotavenie bez remountu (vrátane focus/reconnect).
- Používateľ schválil vykonanie tohto follow-up plánu; F1–F5 sú uzavreté v reporte. Historické dokončené P2 úlohy nižšie neoznačujú follow-up za dokončený. Bez commitu a pushu.

---

## Historická evidencia dokončenej P2 opravy

Nasledujúce pôvodné úlohy a 138-case report sú východiskom. Nepredstavujú výsledok nových refetch/prefetch/placeholder scenárov F1–F5.

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
