# TODO: Shared tabuľky pre Used in

Plán: [policy-set-used-in-table-plan.md](policy-set-used-in-table-plan.md).
HTML: [policy-set-used-in.html](../prototypes/policy-set-used-in.html).
Stav: T1–T5 implementované, overené a commitnuté inline 2026-11-03.

## Fáza 1: Výška a scroll shared komponentov

### T1: DataTable s voliteľnou finite výškou

**Popis:** Zaviesť `fillHeight?: boolean`, default false; existujúca DataTable bude v tomto režime skutočný obojsmerný scroll viewport so sticky header.

**Akceptácia:**
- [x] Default scroll/fit správanie a existujúci loading/empty/row semantics sú zachované.
- [x] Fill režim vyplní pridelenú výšku, má overflow auto, nezablokuje vertikálny touch cez touch-pan-x a ponechá keyboard scroll/focus.
- [x] Použije sa s existujúcim DataTableSurface s viditeľným toolbar headerom; nevznikne nové table API alebo styling knižnica.

**Overenie:**
- [x] `npm.cmd exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx`
- [x] Focused ESLint na `DataTable.tsx` a `.test.tsx`.
- [x] Skutočná geometria a sticky/touch scroll sa overia v T5, nie cez predstierané jsdom rozmery.

**Závislosti:** Žiadne.
**Súbory:** `src/shared/components/data-table/DataTable.tsx`, `DataTable.test.tsx`.
**Rozsah:** S, 2 súbory.

### T2: Fill layout iba pre zvolenú DetailView sekciu

**Popis:** Zaviesť `DetailViewSection.layout` s default flow a opt-in fill. Region aj children wrapper odovzdajú konečnú výšku child tabuľkám.

**Akceptácia:**
- [x] Flow zostáva default, Overview a ostatné detaily majú pôvodné správanie.
- [x] Fill region a children sú min-h-0/flex/overflow-hidden, header sekcie ostáva pevný; nezavádza sa window resize efekt ani fixný px odhad obsahu.
- [x] Focus trap, Escape, reset sekcie a lazy mount aktívneho obsahu zostávajú zachované.

**Overenie:**
- [x] `npm.cmd exec vitest run src/shared/components/detail-view/DetailView.test.tsx src/shared/components/detail-view/DetailContent.test.tsx`
- [x] Focused ESLint na `DetailView.tsx` a `.test.tsx`.

**Závislosti:** Layout kontrakt z plánu; T1 pred spoločným checkpointom.
**Súbory:** `src/shared/components/detail-view/DetailView.tsx`, `DetailView.test.tsx`.
**Rozsah:** S, 2 súbory.

### Checkpoint A

- [x] Shared testy prešli, pôvodné default správanie sa nezmenilo.
- [x] Scroll owner a výškový reťazec zodpovedajú plánu; netreba DOM hack ani nový DataTableSurface prop.

## Fáza 2: Používateľský Used in tab

### T3: Lokalizované stĺpce a akcia

**Popis:** Doplniť tri `policyReferences.columns.*` texty v EN/SK/CS; accessible name odkazu naďalej využíva existujúci text s názvom objektu.

**Akceptácia:**
- [x] Kľúče id/name/openDetail existujú v každom jazyku a neobsahujú prázdne hodnoty.
- [x] Nové stĺpce a viditeľná akcia sú lokalizované; source/state/aria texty sa neduplikujú novou sadou kľúčov.
- [x] JSON a placeholder kontrakt sú platné, pôvodné preklady sa nemenia.

**Overenie:**
- [x] `npm.cmd exec vitest run src/locales/policySetUsageTableTranslations.test.ts`

**Závislosti:** Schválené poradie a názvy stĺpcov.
**Súbory:** `src/locales/en.json`, `sk.json`, `cs.json`, nový `policySetUsageTableTranslations.test.ts`.
**Rozsah:** M, 4 súbory.

### T4: Nahradenie listov existujúcimi shared tabuľkami

**Popis:** UsageSource použije DataTableSurface s source header toolbarom a DataTable s ID/Name/Open detail; rodičovská sekcia zapne fill layout a NetworkIcon.

**Akceptácia:**
- [x] Oba zdroje majú presné poradie ID/Name/Open detail aj na mobile, obyčajný názov a jediný detail Link v poslednom stĺpci; presné ID a existujúce routy ostávajú zachované.
- [x] Dva source panely zdieľajú dostupnú výšku a scrollujú nezávisle, title/footer dialogu sa neposúvajú. Počet sa berie iba z už načítaných dát.
- [x] Všetky loading/refresh/paused/error/cached-error/empty/retry stavy a lazy/cache/invalidation HTTP assertions sú zachované bez nového GET alebo zmeny deletion guard.

**Overenie:**
- [x] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
- [x] Overiť hlavičky oboch tabuliek cez roles a bunky, reálne detail Link ciele a neprítomnosť query hooks pred otvorením Used in.
- [x] Focused ESLint na skutočne zmenené súbory.

**Závislosti:** T1, T2, T3.
**Súbory:** `src/features/recovery-plans/policy-sets/components/PolicySetUsage.tsx`, `.test.tsx`, `.cache.test.tsx`, `PolicySetsTable.tsx`, `PolicySetsTable.test.tsx`.
**Rozsah:** M, najviac 5 súborov. Cache test upraviť len kvôli zmenenej prezentácii, nikdy neodstrániť jeho HTTP/lifecycle assertions.

