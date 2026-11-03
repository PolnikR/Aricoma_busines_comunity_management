# Plán: FE ochrana mazania Policies a Policy Sets

Dátum: 2026-11-03. Východiskový FE commit: `47d54c06`.
Stav: dokončené inline 2026-11-03; T1–T13 overené, implementačné commity vytvorené. Výsledky a príkazy sú v TODO.
Úlohy: [policy-reference-protection-todo.md](policy-reference-protection-todo.md).

## 1. Cieľ a hranice

Vo FE pred každým potvrdeným mazaním Snapshot, Recovery App alebo Clean Room Policy skontrolovať aktuálne Policy Sets. Pred mazaním Policy Setu skontrolovať aktuálne Recovery Groups a Recovery Applications. Používaný objekt alebo objekt s neoverenými závislosťami sa cez tieto FE akcie nesmie vymazať. Detail Policy Setu dostane sekciu Used in so zoznamom priamych používateľov a odkazmi na ich existujúce detaily.

Pôvodné plánovanie vytvorilo iba plán a TODO, bez implementácie, testov alebo commitu. Používateľ následne schválil vykonanie inline cez executing-plans. Implementácia mení iba FE a relevantné testy/preklady; backend, OpenAPI a generated Orval súbory zostali nezmenené. Pri vykonaní sa uplatnili focused overenie a atómové commity podľa AGENTS.md. Existujúce `tasks/plan.md` a `tasks/todo.md` patria inej práci a zostali zachované; tieto dva cieľové dokumenty pri pôvodnom plánovaní neexistovali.

## 2. Overený aktuálny stav

### Mazanie a chybové stavy FE

Audit volaní mimo generated vrstvy našiel práve štyri produkčné vstupy:

| Komponent pod `src/features/recovery-plans/` | Existujúci generated hook | DELETE parameter |
| --- | --- | --- |
| `recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx` | `useDeletePolicy` | `policy_id` |
| `recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx` | `useDeleteRecoveryAppPolicy` | `policy_id` |
| `recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx` | `useDeleteCleanRoomPolicy` | `policy_id` |
| `policy-sets/components/PolicySetsTable.tsx` | `useDeletePolicySet` | `policy_set_id` |

Každý komponent dnes otvára `ConfirmDialog` z footeru detailu a v `onConfirm` priamo volá mutation. Hook-level `onSuccess` zatvorí confirmation aj detail a zavolá `onDeleted`. Chyba DELETE zatvára confirmation a zobrazuje sa cez existujúci Alert s `extractBackendErrorDetail` v kontexte zoznamu. `usePostDeleteRefresh` rozlišuje `idle`, `refreshing`, `error` a zachováva rozdiel medzi úspešným DELETE a neúspešným následným GET. Túto cestu zachovať.

`ConfirmDialog` prijíma ReactNode v `message`, `isLoading` a `loadingLabel`. Pri `isLoading` zakáže confirm aj cancel tlačidlo. `onClose` shared Modal však stále smeruje na `onCancel`, preto caller musí ignorovať zatvorenie počas kontroly/DELETE aj pri Escape alebo backdrope. Shared modal sa kvôli tejto úlohe nemusí meniť.

### Detail Policy Setu a navigácia

- `PolicySetsTable.tsx` obsahuje `DetailView` s priamym child `DetailViewSection id="overview"`. Obsahuje existujúce Policy Catalog informácie, Edit a Delete. Overview ani jeho vyhodnocovanie referencií sa nemajú meniť.
- `src/shared/components/detail-view/DetailView.tsx` zostavuje navigáciu z priamych `DetailViewSection` children, prípadne fragmentov. Komponent vracajúci sekciu sám nie je rozpoznaný. Mountuje sa iba aktívna sekcia; pri prepnutí sa obsah predchádzajúcej odpojí. Toto už poskytuje požadované lazy načítanie bez zmeny shared DetailView.
- Group aj Application tabuľka dnes používa iba lokálny `selectedId`, ktorý sa nastavuje kliknutím na riadok. Vyhľadávanie v URL ani navigation state pre detail nemajú. List stránky majú iba create/edit navigáciu; `/.../:id/edit` nie je cesta na read-only detail a nesmie nahradiť požadovaný odkaz.
- `src/app/routes.ts` poskytuje `routes.recoveryGroups` a `routes.recoveryApplications`. URL detailu bude nový malý kontrakt nad existujúcimi list routami, nie nový route komponent.

