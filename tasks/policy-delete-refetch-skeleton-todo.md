# TODO – Skeleton riadkov po vymazaní policy

Plán: [policy-delete-refetch-skeleton-plan.md](policy-delete-refetch-skeleton-plan.md).
Stav: T1–T7 dokončené a overené; implementácia schválená pokynom `executing-plans inline`.
Samostatné lokálne súbory; neprepisovať rozpracované `tasks/plan.md`, `tasks/todo.md` ani Policy Catalog dokumenty.

## T1 – Malý spoločný UI priebeh

**Popis:** Zaviesť `usePostDeleteRefresh` nad callbackom existujúceho observera, bez vlastného fetchu a serverových dát.
**Závislosti:** schválenie plánu.
**Súbory (2 nové, S):** `src/features/recovery-plans/hooks/usePostDeleteRefresh.ts`, `usePostDeleteRefresh.test.tsx`.

**Akceptácia:**

- [x] `afterDelete` synchronne prejde do refreshing a skončí idle/error podľa GET výsledku; obyčajný refresh v idle nezapne skeleton.
- [x] Retry po chybe používa rovnaký cielený priebeh; opakované volanie sa pripojí k requestu, nepretrváva do inej inštancie a nezavádza timer/cache/QueryClient wrapper.
- [x] Focused hook testy overia deferred úspech/chybu, retry a normálny refresh; všetky query chyby sa spracujú bez unhandled promise.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/hooks/usePostDeleteRefresh.test.tsx`; focused ESLint oboch súborov; whitespace kontrola aj pred pridaním do indexu.

## T2 – Jasné texty po úspešnom vymazaní

**Popis:** Doplniť iba hlášky, ktoré odlíšia úspešné DELETE od chyby následnej obnovy zoznamu.
**Závislosti:** návrh fáz T1.
**Súbory (4, M):** `src/locales/en.json`, `sk.json`, `cs.json`, nový `src/locales/postDeleteRefreshTranslations.test.ts`.

**Akceptácia:**

- [x] EN/SK/CS vysvetlí, že vymazanie prebehlo, ale zobrazovaný predchádzajúci zoznam môže ešte obsahovať vymazaný záznam; dostupný retry načítania.
- [x] Nové texty sú neprázdne a majú rovnaké placeholders; všeobecné existujúce retry/loading texty sa znovu použijú.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/locales/postDeleteRefreshTranslations.test.ts`; parsovanie troch JSON súborov; focused ESLint locale testu.

### Checkpoint po T1–T2

- [x] Review potvrdí, že helper vlastní iba priebeh používateľskej operácie, nie cache, API kontrakt alebo invalidáciu.
- [x] Hook a locale testy prešli, verejné props pre prvý integračný rez sú jasné.

## T3 – Policy Sets: prvý kompletný rez

**Popis:** Zapojiť hook do Policy Sets page a hook-level success obsluhu do generated delete mutation v tabuľke. Použiť existujúci DataTable body skeleton.
**Závislosti:** T1, T2.
**Súbory (4, M):** `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`, `pages/PolicySetsRefetch.test.tsx`, `components/PolicySetsTable.tsx`, `components/PolicySetsTable.test.tsx`.

**Akceptácia:**

- [x] Po úspešnom DELETE je confirm/detail zatvorený; deferred GET zobrazuje iba skeleton riadkov pri zachovaných hlavičkách, toolbare, search/density/page-size. Úspech vrátane posledného záznamu ukáže aktuálny list/empty.
- [x] Hook-level success sa pripojí k generated refetchu s `cancelRefetch: false`; deferred aj okamžitý GET majú iba jeden následný list request. DELETE chyba skeleton nespustí.
- [x] GET chyba má jasný post-delete warning; retry posiela iba GET a skeleton nie je prekrytý starým error panelom. Bežný refresh s cache skeleton nepoužije.

**Overenie:**

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/shared/components/data-table/DataTable.test.tsx
```

Focused ESLint štyroch dotknutých súborov, `git diff --check` a krátky stubovaný browser smoke. Nepredstierať úspešnú opravu iba podľa počtu GET requestov; skeleton musí byť overený počas deferred intervalu.

### Checkpoint po T3

- [x] Prvý rez potvrdil najrizikovejšie načasovanie a neprítomnosť druhého GET; až potom preniesť vzor do ďalších troch zoznamov.
- [x] Review potvrdí nezmenené generated invalidácie a žiadne vymazávanie cached dát.

## T4 – Snapshot Policies

**Popis:** Použiť overený priebeh v Snapshot page/table a upraviť iba relevantné testy/props.
**Závislosti:** T3 checkpoint.
**Súbory (4, M):** pod `src/features/recovery-plans/recovery-policies/snapshot/`: `pages/SnapshotPoliciesPage.tsx`, `pages/SnapshotPoliciesRefetch.test.tsx`, `components/SnapshotPoliciesTable.tsx`, `components/SnapshotPoliciesTable.test.tsx`.

**Akceptácia:**

- [x] DELETE úspech → existujúci body skeleton → aktualizovaný list, bez zásahu do page shellu, filtrov, pagination a editácie.
- [x] Focused integračný test zachytí správny snapshot endpoint, neprítomnosť starého riadku počas deferred GET a zachované reálne hlavičky; hook maticu neopakuje.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`; focused ESLint štyroch súborov; `git diff --check`.

