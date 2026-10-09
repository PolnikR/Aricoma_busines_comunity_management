# Úlohy: Recovery App `target_provider_id` + odstránenie `orchestratorConnId`

Plán: `tasks/recovery-app-target-provider-plan.md`.

Skratky ciest:
- `RA/` = `src/features/recovery-plans/recovery-applications/`
- `PR/` = `src/features/providers-connectors/providers/`

**Každý task končí jedným commitom, ktorý vznikne až po overení.** Postup overenia je popísaný v pláne v časti „Stratégia commitov“: focused vitest, eslint na zmenených súboroch, `tsc -b` bez nových chýb, `git diff --check`, `git add` s explicitnými cestami.

---

### Task 1: Commit OpenAPI kontraktu
**Akceptačné kritériá:**
- [ ] `node scripts/orval/check-generated.mjs` skončí s exit 0. Ak nie, stop a report.
- [ ] Commit `chore(api): sync OpenAPI contract` obsahuje iba `openapi/abco-api.json` a `src/generated/query/zod/**`, vrátane nového `recoveryApplicationRecord.gen.ts`. Telo commitu vymenuje zmeny kontraktu.
- [ ] Zapísaná baseline: počet chýb `npx tsc -b` a ich súbory (poznámka pod týmto taskom).

**Overenie:** `git show --stat HEAD` neobsahuje žiadny ručne písaný súbor.
**Závislosti:** žiadne
**Rozsah:** XS

### Task 2: Provider create/edit formulár bez `orchestratorConnId`
**Akceptačné kritériá:**
- [ ] `ProviderCreateForm` nemá pole „Orchestrator connection ID“. Pole zmizne z form typu.
- [ ] `ProvidersCreateModal` ho neinicializuje, nesleduje v dirty checku a neposiela v submit body.
- [ ] Kľúče `forms.orchestratorConnId` a `forms.orchestratorConnIdExample` sú odstránené z `sk/en/cs.json`.
- [ ] Test: submit body z modalu neobsahuje `orchestratorConnId`.

**Overenie:** `npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
**Súbory:** `PR/components/ProviderCreateForm.tsx` (+ test), `PR/components/ProvidersCreateModal.tsx` (+ test), `src/locales/{sk,en,cs}.json`
**Závislosti:** T1
**Rozsah:** S
**Commit:** `refactor(providers): drop orchestratorConnId from provider form`

### Task 3: Provider detail a katalóg bez `orchestratorConnId`
**Akceptačné kritériá:**
- [ ] `ProviderDetailPage` ani drawer v `ProvidersCatalogueTable` nezobrazujú „Orchestrator connection ID“.
- [ ] Kľúč `details.orchestratorConnId` je odstránený z `sk/en/cs.json`.
- [ ] Fixtures v testoch nemajú `orchestratorConnId`. `Alert.test.tsx` ostáva bez zmeny, ide len o text.

**Overenie:** `npm exec vitest run src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
**Súbory:** `PR/pages/ProviderDetailPage.tsx` (+ test), `PR/components/ProvidersCatalogueTable.tsx` (+ test, ak treba), `src/locales/{sk,en,cs}.json`
**Závislosti:** T1
**Rozsah:** S
**Commit:** `refactor(providers): drop orchestratorConnId from provider details`

## Checkpoint A
- [ ] `npx tsc -b`: žiadna chyba v `src/features/providers-connectors/**`.
- [ ] `npm exec vitest run src/features/providers-connectors/providers` je zelené.

---