### Orval klienty a response kontrakty

Pod `src/generated/query/` existujú potrebné GET aj DELETE klienty. Netreba nový endpoint ani regeneráciu klienta.

| Modul `.gen.ts` | GET funkcia / response kolekcia | Query key helper |
| --- | --- | --- |
| `policy-sets/policy-sets.gen.ts` | `getPolicySets` / `policy_sets` | `getGetPolicySetsQueryKey()` |
| `recovery-groups/recovery-groups.gen.ts` | `getRecoveryGroups` / `recovery_groups` | `getGetRecoveryGroupsQueryKey()` |
| `recovery-apps/recovery-apps.gen.ts` | `getRecoveryApps` / `applications` | `getGetRecoveryAppsQueryKey()` |

Kľúče sú jednoprvkové polia s cestami `/get_policy_sets`, `/get_recovery_groups`, `/get_recovery_apps`. Generated GET prijímajú `RequestInit` vrátane `signal` a `cache`. `validatingMutator` validuje úspešné odpovede podľa response registry a vracia parsované hodnoty; typové podpisy generated funkcií používajú Zod input typy. Pri spotrebe nepremieňať cache na doménové zoznamy a nepridávať nové API DTO. Použiť existujúce generated typy alebo ich úzke `Pick` projekcie vyžadujúce len potrebné polia.

Konkrétne väzby a názvy:

- Policy Set: `snapshot_policy_id`, `recovery_app_policy_id`, `clean_room_policy_id`; názov `name`.
- Group: koreňové `policy_set_id`, `id`, `name`.
- Application: koreňové `policy_set_id` a `id`; názov je `application.name`. Pole neleží vo vnútri `application` ani v jej tiers.
- `policy_set_id` môže chýbať alebo byť null; prázdna hodnota neznamená referenciu. Porovnávať celé uložené ID bez trimovania, prevodu veľkosti písmen či odstraňovania `.json`.
- Počítajú sa priame referencie. Aplikácia, ktorá používa group so setom X, ale sama má set Y, sa pre X nezobrazí ako priamy používateľ; blokujúca group už ochranu zabezpečí. `enabled`, deployment ani orchestration stav referenciu nerušia.

### Cache a invalidácie

- `src/shared/query/cachePolicy.ts`: `staleTime = 15 min`, `gcTime = 60 min`, `retry = 1`, refetch pri mount/focus/reconnect pre stale queries.
- `src/shared/query/createAppQueryClient.ts` tieto defaults skutočne používa. V testoch s obyčajným `new QueryClient()` nemožno automaticky predpokladať rovnaké defaults.
- Cache obsahuje raw response envelopes; list hooks používajú `select` iba na observeri. `useRecoveryGroups` navyše závisí od providers a mapuje dáta na bohatý model. Pre Used in ho nepoužiť: kontrola potrebuje iba ID, názov a `policy_set_id`, nie providers, inventory alebo platform providers.
- Generated `submitRecoveryGroup`, `deleteRecoveryGroup` a `rollbackGroupFromOrchestrator` mutation options invalidujú pôvodný groups key.
- Generated submit/delete Policy Setu invaliduje pôvodný policy sets key. Generated policy mutations už zabezpečujú invalidáciu príslušných policy zoznamov.
- Applications používajú vlastné `useSubmitRecoveryApplication`, `useDeleteRecoveryApplication`, `useRollbackRecoveryApplication`. Submit a rollback využívajú `reconcileRecoveryApplications` v `hooks/recoveryApplicationCache.ts`: zachová raw response, invaliduje a podľa existujúcich observerov obnovuje list. Delete invaliduje apps key v hook-level `onSuccess`.
- Nevytvárať cache `usageByPolicySetId`, nové GET kľúče ani globálne invalidácie. Existujúca obnova applications môže vykonať GET aj mimo Used in; táto úloha ju nerozširuje ani neodstraňuje.

### Relevantný backend, iba read-only zistenia

V `../abco-be`:

