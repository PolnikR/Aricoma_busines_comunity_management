# Plán: Recovery Group Inventory refresh

Dátum: 2026-10-29. Stav: plán na review; implementácia nezačala.
Checklist: [recovery-group-inventory-refresh-todo.md](recovery-group-inventory-refresh-todo.md).
Umiestnenie samostatných súborov schválil používateľ; existujúce plan.md a todo.md zachovať.

## Cieľ

Prerobiť existujúce tlačidlo Inventory refresh na jednoduché opätovné načítanie cez existujúcu React Query query. Backend sa nemení. Refresh načíta údaje dostupné z backendu, ktorý môže použiť storage cache; negarantuje aktuálne snapshoty priamo zo storage.

## Overený východiskový stav

- FE commit c098a076 pridáva samostatné volanie getRecoveryGroupInventory s force_refresh=true a ručný setQueryData pod bežný query key.
- RecoveryGroupInventory a RecoveryGroupInventorySummary pozorujú rovnaký query key podľa run_id. Refetch preto aktualizuje oba pohľady.
- Lokálny BE checkout C:/Users/polnikr/source/ABCO/abco-be na HEAD 7bcce3f: api/routers/recovery_groups.py prijíma iba run_id a volá get_volume_relations bez force_refresh.
- ibm_flashsystem/topology.py už voliteľný force_refresh podporuje, endpoint ho však neodovzdáva. discovery_cache/service.py môže pri chybe vrátiť uložené dáta. FE z úspešnej odpovede nevie spoľahlivo určiť čerstvosť dát.
- Nové refresh testy mockujú generated hook aj fetcher; neoverujú skutočnú aktualizáciu zobrazených dát a súhrnu.
- Nesúvisiaca vstupná zmena src/app/routing/__snapshots__/routeContract.test.tsx.snap zostáva mimo tejto práce.

## Rozhodnutia

1. Použiť query.refetch(), query.isFetching a existujúce query.error upozornenie. Odstrániť samostatný request, useQueryClient, setQueryData a lokálne isRefreshing/refreshErrorRunId, ak po zmene nemajú použitie.
2. Počas načítania ponechať posledné dáta a stav rozbalených volumeov; tlačidlo zakázať a zobraziť existujúci preklad načítavania.
3. Pri chybe samotnej GET požiadavky zachovať dáta a ponúknuť retry. Ak backend vráti starú cache ako úspech, FE nevyrába vlastnú chybu ani tvrdenie o čerstvosti.
4. Odstrániť force_refresh iba z GET /get_recovery_group_inventory v lokálnom OpenAPI a spustiť existujúcu generáciu. Generated súbory neupravovať ručne; prípadný nesúvisiaci drift oddeliť od tejto zmeny.
5. Pri tlačidle doplniť stručný lokalizovaný text EN/SK/CS vysvetľujúci použitie backendovej cache. Bez nového UI komponentu, endpointu, query key, časovača alebo automatického polling mechanizmu.
6. Nepoužiť obchádzku cez ďalší storage endpoint. Bez nových závislostí a všeobecných mechanizmov na koordináciu requestov.

## Poradie

T1: kontrakt + refetch + behavior test → T2: vysvetľujúci text → checkpoint: cielené overenie + review + commit.

Pracovať sekvenčne v existujúcom workspace; rozsah je malý a zdieľa komponent aj testy. Podrobný checklist je iba v sprievodnom todo súbore.

## Overenie

- Cielený Vitest: node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupInventory.test.tsx
- ESLint iba zmenených TS/TSX súborov: node node_modules/eslint/bin/eslint.js <zmenené-súbory> --max-warnings 0
- Generovanie: npm.cmd run api:generate; následne node scripts/orval/check-generated.mjs pre súlad so snapshotom. Skontrolovať celý generated diff.
- JSON parse zmenených locale súborov a OpenAPI; overiť nový preklad vo všetkých troch jazykoch.
- git diff --check a kontrola staged diffu pred commitom.
- Celá testovacia sada a production build sa nespúšťajú štandardne. Širšie kontroly iba pri konkrétnom probléme alebo nečakanom rozsahu generácie.

## Riziká a limity

| Riziko | Ošetrenie |
| --- | --- |
| Používateľ očakáva živé snapshoty | Text pri tlačidle otvorene vysvetlí cache; bez tvrdenia o storage refreshi. |
| Test overí iba implementačný detail | Reálny hook a generated klient, mock fetch, assertions viditeľných dát a súhrnu. |
| Regenerácia zmení nesúvisiace súbory | Skontrolovať diff a zahrnúť iba zmeny patriace ku kontraktu tejto operácie; neprepisovať cudziu prácu. |
| Backend maskuje storage chybu cache odpoveďou | Zdokumentovaný limit; BE ani globálna cache politika sa nemenia. |

## Review a odovzdanie

Pred implementáciou musí používateľ schváliť obsah plánu. Schválenie umiestnenia súborov samo osebe nie je schválením implementácie. Po implementácii uviesť skutočné príkazy, výsledky a limity; po úspešnom overení commitnúť iba vlastné zmeny bez pushu.
