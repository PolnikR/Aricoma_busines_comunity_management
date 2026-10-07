# Úlohy: Recovery App `platform` / `source_provider_id`

Plán: `tasks/recovery-app-source-provider-plan.md`. Cesty sú relatívne k `src/features/recovery-plans/recovery-applications/`.

### Task 1: Overiť a commitnúť contract
**Akceptačné kritériá:**
- [x] `node scripts/orval/check-generated.mjs` exit 0; inak stop a report.
- [x] Commit `chore(api): sync OpenAPI contract` obsahuje iba `openapi/abco-api.json` + `src/generated/**`.
**Overenie:** `git show --stat HEAD` bez handwritten súborov.
**Rozsah:** XS

### Task 2: Helper, typy, form mapper
**Akceptačné kritériá:**
- [x] `utils/sourceProvider.ts`: `SOURCE_PROVIDER_TYPES`, `sourceProviderIdOf`; `isEligibleSourceProvider` používa `SOURCE_PROVIDER_TYPES`.
- [x] `toRecoveryApplicationFormState`: `{ platform: 'IBM_POWER', source_provider_id: 'ibm-power-01' }` → form `platform = 'ibm-power-01'`; legacy `{ platform: 'vmware-vcenter-01' }` → `'vmware-vcenter-01'`; `{ platform: 'VMWARE' }` bez ID → `''`.
- [x] `toRecoveryApplicationData(formState, providers)`: `platform = provider.type`, `source_provider_id = provider.id`; neznámy provider → throw.
- [x] Typy `RecoveryApplicationData` a `ListItem.data.application` majú `source_provider_id`.
**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/utils`
**Súbory:** `utils/sourceProvider.ts` (+ test), `utils/eligibleProviders.ts`, `utils/recoveryApplicationFormMapper.ts` (+ test), `model/recoveryApplicationTypes.ts`
**Rozsah:** M

### Task 3: Pages + submit testy
**Akceptačné kritériá:**
- [x] Builder aj Editor page načítajú providers (`useGetProviders({ role: 'all' })`, `selectProviders`) a odovzdajú ich mapperu.
- [x] Test: IBM Power provider `ibm-power-01` → request body `application.platform = 'IBM_POWER'`, `source_provider_id = 'ibm-power-01'`.
- [x] Test: VMware `vmware-vcenter-01` → `'VMWARE'` / `'vmware-vcenter-01'`.
- [x] Test edit: response `IBM_POWER` + `ibm-power-01` → dropdown má hodnotu `ibm-power-01`.
- [x] Test legacy edit: response `platform = 'vmware-vcenter-01'` bez ID → dropdown `vmware-vcenter-01`; Save pošle `VMWARE` / `vmware-vcenter-01`.
- [x] Test: `provider_id` query parameter (orchestration) a `push_to_orchestrator` sa nemenia.
**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/pages src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
**Súbory:** `pages/RecoveryApplicationBuilderPage.tsx` (+ test), `pages/RecoveryApplicationEditorPage.tsx` (+ test)
**Rozsah:** M

### Task 4: Tabuľka, filter, drawer
**Akceptačné kritériá:**
- [x] Stĺpec „Platform“ zobrazí meno providera podľa `source_provider_id` (legacy fallback); record s `platform = 'IBM_POWER'` nezobrazí `IBM_POWER` ako meno providera.
- [x] Filter „Platform“ ponúka a filtruje podľa source providera; vizuál bez zmeny.
- [x] Drawer „Platform“ berie `sourceProviderIdOf`.
**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx`
**Súbory:** `components/RecoveryApplicationsTable.tsx` (+ test)
**Rozsah:** S

### Task 5: Explicitný target `compute_provider_id` (VMware) a blokácia IBM Power rollbacku

**Popis:** FE nikdy neodvodí `compute_provider_id` zo `source_provider_id` ani sa nespolieha na BE default. Pre VMware app nájde target provider jednoznačne:

```ts
provider.type === 'VMWARE'
  && provider.role === 'target'
  && provider.orchestratorConnId === application.target_connection
```

- presne 1 match → `compute_provider_id = provider.id`
- 0 match → `RecoveryApplicationsError` (žiadny VMware target provider s connection `<target_connection>`), request sa neposiela
- viac ako 1 match → `RecoveryApplicationsError` (viac VMware target providerov s connection `<target_connection>`), request sa neposiela