## T5 – Recovery Application Policies

**Popis:** Rovnaký priebeh pre Application Recovery policy list pri zachovaní jeho filtrov a detailov.
**Závislosti:** T3 checkpoint; realizovať po T4.
**Súbory (4, M):** pod `src/features/recovery-plans/recovery-policies/application-recovery/`: `pages/RecoveryAppPoliciesPage.tsx`, `pages/RecoveryAppPoliciesRefetch.test.tsx`, `components/RecoveryAppPoliciesTable.tsx`, `components/RecoveryAppPoliciesTable.test.tsx`.

**Akceptácia:**

- [x] Skeleton pokrýva iba riadky po úspešnom vymazaní a čaká na správny GET; phase/error/retry správanie používa spoločný helper.
- [x] Integračný test overí napojenie endpointu a zachované hlavičky/toolbar; existujúce delete/edit/filter assertions ostanú platné.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`; focused ESLint štyroch súborov; `git diff --check`.

### Checkpoint po T4–T5

- [x] Dva policy zoznamy používajú vzor overený v Policy Sets; žiadne samostatné varianty invalidácie, full-page skeleton alebo globálny `isFetching` skeleton.
- [x] Focused testy prešli bez oslabenia assertions alebo nových ESLint výnimiek.

## T6 – Clean Room Policies

**Popis:** Dokončiť štvrtý zoznam bez rozšírenia zmeny na Policy Catalog a ďalšie CRUD oblasti.
**Závislosti:** T3 checkpoint; realizovať po T5.
**Súbory (4, M):** pod `src/features/recovery-plans/recovery-policies/clean-room/`: `pages/CleanRoomPoliciesPage.tsx`, `pages/CleanRoomPoliciesRefetch.test.tsx`, `components/CleanRoomPoliciesTable.tsx`, `components/CleanRoomPoliciesTable.test.tsx`.

**Akceptácia:**

- [x] Používa sa rovnaký cielený body skeleton, error rozlíšenie a retry; stĺpce/page shell sa nevymieňajú.
- [x] Integračný test overí správny GET a stav počas deferred intervalu; bežný cached background refresh zostáva bez skeletonu.

**Overenie:** `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesRefetch.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`; focused ESLint štyroch súborov; `git diff --check`; jeden policy browser smoke pri 390 px aj na desktope.

## T7 – Finálne focused overenie a review

**Popis:** Overiť spoločný kontrakt a všetky štyri napojenia; bez nových produkčných súborov.
**Závislosti:** T1–T6.
**Súbory:** iba evidencia v tejto task dvojici, prípadné opravy priradiť predchádzajúcemu kroku.

**Akceptácia:**

- [x] TypeScript, focused ESLint 19 dotknutých TS/TSX, 10 nových/upravených testov a 7 regresných testov prejdú. JSON a whitespace/final newline preverí aj nové untracked súbory.
- [x] Diff obsahuje iba plánovaný rozsah 22 implementačných súborov; generated, keys, cache policy, selectors, Policy Catalog, závislosti a cudzie rozpracované súbory zostanú nedotknuté.
- [x] Zaznamenané skutočné výsledky a limity browser smoke; bez celej test suite, produkčného buildu, živého DELETE a nevyžiadaného pushu.

**Príkazy pre finálny rozsah:** zoznam súborov odvodiť z číslovaného inventára v pláne, čím sa neotestuje celá feature ani workspace:

```powershell
$skeletonPlan = Get-Content -Raw -Encoding utf8 tasks/policy-delete-refetch-skeleton-plan.md
$skeletonPaths = [regex]::Matches($skeletonPlan, '(?m)^\d+\. `(src/[^`]+)`') | ForEach-Object { $_.Groups[1].Value }
$skeletonLint = @($skeletonPaths | Where-Object { $_ -match '\.tsx?$' })
$skeletonTests = @($skeletonPaths | Where-Object { $_ -match '\.test\.tsx?$' })
$skeletonRegressions = @(
  'src/shared/components/data-table/DataTable.test.tsx'
  'src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx'
  'src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.test.tsx'
  'src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.test.tsx'
  'src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.test.tsx'
  'src/features/recovery-plans/recovery-policies/catalog/model/policyCatalog.test.ts'
  'src/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog.test.tsx'
)
npm.cmd run typecheck
node node_modules/eslint/bin/eslint.js @skeletonLint --max-warnings 0
node node_modules/vitest/vitest.mjs run @skeletonTests @skeletonRegressions
git diff --check
git status --short
```

Pri implementácii overiť počet ciest (22/19/10/7); príkazy nepúšťať s prázdnymi zoznamami. Kontrola JSON a whitespace nových súborov sa vykoná read-only cez Node `JSON.parse` a kontrolu `[ \t]+$`, finálneho newline a konfliktových značiek nad inventárom a oboma dokumentmi. `git diff --check` samostatne untracked súbory nevidí.

### Finálny checkpoint

- [x] Počas post-delete GET sú nahradené iba riadky, po chybe je jasné, že DELETE už uspel; retry neduplikuje DELETE ani list GET.
- [x] Zachované bežné background obnovovanie a okolité ovládacie prvky. Zmena pripravená na review používateľa; ďalšia integrácia podľa jeho následného zadania.

## Evidencia implementácie – 2026-10-22

- T1–T6 implementované v presnom inventári 22 súborov. Malý hook uchováva iba fázu operácie a prísľub prebiehajúcej obnovy, žiadne API dáta. Štyri stránky odovzdávajú observer refetch s `cancelRefetch: false, throwOnError: false`; tabuľky sa pripájajú v hook-level mutation success. Generated invalidácia zostala nezmenená.
- TDD: nové hook/locale testy najprv zlyhali na chýbajúcej implementácii/textoch; tri policy integračné testy najprv zlyhali na chýbajúcom skeleton stave. Následné focused behy prešli. Policy Sets pokrýva aj okamžitý GET, pomalý DELETE, chybu DELETE, chybu GET a retry bez druhého DELETE.
- Finálny `node node_modules/vitest/vitest.mjs run @skeletonTests @skeletonRegressions`: **17 súborov, 94 testov prešlo** (10 dotknutých + 7 regresných súborov), čas 08:58:42. Predtým boli opravené lokálne syntaktické/lint chyby async testov; assertions zostali zachované.
- `node node_modules/eslint/bin/eslint.js @skeletonLint --max-warnings 0`: **19 TS/TSX súborov, bez chýb a warnings**. `npm.cmd run typecheck`: **prešlo**. Prvý typecheck zachytil súbežnú chybu v cudzom VMware teste; súbor nebol touto úlohou upravený a neskorší typecheck už prešiel.
- Browser smoke: izolovaný headless Edge, skutočné PolicySetsPage a SnapshotPoliciesPage, data router a QueryClient, iba stubované API. Desktop 1280 px a mobil 390 px: reálne hlavičky a toolbar zostali, iba riadky tabuľky mali skeleton; staré riadky neboli focusovateľné; po GET vymazaný riadok chýbal; **0 runtime chýb**. Network potvrdil po každom DELETE jeden následný GET príslušného listu. Existujúci pagination loading stav zostáva súčasťou tabuľky.
- Snímky sú uložené mimo repozitára v `C:/Users/polnikr/AppData/Local/Temp/abco-delete-skeleton-NbpvKO/`: `sets-1280.png`, `sets-390.png`, `snapshot-1280.png`, `snapshot-390.png`. Na mobilnom Snapshot pohľade je orezaný nadpis sekcie v existujúcom page shelli; nesúvisiaci layout zostal mimo rozsahu. Toto nie je overenie celej aplikácie ani živého backendu.
- Dočasný Vite harness a izolovaný browser boli ukončené a pracovný QA adresár odstránený. Žiadne nové dependencies, zmeny generated kódu, cache pravidiel, query keys, Policy Catalog alebo create/edit payloadov.
- JSON, whitespace, final newline a konfliktové značky sa overujú nad celým inventárom a oboma dokumentmi; `git diff --check -- <scoped paths>` a staged `git diff --cached --check` pred commitom. Celorepozitárové `git diff --check` zachytilo aj cudziu prázdnu koncovú riadku v rozpracovanom `tasks/todo.md`; cudzí obsah zostáva nedotknutý.
- Inline review potvrdilo oddelenie DELETE/GET chyby, zachovanie obyčajného background refreshu a neprítomnosť druhej cache. Celá test suite a produkčný build neboli spustené. Lokálny commit zahŕňa iba túto úlohu; bez pushu, merge alebo zmeny vetvy.
