# Úlohy: Recovery Group Inventory refresh

Plán: [recovery-group-inventory-refresh-plan.md](recovery-group-inventory-refresh-plan.md).
Stav: T1 a T2 implementované a automaticky overené. Otvorená zostáva browser kontrola. Backend sa nemenil.

## T1: Jednoduché načítanie v súlade s BE

**Popis:** Nahradiť samostatný force refresh bežným query.refetch a odstrániť nepodporovaný parameter z kontraktu tejto operácie. Behavior test má použiť reálnu query aj klienta s mock fetch.

**Akceptačné kritériá:**
- [x] Refresh posiela GET /get_recovery_group_inventory s run_id bez force_refresh; response aktualizuje zobrazené snapshoty aj pripojený InventorySummary.
- [x] Počas odloženej odpovede je tlačidlo zakázané, posledné dáta zostávajú viditeľné a existujúci volume zostáva rozbalený aj po úspechu. Pri chybe GET zostanú dáta a zobrazí sa existujúce upozornenie s retry.
- [x] Komponent používa query.refetch/isFetching/error bez duplicitného refresh stavu a ručného cache zápisu; OpenAPI a regenerovaný klient zodpovedajú BE operácii bez force_refresh.

**Overenie:**
- [x] Nové assertions najprv preukážu pôvodné odlišné správanie; po minimálnej úprave prejde node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx.
- [x] npm.cmd run api:generate; node scripts/orval/check-generated.mjs; generated diff obsahuje iba relevantné zmeny.
- [x] Cielený ESLint zmeneného komponentu a testu; OpenAPI je validný JSON.

**Závislosti:** Žiadne; existujúci BE kontrakt overený read-only.
**Pravdepodobné súbory (medium, 4):**
- openapi/abco-api.json
- src/generated/query/zod/getRecoveryGroupInventoryParams.gen.ts (iba generovaním)
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx

## T2: Vysvetlenie backendovej cache

**Popis:** Pri refresh tlačidle zobraziť krátke vysvetlenie v existujúcom štýle a všetkých podporovaných jazykoch. Napríklad: „Znovu načíta údaje z backendu; môže použiť cache.“

**Akceptačné kritériá:**
- [x] EN/SK/CS text vysvetľuje použitie cache a nesľubuje aktuálne snapshoty priamo zo storage.
- [x] Text je viditeľný pri ovládaní refreshu; bez nového komponentu alebo zmeny layoutu ostatných sekcií.
- [x] Test overuje prítomnosť vysvetlenia; existujúce správanie z T1 zostáva zachované.

**Overenie:**
- [x] Rovnaký cielený Vitest z T1 a ESLint oboch dotknutých TSX súborov.
- [x] JSON parse en.json, sk.json, cs.json a kontrola existencie/neprázdnosti nového kľúča vo všetkých troch.

**Závislosti:** T1.
**Pravdepodobné súbory (medium, 5):**
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx
- src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx
- src/locales/en.json
- src/locales/sk.json
- src/locales/cs.json

## Checkpoint: Overenie a odovzdanie

- [x] Používateľ schválil obsah plánu pred začatím implementácie.
- [x] T1 a T2 spĺňajú akceptačné kritériá; vyššie uvedené cielené kontroly prešli.
- [x] git diff --check prešiel; review potvrdilo absenciu BE zmien, ďalších requestov, nových abstrakcií a nesúvisiacich úprav.
- [x] Zachovaná cudzia zmena routeContract.test.tsx.snap a pôvodné tasks/plan.md aj tasks/todo.md.
- [x] Vytvorený atómový commit iba vlastných zmien; bez pushu.
- [x] Report obsahuje výsledky kontrol a limit backendovej cache; uvádza, že kompletná suite a build neboli spustené, ak nebol dôvod ich spustiť.

## Výsledky vykonania — 2026-10-29

- Implementácia: commit 35b3b0f8 na spike/ant-design-shell, inline bez ďalších agentov a bez pushu. Pôvodné plány a cudzí routing snapshot zachované.
- RED: oba nové HTTP behavior testy zlyhali na pôvodnom force_refresh=true v URL. GREEN: finálny príkaz `node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx` prešiel: 13/13, exit 0.
- Testy cez reálny generated hook a klienta s mock fetch overujú URL a GET, zmenu snapshotov aj súhrnu, pending disabled, zachovanie otvoreného volume a dát počas načítania, HTTP chybu a úspešný retry.
- Test vysvetlenia cache najprv zlyhal na chýbajúcom texte; po doplnení je súčasťou zeleného finálneho behu.
- `node node_modules/eslint/bin/eslint.js src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx --max-warnings 0`: exit 0. Prvé spustenie našlo require-await iba v novom teste; zbytočné async bolo odstránené bez suppression.
- `npm.cmd run api:generate` a `node scripts/orval/check-generated.mjs`: exit 0. Orval potreboval sandbox eskaláciu na vyriešenie importu existujúceho mutatora. Generated diff mení iba schému parametrov danej operácie.
- Node JSON/encoding/content assertions pre EN/SK/CS a OpenAPI: PASS; nepodporovaný parameter danej operácie odstránený. `git diff --check` aj `git diff --cached --check`: exit 0.
- Vlastné review podľa code-review-and-quality: correctness (jedna query, aktualizácia zdieľaného súhrnu, chyby), simplicity (odstránený duplicitný stav a ručný cache zápis), architecture (generated hook), security (existujúca autentifikácia a response validácia zachované), performance (bez ďalšieho endpointu/pollingu). Bez otvoreného nálezu v tomto rozsahu.
- Celá testovacia sada, produkčný build ani plošný typecheck neboli spustené podľa focused scope. Živé storage načítanie nie je garantované existujúcim BE.

## Otvorené browser overenie

- [ ] Po prihlásení používateľa overiť lokálnu stránku Recovery groups, detail Inventory, cache vysvetlenie a refresh so zachovaním rozbaleného volume.
- Browser test bol začatý cez computer-use v okne Edge; Chrome DevTools MCP nie je dostupný. Automatizácia sa zastavila, pretože nedokázala spoľahlivo určiť aktuálnu URL na uplatnenie pravidiel ovládania. Blokácia nebola obchádzaná.
- Lokálny Vite bol spustený na http://127.0.0.1:5173/recovery-plans/recovery-groups; používateľ bol požiadaný otvoriť stránku, prihlásiť sa a potvrdiť pripravenosť. Browser funkčnosť ani vizuálny výsledok zatiaľ nie sú preukázané.