- `policy/snapshot_policies.py:60`, `policy/recovery_app_policies.py:105`, `policy/clean_room_policies.py:40` a `policy/policy_sets.py:53` pri delete priamo volajú všeobecné `delete_provider`, bez kontroly týchto referencií. Príslušné API routers dnes nemajú conflict odpoveď pre použitie.
- `recovery/groups.py` má `recovery_group_blocking_apps` a `RecoveryGroupInUseError`. `api/routers/recovery_groups.py` odmieta mazanie používanej group cez HTTP 409; kontroluje väzbu tiež pred rollbackom. Táto existujúca ochrana a jej FE spracovanie sa nemenia.
- GET policy sets vyžaduje `VIEW_SNAPSHOT_POLICIES`, groups `VIEW_RECOVERY_GROUPS`, apps `VIEW_RECOVERY_PLANS`. Nedostatočné práva nesmú byť interpretované ako prázdny zoznam. FE-only ochrana môže preto zablokovať mazanie používateľovi, ktorý má DELETE oprávnenie, ale nie oprávnenie pre závislé GET.
- Overený je lokálny zdrojový kód a FE kontrakt, nie stav nasadeného backendu. Nevolali sa živé DELETE ani GET proti produkcii.

## 3. Navrhovaná architektúra

### Spoločné vyhodnocovanie referencií

Pridať malý modul `src/features/recovery-plans/references/model/policyReferences.ts`:

1. Mapovanie existujúceho `PolicyKind` (`snapshot`, `recoveryApp`, `cleanRoom`) na príslušné pole Policy Setu.
2. Čistú funkciu `findPolicyConsumers(kind, policyId, policySets)` vracajúcu ID a názvy všetkých blokujúcich setov.
3. Čistú funkciu `findPolicySetConsumers(policySetId, groups, applications)` vracajúcu samostatné zoznamy group/app referencií s typom objektu, ID a názvom.

Presné TypeScript podpisy doladiť na úzke generated polia, bez kopírovania celých API modelov. Funkcie pracujú len s úspešne načítanými kolekciami. Error, loading ani chýbajúce dáta nesmú byť cez implicitné `?? []` zmenené na dôkaz neprítomnosti referencií. Spoločná funkcia pre set sa použije v guard aj Used in. Netreba univerzálny graf závislostí, registry endpointov alebo nový state manager.

### Ochrana celého priebehu potvrdenia

Pridať `references/hooks/useReferenceProtectedDelete.ts`, používaný všetkými štyrmi tabuľkami. Jeho vstupom pre jednu operáciu je nemenný cieľ `{ typ, id }` a callback na existujúci `mutateAsync`. Hook riadi iba check a serializáciu operácie; existujúce generated mutations ostávajú vlastníkom DELETE, invalidácií a jeho success/error callbackov.

Vystaviť `execute`, `phase` (`idle`, `checking`, `deleting`), `issue` a reset informácie pri zmene cieľa. `issue` rozlišuje použitie objektu od zlyhania overenia; vracia štruktúrované dáta, nie hotové preložené texty. Očakávané zamietnutie kontroly nespustí mutation. Zamietnutý `mutateAsync` nesmie skončiť ako unhandled rejection ani vyvolať duplicitnú check-error hlášku; zobrazí sa pôvodnou mutation cestou.

Použiť synchrónny `useRef` zámok ešte pred prvým await, nie iba React `isPending`. Držať ho od začiatku check až po ukončenie DELETE callbacku. Pri opakovanom kliknutí, Enter alebo vyvolaní handlera počas pending nerobiť ďalšie GET ani DELETE. UI pending = guard pending OR mutation pending. Pri check použiť text „Overujem použitie…“, až pri DELETE „Odstraňujem…“.

`onCancel` počas pending ignorovať aj pri zavolaní z Modal `onClose`. Ak sa komponent odpojí počas check (napr. zmena routy), abortovať check GET a zneplatniť pokračovanie; po jeho dobehnutí už nesmie byť vyvolaný DELETE callback. Po odoslaní DELETE jeho zrušenie nevydávať za rollback operácie.

### Spoločná informácia o zamietnutí

Pridať `references/components/ReferenceDeleteNotice.tsx` pre štyri call sites. Použiť existujúci Alert a bežné zoznamy textov. Blokovanie zobrazí názvy aj ID setov alebo groups/apps; rovnaké názvy rôznych záznamov musia zostať rozlíšiteľné. Renderovať ako React text, nikdy HTML.

