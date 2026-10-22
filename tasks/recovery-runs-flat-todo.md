# Recovery runs — Flat workspace: úlohy

Plán: [recovery-runs-flat-plan.md](recovery-runs-flat-plan.md).
Stav: implementované inline a overené; výsledky nižšie.

## T1: Jedna dátová plocha

Nahradiť vnorenú kompozíciu na Recovery runs plochým rozložením. Pred úpravou preveriť aktuálne zdroje cez CodeGraph a existujúce pracovné zmeny.

- [x] Názov stránky, záložky, vyhľadávanie a tabuľka sú v jednej ploche bez vnorenej karty Orchestrated entities.
- [x] Užitočný vysvetľujúci text zostáva dostupný; existujúce ovládanie a dátová logika sú zachované.
- [x] Prípadná úprava shared surface je opt-in a predvolený vzhľad ostatných stránok zostáva rovnaký.

**Súbory:** RecoveryRunsPage.tsx, RecoveryRunsTable.tsx v `src/features/recovery-plans/recovery-runs/`; podľa potreby `src/shared/components/data-table/DataTableSurface.tsx` a jeho test. Rozsah M, najviac 4 súbory.

**Závislosti:** žiadne.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`; pri úprave shared surface aj `npm exec vitest run src/shared/components/data-table/DataTableSurface.test.tsx`.

## T2: Kompaktné rozloženie a posúvanie

Dopracovať dostupný priestor pre tabuľku v rámci existujúceho aplikačného rámu.

- [x] Zarovnané okraje, jemné deliace linky a približne 40 px riadky bez orezania textu.
- [x] Desktop posúva tabuľku a zachováva dostupné hlavičky a stránkovanie; úzka stránka nepretečie vodorovne.
- [x] Tab, focus indikátor a ovládanie detailu fungujú; farby, typografia a lokalizácia nadväzujú na aplikáciu.

**Súbory:** rovnaké lokálne page/table komponenty ako T1; shared surface iba ak je potrebná jeho izolovaná opt-in úprava. Rozsah S–M.

**Závislosti:** T1.

**Overenie:** prehliadač pri 320, 768, 1024 a 1440 px a nízkom desktop okne; screenshot, kontrola scrollovania a klávesnice. Cielený ESLint na skutočne zmenených TS/TSX súboroch.

## Checkpoint A

- [x] Diff obsahuje iba Recovery runs a nevyhnutnú opt-in podporu.
- [x] Zobrazenie s dvoma záznamami aj dlhou tabuľkou zodpovedá plánu.

## T3: Regresné overenie a odovzdanie

Overiť používateľské správanie; existujúce assertions zachovať, doplniť iba chýbajúce kontroly zmenenej kompozície.

- [x] Záložky, vyhľadávanie, počet riadkov, stránkovanie, Refresh, výber entity a existujúci detail fungujú.
- [x] Loading, empty, no matches, error a retry sú viditeľné a použiteľné.
- [x] Browser nemá nové chyby; zmeny sú overené a uložené v atomickom commite bez cudzej práce.

**Súbory:** `pages/RecoveryRunsPage.test.tsx`, `components/RecoveryRunsTable.test.tsx`; prípadné opravy iba súborov z T1–T2. Rozsah M.

**Závislosti:** T2, checkpoint A.

**Overenie:**

```sh
npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.test.tsx
git diff --check
```

Ak sa mení shared surface, zahrnúť jeho test z T1. Browser overenie vykonať na reálnej stránke s dostupnými alebo testovacími dátami; HTML prototyp sám nepreukazuje integráciu. Pri nedostupnom backende uviesť limit. Full suite/build iba pri novej preukázanej potrebe alebo výslovnej požiadavke.

## Checkpoint B: Dokončenie

- [x] Všetky akceptačné kritériá majú dôkaz overenia.
- [x] Zaznamenané vykonané príkazy, browser výsledky a prípadné limity.
- [x] Commit úspešný; finálna správa obsahuje jeho hash a rozsah validácie.

## Výsledky vykonania

- 33 testov / 5 súborov prešlo: `node node_modules/vitest/vitest.mjs run src/shared/components/data-table/DataTableSurface.test.tsx src/shared/components/data-table/DataTable.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.test.tsx`.
- Nový test flat surface najprv zlyhal na pôvodnom zaoblenom obale; po implementácii prešiel. Predvolené shared varianty zostali pokryté pôvodnými testami.
- Cielený ESLint všetkých siedmich zmenených TS/TSX súborov a `git diff --check` prešli.
- Browser: reálny RecoveryRunsPage s fixture hookmi, pôvodnými komponentmi a Tailwind CSS, v lokálnom Vite harness. Overené 320×800, 768×900, 1024×768, 1440×960, 1440×600, vyhľadávanie bez výsledkov, otvorenie detailu/Escape a dva záznamy. Desktop footer zostáva v okne; stránka nepretečie vodorovne. Bez runtime výnimiek v úspešnom behu.
- Screenshoty: `C:/Users/polnikr/AppData/Local/Temp/recovery-flat-qa-Ns047b/`. Dočasný harness odstránený po kontrole.
- Limit: browser používal testovacie dáta a shell podobný aplikačnému, nie živý backend či autentifikovanú reláciu. Full suite, full typecheck a production build neboli spustené.
- Rozšírenie oproti zoznamu pravdepodobných súborov: DataTable má opt-in `layout="contained"`, aby rodič vlastnil oba smery posúvania a sticky hlavička nemala vnorený scroll kontajner. Nový test overuje aj aktiváciu riadka Enterom.
- Cudzie zmeny na orchestration detailoch nie sú súčasťou tejto úlohy.