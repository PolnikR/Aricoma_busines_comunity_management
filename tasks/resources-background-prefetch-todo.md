# TODO: Background prefetch druhého VMware providera

Plán: [resources-background-prefetch-plan.md](resources-background-prefetch-plan.md).
Stav: schválené, implementácia prebieha inline. T1/T5 živé merania blokované UI runtime (os error 3); T2–T4 pokračujú nezávisle.
Task list target je tento topic-specific súbor, nie `tasks/todo.md` ani existujúce `tasks/data-prefetch-todo.md`.

## Pred začatím

- [x] Používateľ schválil plán, úzky výber iba druhého source VMware tabu a error guard nad cache.
- [x] Overený aktuálny worktree a vlastníctvo zmien; cudzie Dashboard/prototype/QA zmeny sa nepriberajú.
- [ ] Potvrdené rovnaké Dashboard/filter podmienky pre baseline a variant; dostupný Edge a reálny backend.

## T1: Zaznamenať reprodukovateľný baseline

**Popis:** Pred zmenou zdokumentovať skutočné prvé otvorenie VMware 2 a kontrolné časy VMware 1 v aktuálnom UI. Existujúce jednotlivé čísla v zadaní sú orientačné.

**Akceptačné kritériá:**
- [ ] Potvrdené ID prvých dvoch source VMware tabov v poradí UI, ich scope/prefix/tag a počet ostatných source/target providerov.
- [ ] Minimálne 3 platné behy každého scenára z meracieho protokolu plánu, so samostatným API časom, click→usable a počtami requestov.
- [ ] Zaznamenaná frontend revízia/režim, Edge verzia, sieť 300 ms / 62 500 B/s, upload, session filtre, backend cache/dataset a pevný dwell pre každý scenár.

**Overenie:**
- [ ] Edge Network + Performance: nový štart z Dashboardu, prvý VMware cache hit, VMware 2 prvé otvorenie a návrat; `/tags` počítať oddelene od POST inventára.
- [ ] Výsledky majú jednotlivé hodnoty aj mediány; neplatné behy sú označené a zopakované.

**Závislosti:** schválenie plánu.
**Súbory:** tento TODO (sekcia Výsledky meraní).
**Rozsah:** S, 1 dokument; približne 30–60 min podľa backendu.

## T2: Prvý VMware tab spúšťa prípravu druhého po ready

**Popis:** Jeden funkčný slice cez dva komponenty: rodič vyberá druhý source tab zo svojich zoradených tabov, VMware komponent dostane nepovinný opt-in prop a po úspešnom aktívnom inventári/idle začne existujúci `prefetchQuery`. Súčasťou sú komponentové testy výberu a readiness.

**Akceptačné kritériá:**
- [ ] Iba aktívny prvý source VMware tab poskytne konkrétneho druhého kandidáta; chýbajúci/druhý bez credentials/target/iný vendor/direct-link VMware 2 nespustí nový prefetch ani náhradu tretím.
- [ ] Efekt čaká na success, dáta bez placeholderu/debounce/fetch/force refreshu; cleanup ruší iba nespustený callback. Funguje idle aj timer fallback a úspešne prázdny inventár.
- [ ] Použité existujúce role-scoped snapshot/filter helper/factory/QueryClient; cache defaults bez zmeny, error-state guard bez nového registra alebo retry slučky.

**Overenie:**
- [ ] Najprv doplniť testy a potvrdiť, že chýbajúce nové správanie odhalia; potom implementovať slice.
- [ ] `npm exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`
- [ ] `npm exec -- eslint src/features/discovery-inventory/resources/pages/ResourcesPage.tsx src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx --max-warnings 0`
- [ ] Manuálna kontrola diffu: iba dva produkčné komponenty, žiadna zmena shared props, factories, routing alebo Dashboardu.