Pri zablokovaní alebo check chybe zatvoriť confirmation, ponechať detail cieľového objektu otvorený a následne zobraziť **samostatný výsledkový dialóg** s `ReferenceDeleteNotice`. Nevkladať notice do `footerStart`: `DetailView` má neobmedzený `shrink-0` footer a dlhý zoznam by mohol vytlačiť obsah detailu. Výsledkový dialóg má vlastný nadpis, dostupné Close, maximálnu výšku a samostatne scrollovateľný obsah s celým zoznamom názvov/ID; nesmie prekrývať confirmation súčasne, uväzniť focus ani blokovať zatvorenie po kontrole. Použiť existujúcu modal infraštruktúru, bez zmeny shared `DetailView`/`ConfirmDialog`; po zavretí výsledku zostáva pôvodný detail s Delete/Edit funkčný. Následný pokus o Delete začne novú kontrolu; starý výsledok nie je povolenie na ďalšie vymazanie. Pred novým pokusom resetovať predošlú check issue aj starú mutation chybu. Nezasahovať do existujúceho spracovania chyby skutočného DELETE v kontexte listu.

## 4. Presné poradie GET a DELETE

### Prečo iný režim pre zobrazenie a pre mazanie

Used in je informatívny pohľad s bežnou TanStack Query cache. Destruktívna kontrola musí urobiť GET začatý až po potvrdení používateľa, aj keď cache obsahuje čerstvú prázdnu kolekciu alebo už beží starší GET. Preflight preto volá generated GET funkcie priamo s `cache: 'no-store'` a vlastným `AbortSignal`; nepoužíva cache hit, `ensureQueryData`, dáta observera ani už rozbehnutý query promise. Nemá automatický retry a nezapisuje vlastné výsledky do zdieľanej cache, aby neprepisoval súbežnú query/mutation novším alebo starším snapshotom. Výsledok preflight sa používa priamo na rozhodnutie a notice.

To je vedomé oddelenie dvoch potrieb, nie duplicitná kontrolná logika. Bežné čítanie stále používa rovnaké raw query keys a spoločné selectory. Preflight je najviac jeden GET pre policy alebo dva pre set na jeden používateľom potvrdený pokus; nezapína sa pri otvorení detailu a nevyvoláva ďalší GET cez invalidate/refetch.

### Policy, všetky tri typy

1. Otvoriť existujúci confirmation; zatiaľ žiadny check GET.
2. Pri Confirm synchrónne uzamknúť operáciu, uložiť cieľové ID a kind, nastaviť checking a vyčistiť starú issue.
3. `getPolicySets({ cache: 'no-store', signal })` cez existujúci validating mutator.
4. HTTP/network/schema chyba alebo abort: neposlať DELETE. Zobraziť zlyhanie kontroly, pri abort/unmount už neaktualizovať UI.
5. Použiť `findPolicyConsumers`. Ak je výsledok neprázdny, neposlať DELETE a zobraziť všetky blokujúce sety vrátane názvov.
6. Len pri úspešnom GET bez referencií a stále platnej operácii prejsť do deleting a zavolať pôvodný `mutateAsync({ params: { policy_id: zachytenéId } })`.
7. Zachovať existujúce success/error callbacky, invalidáciu a `onDeleted` refresh. Zámok uvoľniť vo finally.

### Policy Set

1. Rovnaký confirmation a zámok, bez vopred načítaných groups/apps pre tento účel.
2. Spustiť súčasne `getRecoveryGroups({ cache: 'no-store', signal })` a `getRecoveryApps({ cache: 'no-store', signal })`. Použiť `Promise.allSettled`, aby bolo možné pomenovať oba zlyhané zdroje; neodoslať DELETE pred ukončením oboch.
3. Ak čo len jeden GET zlyhá vrátane 401/403/404/500 alebo neplatnej response schémy, zamietnuť mazanie. Pozitívne referencie z úspešného zdroja možno ukázať, ale zlyhaný zdroj sa nikdy nevyhodnotí ako prázdny.
4. Keď sú oba úspešné, použiť `findPolicySetConsumers`. Pri jednej alebo viacerých referenciách ukázať oddelené groups/apps zoznamy a vynechať DELETE.
5. Iba pri oboch úspešných GET a oboch prázdnych zoznamoch zavolať existujúci `mutateAsync({ params: { policy_set_id: zachytenéId } })` a pokračovať pôvodnou mutation cestou.

Nepridávať automatické opakovanie DELETE. Opakovanie používateľom po chybe vždy znamená celý nový preflight. Skutočná DELETE 409/404/500 zostáva serverová chyba; úspešný preflight ju neskrýva.

## 5. Used in a navigácia na detail

