# TODO: Shared tabuľky pre Used in

Plán: [policy-set-used-in-table-plan.md](policy-set-used-in-table-plan.md).
HTML: [policy-set-used-in.html](../prototypes/policy-set-used-in.html).
Stav: iba prototyp + implementačný plán. Checkboxy nižšie označujú budúcu produkčnú implementáciu.

## Fáza 1: Výška a scroll shared komponentov

### T1: DataTable s voliteľnou finite výškou

**Popis:** Zaviesť `fillHeight?: boolean`, default false; existujúca DataTable bude v tomto režime skutočný obojsmerný scroll viewport so sticky header.

**Akceptácia:**
- [ ] Default scroll/fit správanie a existujúci loading/empty/row semantics sú zachované.
- [ ] Fill režim vyplní pridelenú výšku, má overflow auto, nezablokuje vertikálny touch cez touch-pan-x a ponechá keyboard scroll/focus.
- [ ] Použije sa s existujúcim DataTableSurface s viditeľným toolbar headerom; nevznikne nové table API alebo styling knižnica.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx`
- [ ] Focused ESLint na `DataTable.tsx` a `.test.tsx`.
- [ ] Skutočná geometria a sticky/touch scroll sa overia v T5, nie cez predstierané jsdom rozmery.

**Závislosti:** Žiadne.
**Súbory:** `src/shared/components/data-table/DataTable.tsx`, `DataTable.test.tsx`.
**Rozsah:** S, 2 súbory.

### T2: Fill layout iba pre zvolenú DetailView sekciu

**Popis:** Zaviesť `DetailViewSection.layout` s default flow a opt-in fill. Region aj children wrapper odovzdajú konečnú výšku child tabuľkám.

**Akceptácia:**
- [ ] Flow zostáva default, Overview a ostatné detaily majú pôvodné správanie.
- [ ] Fill region a children sú min-h-0/flex/overflow-hidden, header sekcie ostáva pevný; nezavádza sa window resize efekt ani fixný px odhad obsahu.
- [ ] Focus trap, Escape, reset sekcie a lazy mount aktívneho obsahu zostávajú zachované.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/detail-view/DetailView.test.tsx src/shared/components/detail-view/DetailContent.test.tsx`
- [ ] Focused ESLint na `DetailView.tsx` a `.test.tsx`.

**Závislosti:** Layout kontrakt z plánu; T1 pred spoločným checkpointom.
**Súbory:** `src/shared/components/detail-view/DetailView.tsx`, `DetailView.test.tsx`.
**Rozsah:** S, 2 súbory.

### Checkpoint A

- [ ] Shared testy prešli, pôvodné default správanie sa nezmenilo.
- [ ] Scroll owner a výškový reťazec zodpovedajú plánu; netreba DOM hack ani nový DataTableSurface prop.

## Fáza 2: Používateľský Used in tab

### T3: Lokalizované stĺpce a akcia

**Popis:** Doplniť tri `policyReferences.columns.*` texty v EN/SK/CS; accessible name odkazu naďalej využíva existujúci text s názvom objektu.