**Závislosti:** T1.
**Súbory:**
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`

**Rozsah:** M, 4 súbory; približne 1–2 hodiny.

## Checkpoint A: Po T1–T2

- [ ] Baseline je reprodukovateľný a aktívny tab sa vykreslí pred začiatkom novej práce.
- [ ] Focused testy T2 prechádzajú, diff dodržiava scope.
- [ ] Žiadny nový scheduler framework, request register, cache alebo vendor fan-out.

## T3: Dokázať pending aj dokončený prefetch cez reálne taby

**Popis:** Pridať integračný test s dvoma source VMware providermi, reálnym QueryClient a skutočnou navigáciou cez taby. Použiť validné HTTP fixtures, ovládateľný scheduler a deferred response; netestovať iba volanie helpera.

**Akceptačné kritériá:**
- [ ] Dashboard seed → VMware 1 ready → pending VMware 2 → klik → dokončenie dá správne rows a presne jeden VMware 2 POST pre rovnaký key. Klik nemení navigáciu na blokujúcu.
- [ ] Dokončený fresh prefetch → klik aj návraty/rerender/StrictMode nezvýšia počet inventory POST; target a tretí source nemajú špekulatívny request.
- [ ] Fixný prefix/tag druhého, source snapshot/defaults, odlišné URL filtre prvého aj target snapshot sú pokryté; body prefetchu a bežného otvorenia je zhodné. Zmena filtra správne vytvorí iný key.

**Overenie:**
- [ ] `npm exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx`
- [ ] `npm exec -- eslint src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx --max-warnings 0`
- [ ] Test používa `STANDARD_QUERY_OPTIONS` (s explicitným retry override iba pre deterministické cases), počíta POST podľa ID/body a samostatne `/tags`/metadata. Scheduler mock podporuje viac callbackov.

**Závislosti:** T2.
**Súbory:** nový `src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx`.
**Rozsah:** S, 1 súbor; približne 45–90 min.

## T4: Overiť chyby a hranice lifecycle/cache

**Popis:** Rozšíriť novú integráciu o failure recovery, remount, zrušený callback, stale/invalidated entries a izoláciu dát. Ak zlyhá produkčné správanie, opraviť iba už dotknuté komponenty a zopakovať T2–T3.

**Akceptačné kritériá:**
- [ ] HTTP 500/offline VMware 2 neovplyvní VMware 1 ani nevytvorí background toast/rejection/slučku po rerender/remount; samostatný prípad `retry:1` má najviac dva pokusy na jeden fetch cyklus.
- [ ] Otvorenie po definitívnom zlyhaní môže bežným observerom znovu fetchovať a uspieť; prepnutie počas zlyhávajúceho pending requestu nepridá súbežný fetch mimo policy retry.
- [ ] Odchod/zmena providera pred callbackom nepridá request; už bežiaci request sa neruší kvôli prepnutiu. Stale/invalidation, odlišný scope a force refresh zachovajú existujúcu policy a správne UI dáta.

**Overenie:**
- [ ] `npm exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesBackgroundPrefetch.integration.test.tsx src/features/discovery-inventory/resources/hooks/useVmwareResourceInventory.test.tsx`
- [ ] Existujúce regresie: `npm exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesPrefetch.integration.test.tsx src/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch.test.tsx src/features/discovery-inventory/resources/pages/ResourcesRouteTransition.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [ ] Filter kontrakty: `npm exec -- vitest run src/features/discovery-inventory/resources/helpers/resolveVmwareInitialFilters.test.ts src/features/discovery-inventory/resources/hooks/useResourceTabSearchParam.test.tsx src/features/discovery-inventory/resources/hooks/useVirtualMachineSearchParams.test.tsx`
- [ ] Focused ESLint pre zmenené súbory z T2/T3, `git diff --check -- src/features/discovery-inventory/resources`.

**Závislosti:** T3.
**Súbory:** nový integračný test; pri preukázanej chybe iba dva komponenty z T2 (najviac 3 súbory). Existujúce regresné testy sú primárne na spustenie, nie plánovaný refaktor.
**Rozsah:** S–M, 1–3 súbory; približne 45–90 min.

## Checkpoint B: Po T3–T4

- [ ] Pending aj completed scenár má dôkaz jedného requestu a správneho UI, nielen spy na factory.
- [ ] Error/remount/role/filter prípady a všetky uvedené focused regresie prechádzajú.
- [ ] Rozsah ostáva dva produkčné súbory; žiadny nový cache/key/API kontrakt. Full suite/build sa nespúšťa automaticky; ak vznikne konkrétny type-level problém mimo focused overenia, zdôvodniť a až potom rozšíriť validáciu.

## T5: Porovnať výkon v Edge a uzavrieť review