Do `PolicySetsTable.tsx` hneď za nezmenený Overview pridať priamy child `DetailViewSection id="used-in"` s preloženým názvom. Jeho obsahom bude nový `policy-sets/components/PolicySetUsage.tsx` s `policySetId`. GET hooks patria až do tohto child komponentu, nie do `PolicySetsTable` ani do wrappera vracajúceho sekciu.

Obsah:

- Recovery Groups: názov a ID každej group s priamou referenciou, odkaz „Otvoriť detail“.
- Recovery Applications: `application.name`, ID, rovnaká akcia.
- Každý zdroj má vlastný loading/error/empty výsledok. Ak jeden zlyhá, druhý úspešný zoznam ostáva použiteľný. Celkový empty state „Policy Set sa nikde nepoužíva“ sa smie zobraziť len po úspešnom overení oboch zdrojov s nulovým výsledkom.
- Bez dát: loading. Stale dáta pri refetch: zachovaný zoznam s informáciou o obnovovaní. Refetch error s cache: varovanie, že ide o posledné známe údaje, nie potvrdenie aktuálneho nepoužitia. Retry obnovuje iba zlyhaný zdroj. Offline/paused stav viditeľne odlíšiť od prázdneho výsledku.
- Pri nulových výsledkoch jedného úspešného zdroja môže byť lokálny empty text, aj keď druhý ešte čaká. Nesčítať neznámy stav ako nulu do globálneho tvrdenia.

### Kontrakt odkazu

Navrhované URL:

- `${routes.recoveryGroups}?detail=<presné group ID>`
- `${routes.recoveryApplications}?detail=<presné application ID>`

Search string vytvárať cez `URLSearchParams`/router helper, aby medzery, `/`, `+`, `&`, `?` a unicode zostali správne zakódované a dekódované presne raz. Použiť skutočný Link pre prístupnosť a podporu otvorenia v novej karte.

V každej cieľovej tabuľke doplniť `useSearchParams`. Ak je neprázdny parameter `detail`, má prednosť pred lokálnym selectedId a vyhľadá sa v celom načítanom `groups`/`applications` poli, nie vo filtrovaných alebo stránkovaných riadkoch. **Ak pri aktívnom `?detail=A` používateľ vyberie iný riadok B, aktualizovať parameter na `detail=B` (push do histórie), zachovať ostatné parametre a zobraziť B; nesmie ostať otvorené A pre prioritu URL.** Bez parametra fungujú pôvodné lokálne kliknutia ako doteraz. Pri zmene parametra A → B sa keyed detail otvorí na Overview; Back/Forward obnoví zodpovedajúci výber.

Zatvorenie detailu z URL vyčistí lokálny výber aj iba parameter `detail` pomocou replace; ostatné query parametre sa zachovajú. Použiť túto close cestu vo všetkých existujúcich miestach, ktoré detail zatvárajú, aby ho URL hneď znovu neotvorila. Delete/Edit stále používajú pôvodné handler a ID pravidlá; navigácia na detail nesmie spustiť Edit ani DELETE.

Počas načítavania cieľovej kolekcie netvrdiť „nenájdené“. Pri load error ponechať existujúce load error UI; po úspešnom načítaní a chýbajúcom ID zobraziť zrozumiteľnú informáciu s možnosťou zavrieť výber. Žiadne nekonečné refetch ani nový get-by-id endpoint. Testovať Back/Forward, priamu URL, prepnutie A → B klikom na riadok a zatvorenie detailu. **URL integračné testy musia používať skutočný MemoryRouter/Routes bez `vi.mock('react-router', … useNavigate: …)`**, ktorý používajú dnešné unit testy oboch tabuliek; vytvoriť oddelené integračné test súbory alebo izolovanú nemockovanú testovaciu zostavu. Overiť reálny search string aj zobrazený detail, nie iba volanie mock navigate.

## 6. Cache stratégia pre Used in

`PolicySetUsage` použije generated `useGetRecoveryGroups` a `useGetRecoveryApps` s ich existujúcimi kľúčmi a vhodným `select` nad raw response. Bez vlastného `staleTime: 0`, bez mount efektu s ručným refetch a bez eager hooks v rodičovi. Platnosť cache sa riadi štandardnými 15 minútami a `isInvalidated`.