### Task 4: `getEligibleTargetProviders`
**Akceptačné kritériá:**
- [ ] `getEligibleTargetProviders(providers, sourceType)` vracia providerov typu `sourceType` s `role === 'target'` a `credentialStatus === 'ok'`.
- [ ] Testy:
  - VMware zdroj ponúkne iba VMware target (nie source, nie IBM Power, nie credential ≠ ok).
  - IBM Power zdroj ponúkne iba IBM Power target.
  - Neznámy typ alebo `''` vráti `[]`.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/eligibleProviders.test.ts`
**Súbory:** `RA/utils/eligibleProviders.ts`, `RA/utils/eligibleProviders.test.ts` (nový)
**Závislosti:** T1
**Rozsah:** XS
**Commit:** `feat(recovery-apps): select eligible target providers by source type`

### Task 5: Select cieľového providera v `AppMetadataForm`
**Akceptačné kritériá:**
- [ ] `RecoveryApplicationFormState` má `targetProviderId: string`. `sourceConnection` a `targetConnection` zatiaľ ostávajú a odstráni ich T7.
- [ ] Builder má default `targetProviderId: ''` a posiela ho v `initialValues`.
- [ ] `AppMetadataForm` zobrazuje select „Cieľový provider“ pod zdrojom:
  - možnosti z `getEligibleTargetProviders(providers, typ zvoleného zdroja)`,
  - disabled, kým nie je zvolený zdroj,
  - nedostupné uložené id zobrazí rovnako ako pri zdroji (`providers.credentials.unavailable`),
  - pri zmene zdroja na iný typ pošle `onMetadataChange({ platform, targetProviderId: '' })`.
- [ ] Nové kľúče v `sk/en/cs.json` pre label a placeholder.
- [ ] Testy v `AppMetadataForm.test.tsx`: zobrazené možnosti, výber cieľa emituje `targetProviderId`, zmena typu zdroja vynuluje cieľ, rovnaký typ ho zachová.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
**Súbory:** `RA/model/recoveryApplicationTypes.ts`, `RA/components/AppMetadataForm.tsx` (+ test), `RA/components/RecoveryAppBuilder.tsx`, `src/locales/{sk,en,cs}.json`
**Závislosti:** T4
**Rozsah:** M
**Commit:** `feat(recovery-apps): add target provider select to app details`

### Task 6: Builder gate a validácia cieľa
**Akceptačné kritériá:**
- [ ] `detailsValid` v builderi vyžaduje, aby `targetProviderId` bol v `getEligibleTargetProviders` pre typ zvoleného zdroja.
- [ ] `validateRecoveryApplication` vráti `{ field: 'targetProvider', messageKey: 'recovery.application.validation.targetProviderRequired' }`, ak cieľ chýba alebo nie je eligible. Kľúč je v `sk/en/cs.json`.
- [ ] Testy:
  - validácia (nový test súbor): chýbajúci cieľ, cieľ iného typu, platný cieľ,
  - builder: krok 2 je disabled bez cieľa.
- [ ] Testy Builder a Editor page, ktoré ukladajú, si vyberú cieľ. Fixtures providerov dostanú target providera.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
**Súbory:** `RA/utils/validateRecoveryApplication.ts`, `RA/utils/validateRecoveryApplication.test.ts` (nový), `RA/components/RecoveryAppBuilder.tsx` (+ test), `RA/pages/RecoveryApplicationBuilderPage.test.tsx`, `RA/pages/RecoveryApplicationEditorPage.test.tsx`, `src/locales/{sk,en,cs}.json`
**Závislosti:** T5
**Rozsah:** M
**Commit:** `feat(recovery-apps): require a target provider before saving`

## Checkpoint (pred T7)
- [ ] V UI sa dá vybrať cieľ a Save je bez neho zablokovaný. Overené testami T5 a T6.

### Task 7: Wire typy a mapper na `target_provider_id`
Task je zámerne nedelený. Typy, mapper a fixtures sa musia zmeniť naraz. Inak by commit obsahoval padajúce testy alebo payload, ktorý nezodpovedá kontraktu.

**Akceptačné kritériá:**
- [ ] Typy:
  - `RecoveryApplicationData.application` má `source_provider_id` a `target_provider_id` (string) a nemá `source_connection`/`target_connection`.
  - `RecoveryApplicationApiRecord` a `ListItem` majú oba provider id ako `string | null | undefined`.
  - `RecoveryApplicationFormState` nemá `sourceConnection`/`targetConnection` a builder default ich nemá.
- [ ] `toRecoveryApplicationFormState`: `targetProviderId = target_provider_id ?? ''`.
- [ ] `toRecoveryApplicationData`:
  - posiela `target_provider_id: targetProvider.id`,
  - hodí chybu, ak cieľ nie je v providers (rovnaký vzor ako pri zdroji),
  - neposiela `source_connection`/`target_connection`.
- [ ] `submitDagResponse.ts` a cast v `useRecoveryApplications.ts` prejdú `tsc` bez TS2322 a TS2352.
- [ ] Fixtures: všetky výskyty `source_connection`/`target_connection` v `RA/**` a `recovery-runs/**` sú nahradené `target_provider_id`.
- [ ] Testy:
  - mapper: read vrátane legacy záznamu bez cieľa → `''`, write, neznámy cieľ → throw,
  - Builder page: request body má `target_provider_id` a nemá connections.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx` a `npx tsc -b`. Zostávajú iba chyby v `useDeleteRecoveryApplication*` a `RecoveryApplicationInventory*`.
**Súbory:**
- `RA/model/recoveryApplicationTypes.ts`, `RA/model/submitDagResponse.ts`
- `RA/utils/recoveryApplicationFormMapper.ts` (+ test)
- `RA/hooks/useRecoveryApplications.ts` (+ test)
- `RA/components/RecoveryAppBuilder.tsx`
- fixtures: `RA/helpers/mapRecoveryApplications.test.ts`, `RA/pages/*.test.tsx`, `RA/components/RecoveryApplicationsTable.test.tsx`, `recovery-runs/hooks/useOrchestratedApps.test.tsx`

**Závislosti:** T6
**Rozsah:** L
**Commit:** `feat(recovery-apps): send source and target provider ids instead of connections`

## Checkpoint B
- [ ] `npx tsc -b`: chyby už iba v `useDeleteRecoveryApplication*` a `RecoveryApplicationInventory*`.
- [ ] `npm exec vitest run src/features/recovery-plans` je zelené.

---

### Task 8: Rollback a inventár cez `target_provider_id`
**Akceptačné kritériá:**
- [ ] `resolveTargetComputeProviderId` (párovanie cez `orchestratorConnId`) je odstránený. Nahradí ho `targetComputeProviderIdOf(app)`, ktorý vráti `target_provider_id` alebo hodí `RecoveryApplicationsError('missing_compute_provider', …)`.
- [ ] `resolveRollbackProviderIds`:
  - nemá blok `ibm_power_rollback_unsupported`,
  - VMware aj IBM Power posielajú `compute_provider_id = target_provider_id`,
  - chýbajúci orchestration provider ostáva `missing_orchestration_provider`.
- [ ] `RecoveryApplicationInventory`:
  - VMware posiela `compute_provider_id = target_provider_id`; ak chýba, zobrazí error alert a request sa nepošle,
  - IBM Power ostáva bez parametra,
  - inventár už nenačítava providers, ak ich prestane potrebovať.
- [ ] Testy:
  - delete: VMware query obsahuje cieľ; IBM Power query obsahuje IBM Power cieľ (predtým error); legacy bez cieľa → `missing_compute_provider` a request sa nepošle; delete bez rollbacku je bez zmeny,
  - `recoveryApplicationsWire.test.tsx`: fixtures bez `orchestratorConnId`,
  - inventár: VMware s cieľom, VMware bez cieľa → alert, IBM Power.

**Overenie:** `npm exec vitest run src/features/recovery-plans/recovery-applications/hooks/useDeleteRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationInventory.test.tsx` a `npx tsc -b` s 0 chybami.
**Súbory:** `RA/hooks/useDeleteRecoveryApplication.ts` (+ test), `RA/hooks/recoveryApplicationsWire.test.tsx`, `RA/components/RecoveryApplicationInventory.tsx` (+ test)
**Závislosti:** T7
**Rozsah:** M
**Commit:** `feat(recovery-apps): roll back and inventory via stored target provider`

## Checkpoint C (koniec)
- [ ] `npx tsc -b`: 0 chýb.
- [ ] `npx eslint` nad všetkými súbormi zmenenými v sérii (`git diff --name-only <T1>^..HEAD -- src`).
- [ ] `node scripts/orval/check-generated.mjs`: exit 0.
- [ ] `npm exec vitest run src/features/recovery-plans src/features/providers-connectors` je zelené.
- [ ] `git grep -n "orchestratorConnId\|source_connection\|target_connection" -- src ':!src/generated'` nájde iba `Alert.test.tsx`.
- [ ] Voliteľne, ak beží backend: manuálna kontrola cez CDP (Edge :9333). Uložiť appku a overiť `target_provider_id` v body, potom delete s rollbackom a overiť `compute_provider_id` v query.