**Akceptácia:**
- [ ] Kľúče id/name/openDetail existujú v každom jazyku a neobsahujú prázdne hodnoty.
- [ ] Nové stĺpce a viditeľná akcia sú lokalizované; source/state/aria texty sa neduplikujú novou sadou kľúčov.
- [ ] JSON a placeholder kontrakt sú platné, pôvodné preklady sa nemenia.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/locales/policySetUsageTableTranslations.test.ts`

**Závislosti:** Schválené poradie a názvy stĺpcov.
**Súbory:** `src/locales/en.json`, `sk.json`, `cs.json`, nový `policySetUsageTableTranslations.test.ts`.
**Rozsah:** M, 4 súbory.

### T4: Nahradenie listov existujúcimi shared tabuľkami

**Popis:** UsageSource použije DataTableSurface s source header toolbarom a DataTable s ID/Name/Open detail; rodičovská sekcia zapne fill layout a NetworkIcon.

**Akceptácia:**
- [ ] Oba zdroje majú presné poradie ID/Name/Open detail aj na mobile, obyčajný názov a jediný detail Link v poslednom stĺpci; presné ID a existujúce routy ostávajú zachované.
- [ ] Dva source panely zdieľajú dostupnú výšku a scrollujú nezávisle, title/footer dialogu sa neposúvajú. Počet sa berie iba z už načítaných dát.
- [ ] Všetky loading/refresh/paused/error/cached-error/empty/retry stavy a lazy/cache/invalidation HTTP assertions sú zachované bez nového GET alebo zmeny deletion guard.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
- [ ] Overiť hlavičky oboch tabuliek cez roles a bunky, reálne detail Link ciele a neprítomnosť query hooks pred otvorením Used in.
- [ ] Focused ESLint na skutočne zmenené súbory.

**Závislosti:** T1, T2, T3.
**Súbory:** `src/features/recovery-plans/policy-sets/components/PolicySetUsage.tsx`, `.test.tsx`, `.cache.test.tsx`, `PolicySetsTable.tsx`, `PolicySetsTable.test.tsx`.
**Rozsah:** M, najviac 5 súborov. Cache test upraviť len kvôli zmenenej prezentácii, nikdy neodstrániť jeho HTTP/lifecycle assertions.

### Checkpoint B

- [ ] Nová prezentácia používa skutočné shared komponenty a pôvodné query/reference funkcie.
- [ ] Overview, existujúce mazanie a result dialógy zostali zachované.
- [ ] Cielené testy a lint prešli.

## Fáza 3: Browser geometria a odovzdanie

### T5: Skutočný scroll a regresie

**Popis:** Overiť implementáciu v existujúcej aplikácii s izolovanými fixture API odpoveďami, nie iba standalone HTML. Zaznamenať príkazy, výsledky a atómové commity podľa AGENTS.md.

**Akceptácia:**
- [ ] Pri 40–100 rows sa mení iba scrollTop aktívnej tabuľky; druhá tabuľka, dialog a content region ostanú na mieste. Header/source title/footer bounding boxes a sticky column header sú stabilné aj po wheel scroll na koniec.
- [ ] 320/768/1024/1440 px a 768×600: tri stĺpce v rovnakom poradí, horizontal scroll v tabuľke, vertical touch/keyboard a dostupné detail odkazy/Close/Delete/Edit; dlhé texty aj chybové stavy bez straty funkcií.
- [ ] Žiadne console/page errors, výsledky focused kontrol zapísané a všetky úlohy po overení označené; žiadne BE/generated/OpenAPI alebo nesúvisiace produkčné zmeny.

**Overenie:**
- [ ] `npm.cmd exec vitest run src/shared/components/data-table/DataTable.test.tsx src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/detail-view/DetailView.test.tsx src/shared/components/detail-view/DetailContent.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetUsage.cache.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsRefetch.test.tsx src/locales/policySetUsageTableTranslations.test.ts`
- [ ] `npm.cmd run typecheck`; focused `npm.cmd exec eslint -- <zmenené TS/TSX súbory> --max-warnings 0`; `git diff --check`.
- [ ] Browser merania a screenshots reálnej aplikácie: wheel/keyboard/touch, samostatný horizontal scroll, sticky headers a dlhé rows/errors. Nepovažovať CSS assertions v jsdom za dôkaz scrollu.
- [ ] Kompletnú suite ani production build nespúšťať predvolene; širší rozsah iba pri konkrétnej novej potrebe.

**Závislosti:** T1–T4.
**Súbory:** tieto dva dokumenty s výsledkami; prípadný lokálny browser probe v ignorovanom `node_modules/.cache/`, bez novej produkčnej závislosti.
**Rozsah:** S, 2 dokumenty + QA artefakt.

### Checkpoint C

- [ ] Všetky acceptance kritériá dokázané, shared defaults a Policy Set behavior bez regresie.
- [ ] Zmeny overené a commitnuté, kompletná suite/build stav pravdivo uvedený.

## Stav prípravy

- [x] Aktuálny kód shared DataTable/DataTableSurface/Table a DetailView bol preskúmaný cez CodeGraph.
- [x] HTML preusporiadané na ID/Name/Open detail, mobile zachováva všetky stĺpce a tabuľky majú vlastné scroll viewporty.
- [x] HTML má režim Many records (40 riadkov na zdroj), sticky hlavičky a pevný footer/navigation.
- [x] `node node_modules/.cache/verify-used-in-template.mjs`: PASS, 320/768/1024/1440 px + 768×600, wheel, nezávislé scrolly, keyboard, stavy, žiadne console errors.
- [ ] Plán skontrolovaný a produkčná implementácia schválená používateľom.

Teraz sa mení iba prototyp a tieto dokumenty. T1–T5, produkčné testy a typecheck sú plánované pre následné zapracovanie.