### Checkpoint B

- [x] Nová prezentácia používa skutočné shared komponenty a pôvodné query/reference funkcie.
- [x] Overview, existujúce mazanie a result dialógy zostali zachované.
- [x] Cielené testy a lint prešli.

## Fáza 3: Browser geometria a odovzdanie

### T5: Skutočný scroll a regresie

**Popis:** Overiť implementáciu v existujúcej aplikácii s izolovanými fixture API odpoveďami, nie iba standalone HTML. Zaznamenať príkazy, výsledky a atómové commity podľa AGENTS.md.

**Akceptácia:**
- [x] Pri 40–100 rows sa mení iba scrollTop aktívnej tabuľky; druhá tabuľka, dialog a content region ostanú na mieste. Header/source title/footer bounding boxes a sticky column header sú stabilné aj po wheel scroll na koniec.
- [x] 320/768/1024/1440 px a 768×600: tri stĺpce v rovnakom poradí, horizontal scroll v tabuľke, vertical touch/keyboard a dostupné detail odkazy/Close/Delete/Edit; dlhé texty aj chybové stavy bez straty funkcií.
- [x] Žiadne console/page errors, výsledky focused kontrol zapísané a všetky úlohy po overení označené; žiadne BE/generated/OpenAPI alebo nesúvisiace produkčné zmeny.

**Overenie:**
- [x] `npm.cmd exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/detail-view/DetailView.test.tsx src/shared/components/detail-view/DetailContent.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/locales/policySetUsageTableTranslations.test.ts`
- [x] `npm.cmd run typecheck`; focused `npm.cmd exec eslint -- <zmenené TS/TSX súbory> --max-warnings 0`; `git diff --check`.
- [x] Browser merania a screenshots reálnej aplikácie: wheel/keyboard/touch, samostatný horizontal scroll, sticky headers a dlhé rows/errors. Nepovažovať CSS assertions v jsdom za dôkaz scrollu.
- [x] Kompletnú suite ani production build nespúšťať predvolene; širší rozsah iba pri konkrétnej novej potrebe.

**Závislosti:** T1–T4.
**Súbory:** tieto dva dokumenty s výsledkami; prípadný lokálny browser probe v ignorovanom `node_modules/.cache/`, bez novej produkčnej závislosti.
**Rozsah:** S, 2 dokumenty + QA artefakt.

### Checkpoint C

- [x] Všetky acceptance kritériá dokázané, shared defaults a Policy Set behavior bez regresie.
- [x] Zmeny overené a commitnuté, kompletná suite/build stav pravdivo uvedený.

## Stav prípravy

- [x] Aktuálny kód shared DataTable/DataTableSurface/Table a DetailView bol preskúmaný cez CodeGraph.
- [x] HTML preusporiadané na ID/Name/Open detail, mobile zachováva všetky stĺpce a tabuľky majú vlastné scroll viewporty.
- [x] HTML má režim Many records (40 riadkov na zdroj), sticky hlavičky a pevný footer/navigation.
- [x] `node node_modules/.cache/verify-used-in-template.mjs`: PASS, 320/768/1024/1440 px + 768×600, wheel, nezávislé scrolly, keyboard, stavy, žiadne console errors.
- [x] Plán skontrolovaný a produkčná implementácia schválená používateľom.

## Priebeh implementácie

- Vstupný worktree bol čistý, vetva `spike/ant-design-shell`, základ `91055428`. Používateľ požiadal vykonanie inline, preto nevzniká nový worktree ani vetva.
- T1/T2: dokončené opt-in fill režimy; pôvodné flow/fit defaults zachované. Commit: 0a91faba.
- T3/T4: dokončené shared tabuľky, ikona, preklady EN/SK/CS. Cache test zostal nezmenený. Commit: 5352d5f5.
- Organizácia: pomocní agenti upravujú výlučne pridelené súbory; spoločný DataTableSurface a API/query moduly zostávajú bez zmien. Súbežnosť oddelených súborov nemení závislosti verifikácie; výsledná integrácia dostane review a spoločné focused overenie.
- T5: 106/106 testov z deviatich vyššie pomenovaných súborov; typecheck a focused ESLint všetkých zmenených TS/TSX prešli. `git diff --check` prešiel. Nezávislé review bez potvrdených nálezov.
- `node node_modules/.cache/verify-policy-usage-tables.mjs`: PASS, reálna aplikácia s izolovanými API fixtures a 100 riadkami na zdroj, EN/SK/CS, 320/768/1024/1440 px, 768×600 a cached-error 320×600. Wheel/keyboard/touch, horizontálny scroll, sticky hlavičky, pevný dialog/footer, presné detail ID, lazy/cache, dlhé chyby, Retry a empty stav overené.
- Cached-error 320×600: warning viewport 34px, table viewport 84px, sticky header 37px; odkaz aj Retry sú dostupné bez posúvania dialogu. Kompaktné odsadenie platí iba pre fill layout; podrobnosti geometrických opráv sú v pláne.
- Kompletná test suite ani production build sa nespúšťali. Browser bez page errors; console iba očakávané fixture HTTP 503. QA script a screenshots zostávajú v ignorovanom `node_modules/.cache/`.
