# Recovery runs — Flat workspace: úlohy

Plán: [recovery-runs-flat-plan.md](recovery-runs-flat-plan.md).
Stav: implementácia nezačala. Zaškrtnutie vyžaduje výsledok overenia.

## T1: Jedna dátová plocha

Nahradiť vnorenú kompozíciu na Recovery runs plochým rozložením. Pred úpravou preveriť aktuálne zdroje cez CodeGraph a existujúce pracovné zmeny.

- [ ] Názov stránky, záložky, vyhľadávanie a tabuľka sú v jednej ploche bez vnorenej karty Orchestrated entities.
- [ ] Užitočný vysvetľujúci text zostáva dostupný; existujúce ovládanie a dátová logika sú zachované.
- [ ] Prípadná úprava shared surface je opt-in a predvolený vzhľad ostatných stránok zostáva rovnaký.

**Súbory:** RecoveryRunsPage.tsx, RecoveryRunsTable.tsx v `src/features/recovery-plans/recovery-runs/`; podľa potreby `src/shared/components/data-table/DataTableSurface.tsx` a jeho test. Rozsah M, najviac 4 súbory.

**Závislosti:** žiadne.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx`; pri úprave shared surface aj `npm exec vitest run src/shared/components/data-table/DataTableSurface.test.tsx`.

## T2: Kompaktné rozloženie a posúvanie

Dopracovať dostupný priestor pre tabuľku v rámci existujúceho aplikačného rámu.

- [ ] Zarovnané okraje, jemné deliace linky a približne 40 px riadky bez orezania textu.
- [ ] Desktop posúva tabuľku a zachováva dostupné hlavičky a stránkovanie; úzka stránka nepretečie vodorovne.
- [ ] Tab, focus indikátor a ovládanie detailu fungujú; farby, typografia a lokalizácia nadväzujú na aplikáciu.

**Súbory:** rovnaké lokálne page/table komponenty ako T1; shared surface iba ak je potrebná jeho izolovaná opt-in úprava. Rozsah S–M.

**Závislosti:** T1.

**Overenie:** prehliadač pri 320, 768, 1024 a 1440 px a nízkom desktop okne; screenshot, kontrola scrollovania a klávesnice. Cielený ESLint na skutočne zmenených TS/TSX súboroch.

## Checkpoint A

- [ ] Diff obsahuje iba Recovery runs a nevyhnutnú opt-in podporu.
- [ ] Zobrazenie s dvoma záznamami aj dlhou tabuľkou zodpovedá plánu.

## T3: Regresné overenie a odovzdanie

Overiť používateľské správanie; existujúce assertions zachovať, doplniť iba chýbajúce kontroly zmenenej kompozície.

- [ ] Záložky, vyhľadávanie, počet riadkov, stránkovanie, Refresh, výber entity a existujúci detail fungujú.
- [ ] Loading, empty, no matches, error a retry sú viditeľné a použiteľné.
- [ ] Browser nemá nové chyby; zmeny sú overené a uložené v atomickom commite bez cudzej práce.

**Súbory:** `pages/RecoveryRunsPage.test.tsx`, `components/RecoveryRunsTable.test.tsx`; prípadné opravy iba súborov z T1–T2. Rozsah M.

**Závislosti:** T2, checkpoint A.

**Overenie:**

```sh
npm exec vitest run src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunsTable.test.tsx src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDetailView.test.tsx
git diff --check
```

Ak sa mení shared surface, zahrnúť jeho test z T1. Browser overenie vykonať na reálnej stránke s dostupnými alebo testovacími dátami; HTML prototyp sám nepreukazuje integráciu. Pri nedostupnom backende uviesť limit. Full suite/build iba pri novej preukázanej potrebe alebo výslovnej požiadavke.

## Checkpoint B: Dokončenie

- [ ] Všetky akceptačné kritériá majú dôkaz overenia.
- [ ] Zaznamenané vykonané príkazy, browser výsledky a prípadné limity.
- [ ] Commit úspešný; finálna správa obsahuje jeho hash a rozsah validácie.