| Situácia pri otvorení Used in | Očakávané správanie |
| --- | --- |
| Oba kľúče fresh, bez error/invalidation | Oba zoznamy z cache; žiadny GET. |
| Jeden fresh, druhý chýba/stale | GET iba pre druhý zdroj. |
| Oba chýbajú/stale | Dva GET, paralelne; štandardná deduplikácia TanStack Query. |
| Obe kolekcie úspešne prázdne a fresh | Prázdny výsledok je platná cache, bez GET. |
| Existuje cached data, ale refetch zlyhal | Cached error s varovaním; žiadny globálny empty záver, dostupný retry. |
| Mutácia group/app invaliduje list | Aktívny Used in dostane aktualizáciu; pri neaktívnom sa stale query obnoví pri ďalšom otvorení. |
| Iba Overview / detail zavretý | Žiadny groups/apps observer ani GET vyvolaný Used in. |

Nedoplňovať ručnú invalidáciu tam, kde už existuje. Integračné testy musia preveriť create/edit/delete aj zmenu `policy_set_id`, vrátane application save reconciliation pri odpojení pôvodnej stránky. Ak sa konkrétna reálna mutation cesta ukáže ako neinvalidujúca, doplniť iba túto cestu mimo generated vrstvy a pomenovať ju v reporte; nepridávať preventívny globálny callback.

Preflight sa rozhoduje z vlastného čerstvého GET výsledku bez ohľadu na fresh/stale/error Used in. Jeho výsledok nepredlžuje TTL informatívneho tabu. Tab po externých zmenách môže byť do uplynutia TTL alebo explicitného refresh stale bez toho, aby to dovolilo DELETE.

## 7. Súbory a komponenty plánovaných zmien

Nové súbory a názvy sú návrh; ich testy sú oddelené od produkčných modulov.

| Umiestnenie | Účel |
| --- | --- |
| `src/features/recovery-plans/references/model/policyReferences.ts` a `.test.ts` | Jedno vyhodnotenie referencií pre delete aj Used in. |
| `.../references/hooks/useReferenceProtectedDelete.ts` a `.test.tsx` | Fresh GET, zámok, stav checking/deleting, fail closed, unmount. |
| `.../references/components/ReferenceDeleteNotice.tsx` a `.test.tsx` | Spoločné zobrazenie blokujúcich názvov/ID a check chýb v samostatnom scrollovateľnom výsledkovom dialógu (bez zásahu do `DetailView` footeru). |
| Štyri existujúce `*PoliciesTable.tsx` / `PolicySetsTable.tsx` z tabuľky vyššie | Pripojenie guard, pending a notice, zachovanie mutation lifecycle. |
| Ich existujúce `components/*.test.tsx` a `pages/*Refetch.test.tsx` | Ochrana všetkých vstupov a zachovanie post-delete refresh. |
| `.../policy-sets/components/PolicySetUsage.tsx`, `.test.tsx`, `.cache.test.tsx` | Lazy Used in, stavy, odkazy, cache a reálne invalidácie. |
| `.../recovery-groups/components/RecoveryGroupsTable.tsx`, `.test.tsx` a nový URL integration test | Otvorenie detailu z URL a synchronizácia kliknutia na iný riadok s `?detail`, overené bez router mocku. |
| `.../recovery-applications/components/RecoveryApplicationsTable.tsx`, `.test.tsx` a nový URL integration test | Rovnaký URL/row-click kontrakt pre applications, overený bez router mocku. |
| `src/locales/en.json`, `sk.json`, `cs.json`, nový `policyReferenceTranslations.test.ts` | Kontrola použitia, závislosti, Used in, loading/error/empty/retry/navigation texty. |

Existujúci `PolicyKind` sa importuje z catalog modelu; catalog hook ani jeho správanie sa nemení. DetailView, ConfirmDialog, app query client, globals, API generátor a BE nemajú plánované produkčné zmeny. Ak sa pri implementácii ukáže potreba zmeniť ich verejný kontrakt, najskôr upraviť návrh a predložiť dôvod.

## 8. Testovacia matica

Testy pridať až pri implementácii. Použiť Vitest/React Testing Library, reálne generated klienty a mock fetch na sieťovej hranici pre request poradie/počty; neoverovať iba mock guard funkcie.

