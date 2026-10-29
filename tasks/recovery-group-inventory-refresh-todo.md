# Úlohy: Recovery Group Inventory refresh

Plán: [recovery-group-inventory-refresh-plan.md](recovery-group-inventory-refresh-plan.md).
Stav: pripravené na review; implementácia nezačala. Backend sa nemení.

## T1: Jednoduché načítanie v súlade s BE

**Popis:** Nahradiť samostatný force refresh bežným query.refetch a odstrániť nepodporovaný parameter z kontraktu tejto operácie. Behavior test má použiť reálnu query aj klienta s mock fetch.

**Akceptačné kritériá:**
- [ ] Refresh posiela GET /get_recovery_group_inventory s run_id bez force_refresh; response aktualizuje zobrazené snapshoty aj pripojený InventorySummary.
- [ ] Počas odloženej odpovede je tlačidlo zakázané, posledné dáta zostávajú viditeľné a existujúci volume zostáva rozbalený aj po úspechu. Pri chybe GET zostanú dáta a zobrazí sa existujúce upozornenie s retry.
- [ ] Komponent používa query.refetch/isFetching/error bez duplicitného refresh stavu a ručného cache zápisu; OpenAPI a regenerovaný klient zodpovedajú BE operácii bez force_refresh.

**Overenie:**
- [ ] Nové assertions najprv preukážu pôvodné odlišné správanie; po minimálnej úprave prejde node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx.
- [ ] npm.cmd run api:generate; node scripts/orval/check-generated.mjs; generated diff obsahuje iba relevantné zmeny.
- [ ] Cielený ESLint zmeneného komponentu a testu; OpenAPI je validný JSON.

**Závislosti:** Žiadne; existujúci BE kontrakt overený read-only.
**Pravdepodobné súbory (medium, 4):**
- openapi/abco-api.json
- src/generated/query/zod/getRecoveryGroupInventoryParams.gen.ts (iba generovaním)
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx

## T2: Vysvetlenie backendovej cache

**Popis:** Pri refresh tlačidle zobraziť krátke vysvetlenie v existujúcom štýle a všetkých podporovaných jazykoch. Napríklad: „Znovu načíta údaje z backendu; môže použiť cache.“

**Akceptačné kritériá:**
- [ ] EN/SK/CS text vysvetľuje použitie cache a nesľubuje aktuálne snapshoty priamo zo storage.
- [ ] Text je viditeľný pri ovládaní refreshu; bez nového komponentu alebo zmeny layoutu ostatných sekcií.
- [ ] Test overuje prítomnosť vysvetlenia; existujúce správanie z T1 zostáva zachované.

**Overenie:**
- [ ] Rovnaký cielený Vitest z T1 a ESLint oboch dotknutých TSX súborov.
- [ ] JSON parse en.json, sk.json, cs.json a kontrola existencie/neprázdnosti nového kľúča vo všetkých troch.

**Závislosti:** T1.
**Pravdepodobné súbory (medium, 5):**
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx
- src/locales/en.json
- src/locales/sk.json
- src/locales/cs.json

## Checkpoint: Overenie a odovzdanie

- [ ] Používateľ schválil obsah plánu pred začatím implementácie.
- [ ] T1 a T2 spĺňajú akceptačné kritériá; vyššie uvedené cielené kontroly prešli.
- [ ] git diff --check prešiel; review potvrdilo absenciu BE zmien, ďalších requestov, nových abstrakcií a nesúvisiacich úprav.
- [ ] Zachovaná cudzia zmena routeContract.test.tsx.snap a pôvodné tasks/plan.md aj tasks/todo.md.
- [ ] Vytvorený atómový commit iba vlastných zmien; bez pushu.
- [ ] Report obsahuje výsledky kontrol a limit backendovej cache; uvádza, že kompletná suite a build neboli spustené, ak nebol dôvod ich spustiť.