**Popis:** Na reálnom backende zopakovať T1 po zmene, porovnať jednotlivé merania aj mediány a uložiť dôkazy do tohto TODO. Implementácia sa nedá vyhlásiť za výkonovo overenú iba z unit testov.

**Akceptačné kritériá:**
- [ ] Minimálne 3 platné opakovania na variant/scenár podľa plánu; rovnaký Dashboard, filtre, sieť a dwell, samostatný API čas, click→usable, bytes a počty POST/retry/tags.
- [ ] Pending zdieľa request, completed nepridá inventory POST a využitý predstih skracuje čakanie. VMware 1 click→usable aj interakcie nemajú regresiu nad max(50 ms, 10 % baseline mediánu); pri šume pridať behy.
- [ ] Záverečný diff review potvrdí minimálny rozsah, všetky kritériá a obmedzenia; bez dostupného Edge/backendu sa meranie označí nesplnené a uvedie sa konkrétny blocker.

**Overenie:**
- [ ] Edge DevTools Network/Performance podľa meracieho protokolu plánu, vrátane interakcie s VMware 1 počas prefetchu a návratu z cache.
- [ ] `git diff --check -- tasks/resources-background-prefetch-plan.md tasks/resources-background-prefetch-todo.md src/features/discovery-inventory/resources`
- [ ] V reporte uviesť presné spustené focused príkazy, výsledky, revízie a výslovne, či sa plná suite/build nevykonali.

**Závislosti:** T1 a checkpoint B.
**Súbory:** tento TODO (merania a záverečné overenie).
**Rozsah:** S, 1 dokument; približne 30–60 min plus opakované behy.

## Checkpoint C: Odovzdanie implementácie

- [ ] Všetky akceptačné kritériá T1–T5 majú dôkaz; výsledky nie sú odhady.
- [ ] Výkon aj HTTP počty vyhovujú, nevyriešené riziká sú explicitne zapísané.
- [ ] Používateľ dostal výsledok na review; ďalší merge/push sa riadi jeho pokynmi.

## Výsledky meraní

Zatiaľ nevykonané. Stĺpce budúceho záznamu: variant/revízia, scenár, beh, provider/filter, sieť/backend cache, dwell, VMware 1 click→usable, latencia interakcie VMware 1, VMware 2 request start/end, API ms, click→usable ms, predstih ms, POST počet/status/retry, metadata/tags počet, bytes, platnosť behu/dôvod vyradenia. Uchovať surové hodnoty aj mediány; neprikladať credentials ani tokeny.

## Overenie tohto plánovacieho výstupu

V tejto úlohe sa overuje iba obsah a rozsah dvoch nových Markdown súborov. Produkčné testy, plná suite, build a živý Edge benchmark sa nevykonávajú. Existujúce `tasks/data-prefetch-plan.md` a `tasks/data-prefetch-todo.md` sa zachovávajú. Commit je výslovne zakázaný zadaním. Stav checkboxov vyššie sa nemení na splnený bez budúceho vykonania príslušnej úlohy.

## Priebežný záznam realizácie

- 2026-10-16: schválené vykonanie inline a atomické commity. Historický zákaz commitovania vyššie už neplatí. Cudzie Dashboard/QA zmeny sa nepreberajú.
- Baseline automatizovaných komponentov: `npm.cmd exec -- vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx` — 2 súbory, 16 testov prešlo. Použiť npm.cmd, pretože PowerShell blokuje npm.ps1.
- T1/T5: CUA aj Node REPL zlyhali pred inicializáciou prehliadača (os error 3), Chrome DevTools MCP chýba. Žiadne nové živé meranie ani výkonové tvrdenie.

- Funkčný slice T2 + základ T3: dva produkčné komponenty, QueryClient wrappers pôvodných testov a nová integrácia. Red: tri nové testy odhalili chýbajúci trigger. Green: tri súbory / 19 testov prešlo; po poslednej úprave async flush samostatne integrácia 3/3. Focused ESLint piatich zmenených TS/TSX súborov prešiel po oprave jednej optional chain a async callbackov; `git diff --check -- src/features/discovery-inventory/resources` bez chýb. Readiness/error/filter hraničné scenáre budú nasledovať v samostatnom testovacom commite.