| Oblasť | Povinné scenáre a dôkaz |
| --- | --- |
| Každý PolicyKind | Jeden aj viac blokujúcich setov; názvy a ID v notice; 0 DELETE. Rovnaké ID v inom policy poli neblokuje. |
| Policy bez väzieb | Aj s fresh cache prázdnych setov vznikne nový GET; až po jeho úspechu presne 1 DELETE s pôvodným ID. |
| Policy GET failure | HTTP/network/schema/403/404; žiadny DELETE, ani pri predchádzajúcej prázdnej cache; ďalší pokus robí nový GET. |
| Policy Set consumers | Iba group, iba app, oba typy, viac objektov, žiadna referencia; pri použití 0 DELETE. Pri žiadnej oba GET musia skončiť pred DELETE. |
| Typ a umiestnenie polí | Koreňové app `policy_set_id`, name z `application.name`, null/omitted/empty ID, disabled policy, rozlíšenie rovnakých názvov; žiadne odvodené app väzby z tierov. |
| Policy Set GET failure | Zlyhá groups, apps, oba; delayed úspech druhého zdroja, cached previous empty, invalid JSON/schema. Vždy 0 DELETE. |
| Pending a životný cyklus | Double click, Enter a priame opakované execute počas check aj DELETE; jeden pipeline. Escape/backdrop nemení cieľ; unmount počas check znamená 0 DELETE po dobehnutí response. Blokovanie po potvrdení otvorí samostatný dialóg bez súbežného confirmation, s funkčným focus/Close a scrollom aj pri desiatkach referencií; po zavretí pôvodný detail zostáva použiteľný. |
| Staršie rozbehnuté čítanie | Pred Confirm beží starý GET/je fresh cache; preflight vykoná vlastný nový GET a rozhodne z jeho response. Starý prázdny výsledok nepovolí mazanie. |
| Skutočný DELETE | Serverová chyba sa zobrazí pôvodnou cestou; úspešný DELETE a následný refresh error zostanú rozlíšené; žiadny automatický druhý DELETE. |
| Used in bez otvorenia | Otvorenie Policy Set Overview nespustí groups/apps GET. Existujúce catalog GET nie sú falošne zakázané. |
| Used in cache | Fresh hit, fresh prázdne polia, iba jeden miss, obidva miss, TTL expiry, invalidation pred uplynutím TTL, prepnutie Overview/Used in, zdieľaná cache medzi setmi; presné počty GET. |
| Used in stavy | Loading, paused/offline, obidva ready empty, čiastočná chyba, cachedError, retry iba chybného zdroja, prehľadný zoznam oboch typov bez false empty. |
| Aktualizácia väzieb | Reálne group submit/delete a application submit/delete/reconciliation invalidujú pôvodný key; po priradení/odpojení sa výsledok zmení aj pred uplynutím TTL. |
| Navigácia | Každý link otvorí správny existujúci detail, nie editor; ID s rezervovanými znakmi, neznáme ID až po load success, zachovanie iných parametrov, close, Back/Forward aj klik na riadok B pri aktívnom `?detail=A` (URL sa zmení na B). Overenie reálnym MemoryRouter/Routes bez mocku `useNavigate`. |
| Regresie | Overview poradie a existujúce Policy Catalog stavy/help; všetky štyri post-delete refresh cesty; pôvodné group/app detail a mutation akcie bez URL parametra. |

Fixtures pre nové GET odpovede musia mať správne response envelopes. Existujúce Refetch testy dnes majú fallback `{}` pre neznáme URL; po pridaní preflight bude taký fallback schema error. Každý affected stub explicitne doplniť o úspešné prázdne závislosti a samostatne o zlyhania. Nesmie sa obísť validatingMutator alebo oslabiť pôvodné assertions.

## 9. Fázy, závislosti a dokončenie

Podrobný checklist s cestami, príkazmi a akceptáciou je v TODO dokumente. T1–T13 sú malé úlohy, najviac päť implementačných/test súborov na úlohu; priebežné dopĺňanie statusu dokumentov sa do rozsahu produkčných zmien nepočíta.

1. T1–T2: spoločné selectory a testovateľný bezpečný check pipeline. Checkpoint A.
2. T3–T4: preklady a viditeľné zamietnutie. Checkpoint B.
3. T5–T7: kompletné vertikálne napojenie každého typu Policy vrátane HTTP a refresh testov. Checkpoint C.
4. T8–T9: Policy Set delete a detail navigácia groups. Checkpoint D.
5. T10–T12: detail navigácia apps, lazy Used in, cache/invalidation integračné scenáre. Checkpoint E.
6. T13: cielené regresie, browser kontrola a finálny report. Checkpoint F.