Rovnaká funkcia (jedna, v `recovery-applications`) sa použije pre rollback (`delete_recovery_app`) aj inventory (`get_recovery_app_inventory`). IBM Power rollback je vo FE zablokovaný: pri `application.platform === 'IBM_POWER'` sa DELETE neposiela a hook vyhodí `RecoveryApplicationsError` s vysvetlením, že target IBM Power provider nie je v Recovery App jednoznačne uložený. IBM Power inventory mimo scope (BE endpoint je VMware-only, žiadny workaround). Inventory komponent dostane okrem `runId` aj aplikáciu (`target_connection`) a providers dataset (`useGetProviders({ role: 'all' })`). Bez nových hardcoded provider ID, bez `partnerProviderId`, bez `managedSystem`.

**Spoločná fixture:** app `source_provider_id = 'vmware-vcenter-01'`, `target_connection = 'vcenter_default_destination'`, `orchestration.provider_id = 'airflow-01'`; providers: VMWARE source `vmware-vcenter-01` (`orchestratorConnId = 'vcenter_default'`), VMWARE target `vmware-vcenter-02` (`orchestratorConnId = 'vcenter_default_destination'`).

**Akceptačné kritériá:**
- [x] **VMware rollback:** DELETE `/delete_recovery_app` pošle `compute_provider_id = vmware-vcenter-02`, `provider_id = airflow-01`, `rollback_from_orchestrator = true`.
- [x] **VMware inventory:** GET `/get_recovery_app_inventory` pošle `run_id` a `compute_provider_id = vmware-vcenter-02`.
- [x] **Missing target:** žiadny VMware target s `orchestratorConnId = target_connection` → rollback aj inventory request sa neposiela, zobrazí sa FE chyba.
- [x] **Ambiguous target:** 2 VMware target provideri s rovnakým `orchestratorConnId` → request sa neposiela, FE chyba.
- [x] **Source sa nepoužije:** ani pri chýbajúcom targete sa `compute_provider_id` nenastaví na `source_provider_id`; VMWARE source provider s rovnakým `orchestratorConnId` sa nezapočíta (filter `role === 'target'`).
- [x] **IBM Power rollback:** pri `platform = 'IBM_POWER'` sa DELETE neposiela; `RecoveryApplicationsError` vysvetľuje chýbajúci jednoznačný target provider model.
- [x] **Orchestration:** `provider_id = orchestration.provider_id` bez zmeny; chýbajúci orchestration provider stále vyhodí `missing_orchestration_provider`.
- [x] Delete bez rollbacku (`pushToOrchestrator = false`) sa nemení (žiadny target lookup).
- [x] Chybové správy majú en/sk/cs preklady, ak sa zobrazujú cez preklady (podľa existujúceho vzoru zobrazenia `RecoveryApplicationsError`).
  - Výsledok: existujúce `RecoveryApplicationsError` správy sú anglické texty zobrazené cez `resolveUserFacingErrorMessage`, bez prekladových kľúčov; nové správy idú rovnakou cestou, preklady sa nepridávali.

**Overenie:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/hooks src/features/recovery-plans/recovery-applications/components/RecoveryApplicationInventory.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [x] `npm run typecheck`, focused eslint, `git diff --check`

**Závislosti:** T2 (typy, `target_connection` na `ListItem`), Checkpoint T1–T4
**Súbory:** `hooks/useDeleteRecoveryApplication.ts` (+ test), `hooks/recoveryApplicationsWire.test.tsx`, `components/RecoveryApplicationInventory.tsx` (+ test), `components/RecoveryApplicationsTable.tsx` (odovzdanie app do inventory), prípadne `src/locales/{en,sk,cs}.json`
**Rozsah:** M

## Checkpoint
- [x] `npm run typecheck`
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs`
- [x] `npx eslint --max-warnings 0 <zmenené súbory>` + `node scripts/orval/check-feature-layout.mjs`
- [x] `git diff --check`
- [x] `grep` handwritten `application.platform` / `.platform` — žiadne miesto ho nečíta ako provider ID (okrem `sourceProviderIdOf` legacy vetvy)
- [x] Commit 2 (T2–T4) s explicitným zoznamom ciest; report
- [x] Commit 3 (T5) `fix: resolve recovery app rollback target from target connection` s explicitným zoznamom ciest
