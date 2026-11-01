# Recovery Group DAG versioning — vykonanie

2026-11-01, inline v existujúcom checkoute na vetve `integration/recovery-alignment-20261031`.
Existujúce necommitnuté úpravy plan/todo sa zachovávajú a nebudú zahrnuté do commitov.

## Rozhodnutia používateľa

- D1 schválené: Hitachi katalóg/model/detail, bez nového Hitachi builder flow.
- D2 schválené: existujúce Apps UX, default voľba odosiela null.
- D3 zmenené: backend je autorita validácie. Žiadne nové FE obmedzenia Save/Push
  podľa dostupnosti katalógu alebo členstva verzie. Zachovať explicitnú neznámu verziu.
- Zachovať Push, HTTP 502, rollback a cache flow. Bez dodatočného GET/retry/pollingu.

Tento pokyn nahrádza pôvodné validačné brány T4/T5/T8 a príslušné AC v pláne/TODO.
Shared katalógový validátor sa preto neextrahuje a readiness sa nemení.
Existujúci app validátor ostáva nedotknutý. Group resolver slúži len query/UI.

## Postup

- [x] F1 / T1–T2: model, API mapovanie a draft lifecycle — `ba946d02`.
- [x] F2 / T3,T5: spoločný prezentačný selector, group platform resolver — `05d2ff32`.
- [x] T4 a readiness/submit katalógové brány: výslovne zrušené upraveným D3;
  spoločný validátor sa nezavádza a Apps validácia sa nemení.
- [x] F3 / T6–T7: EN/SK/CS, orchestration UI a generated query — `54b861fa`.
- [x] F4 / T8–T9: regresie existujúceho submit/error flow, bez runtime lifecycle zmien.
- [x] F5 / T10–T11: detail (`98e9f898`), integrované regresie a browser QA.
- [x] CP1–CP5: roundtrip, reuse, UI, zachovaný lifecycle a záverečné review.

## Overenie

- Baseline: 4 cielené test súbory, 75 testov passed.
- F1: red-green pre mapovanie (6 chýbajúcich assertions) a draft event (1 failure).
  Po implementácii 4 súbory / 82 testov passed; app TypeScript check passed.
- Kompletná test sada, production build a live storage/Airflow QA sa nespúšťajú.

## Výsledky overenia

Všetky nižšie uvedené skupiny majú úspešné cielené overenie. Počas red-green
cyklu sa najprv preukázali chýbajúce mapper/reducer/UI/locale assertions. Po pridaní
selectoru boli existujúce testy upravené na konkrétne accessible labely a počítanie
Airflow options v jeho vlastnom selecte; test discovery má predvyplnený DAG katalóg
v canonical query cache, aby naďalej dokazoval absenciu inventory requestov.

| Oblasť | Overenie |
| --- | --- |
| Mapovanie, validácia, draft lifecycle/resolver | 4 súbory, 82 testov passed |
| Shared selector, Apps adapter, group platform resolver | 3 súbory, 18 testov passed |
| Preklady a existujúce field help texty | 2 súbory, 6 testov passed; diakritika vizuálne overená |
| Builder a detail | 2 súbory, 102 testov passed |
| Discovery/prefetch a orchestration detail regresie | 3 súbory prešli v spoločnom behu; jeho dve chyby v builder/table assertions boli následne opravené a oba súbory kompletne znovu prešli |
| Orchestration krok a topology UI | 9 + 8 testov passed |
| Hook a create/edit stránky | 3 súbory, 62 testov passed pred pridaním ďalších rollback scenárov |
| Hook s rollback regresiami a wire integrácia | 2 súbory, 45 testov passed; po pridaní platform race testu integračný súbor znovu: 5 testov passed |
| Readiness, topology a locale regresie | 4 súbory, 38 testov passed |
| App TypeScript | `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false` passed |
| ESLint | cielené zmenené TS/TSX súbory passed; bez vypínania pravidiel |
| QA skript | `node --check scripts/qa/verify-recovery-group-dag-version.mjs` |
| Browser | `node scripts/qa/verify-recovery-group-dag-version.mjs`: 7 scenárov passed |

Browser používal vlastný Vite na `127.0.0.1:5199` a dočasný Edge context, iba mocked
API. Pokryté SK/EN/CS, help/focus/klávesnica, default→null, explicitná verzia,
filtrovanie platformy, catalog failure/retry, Push pushed/skipped/502, read-only
lock a absencia nového GET po 502. Report a screenshoty sú v
`node_modules/.cache/recovery-group-dag-version-qa/`; `selector-sk.png` a
`detail-cs.png` boli vizuálne skontrolované. Žiadne neočakávané console/page chyby.

## Spustené cielené test príkazy

Prefix každého nasledujúceho manifestu je `node node_modules/vitest/vitest.mjs run`.
Súbory sú explicitné, nejde o kompletnú projektovú test sadu.

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftLifecycle.test.ts src/features/recovery-plans/recovery-groups/model/resolveRecoveryGroupDraft.test.ts
node node_modules/vitest/vitest.mjs run src/shared/components/dag-template-version-select/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-applications/components/DagTemplateVersionSelect.test.tsx src/features/recovery-plans/recovery-groups/model/recoveryGroupDagTemplate.test.ts
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupTopologyStep.test.tsx
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.discovery-lifecycle.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.prefetch.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupDagVersion.integration.test.tsx
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupDagVersion.integration.test.tsx
node node_modules/vitest/vitest.mjs run src/locales/recoveryGroupDagVersionTranslations.test.ts src/locales/recoveryGroupFieldHelpTranslations.test.ts src/features/recovery-plans/recovery-groups/model/recoveryGroupDraftReadiness.test.ts src/features/recovery-plans/recovery-groups/utils/recoveryGroupTopology.test.ts
```

Záverečné inline review: nepribudol fetcher, shared validation framework, FE
Save/Push gate, zmena generated súborov, BE, readiness, submit hook runtime,
rollbacku ani cache invalidácií. Hitachi má schválený obmedzený rozsah D1;
nový plný Hitachi create/push flow sa netvrdí. Práca ostáva na lokálnej vetve,
bez automatického merge/pushu/deploy.