Závislosti: T1 → T2; T3 → T4; T1+T2+T4 → T5/T6/T7/T8; T9+T10+T1+T3 → T11; T8+T11 → T12; všetky → T13. Zdieľané preklady, hook a PolicySetsTable vznikali postupne s explicitným odovzdaním vlastníctva. Pri inline vykonaní sa podľa executing-plans využili pomocní agenti; nezávislé URL súbory mohli vznikať súčasne. Organizačné rozhodnutie a jeho integračné riziko sú zapísané v TODO.

Dokončenie implementácie znamená: všetky štyri FE delete cesty robia fresh preflight, všetky zamietnutia/failures majú 0 DELETE, pending sa nedá obísť, Overview sa zachoval, Used in rešpektuje cache a lazy mount, oba odkazy otvárajú detail a focused overenia sú zdokumentované. Nový globálny test/build gate sa nepridáva. Kompletná suite a `npm.cmd run build` sa nespúšťajú predvolene, pretože build skript zahŕňa všetky testy aj API kontroly. Prípadný typecheck má zmysel až po napojení typed modulov; focused lint a konkrétne test files sú uvedené pri úlohách.

## 10. Riziká a obmedzenia

| Riziko | Dopad | Ošetrenie / limit |
| --- | --- | --- |
| Súbežná zmena medzi GET a DELETE alebo medzi dvoma GET | Vysoký | FE nemá atómový snapshot ani transakciu. Fresh paralelné GET skracujú okno; úplnú integritu bez BE kontroly nemožno garantovať. |
| Priamy API klient alebo iná/staršia verzia FE | Vysoký | Ochrana platí iba pre auditované akcie tohto FE. Backend stále dovolí DELETE; nemení sa podľa zadania. |
| 403 na závislom GET | Stredný | Fail closed s pomenovaním zdroja a vysvetlením, že použitie nebolo overené. Nepridávať oprávnenia ani bypass. |
| Chyba GET zamaskovaná prázdnym poľom | Vysoký | Explicitné success pred vyhodnotením a request-level testy 0 DELETE. |
| Rýchle kliknutia alebo odpojenie komponentu | Vysoký | Synchrónny latch a kontrola životnosti pred DELETE; disabled UI je doplnok. |
| Used in môže ukazovať starý externý stav do 15 min | Stredný | Existujúce TTL, invalidácie, focus/reconnect/retry; tab nie je povolenie na DELETE. |
| Čítanie raw cache ako doménových polí | Stredný | Existujúce response envelopes a úzke selectory; nikdy `setQueryData` doménovým zoznamom. |
| Nové deep-link správanie výberu a zatvárania | Stredný | Pri `?detail=A` musí klik na iný riadok B aktualizovať URL na B. Zachovať lokálny flow bez parametra; reálne router integračné testy pre close, filtre, presné ID a Back/Forward bez mocku useNavigate. |
| Zvýšenie request počtu | Stredný | Preflight až po Confirm: 1 alebo 2 GET. Used in lazy + pôvodné keys + TTL. Žiadne providers GET kvôli vyhodnoteniu referencií. |
| Dlhé zoznamy závislostí | Stredný | Samostatný výsledkový dialóg s ohraničenou výškou a vlastným scrollom, plný zoznam názvov/ID, správny focus/Close. Žiadny notice v `shrink-0` footeri DetailView. |

## 11. Prijaté rozhodnutia a výsledok

Implementácia používa pôvodné API kontrakty: URL parameter `detail` so synchronizáciou row-click A → B, samostatný dialóg zamietnutia pri zachovanom otvorenom detaile, štandardné 15-minútové TTL pre informatívny Used in a nezávislý fresh preflight bez zápisu do cache. Požiadavka garantovať integritu pri súbežných externých zmenách by vyžadovala zmenu BE rozsahu a nie je súčasťou tejto implementácie.

Všetky úlohy T1–T13 sú dokončené. Finálny Vitest beh: **241 passed / 20 files**, typecheck, focused ESLint a diff check exit 0. Browser QA prešla v EN/SK/CS na desktop aj mobilnom rozmere s izolovanými fixture API odpoveďami. Nezávislé finálne review je bez findings. Kompletná test suite, production build a živý BE sa nespúšťali. Podrobný report, presné príkazy, limity a commity sú v TODO.
