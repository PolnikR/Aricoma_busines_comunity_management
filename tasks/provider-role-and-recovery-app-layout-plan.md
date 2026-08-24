# Implementation Plan: Provider roles and Recovery Application wizard layout

## Overview

Rozšíriť kontrakt infraštruktúrnych providerov o `role`, `defaultFlashcopyProviderId` a `orchestratorConnId`, doplniť parameter `role` do `GET /get_providers`, preniesť nové údaje cez cache, create/edit formulár, tabuľku a detail a upraviť Recovery Application wizard tak, aby jeho navigácia nemala horizontálny scrollbar a nový formulár začínal iba s jedným tierom.

## Confirmed scope and assumptions

- `role` je povinná hodnota kontraktu: `source | target`.
- Filter pre `GET /get_providers` je `all | source | target` a frontend používa `all` ako predvolenú hodnotu.
- `defaultFlashcopyProviderId` a `orchestratorConnId` sú optional/nullable, pretože v dodanom response nie sú prítomné pri každom type providera. Prázdna hodnota formulára sa do requestu neposiela.
- Management obrazovka providerov načítava `role=all`; existujúce helpery s významom „source provider“ zároveň overia `role === 'source'`, aby target provider nevstupoval do recovery/discovery source flow.
- V tabuľke pribudne iba `role`; oba connection údaje budú v detail draweri aj samostatnej detail page.
- Formulár použije existujúce shared `Field`, `Input` a `Select`. `role` bude povinný select, `defaultFlashcopyProviderId` select z existujúcich `FLASHCOPY` providerov a `orchestratorConnId` textový optional input.
- Mobilný horizontálny wizard zostane scrollovateľný. Scrollbar sa odstráni z desktopového ľavého panelu, ktorý dostane dostatočnú šírku a položky sa nebudú nútene rozťahovať cez panel.
- Predpoklad pre jeden default tier: ponechá sa dnešný prvý tier `database` (`order: 1`, `Database server group`). Existujúce aplikácie načítané cez `initialData` sa nemenia.
- UI filter providerov podľa role nie je súčasťou tejto zmeny; požiadavka sa týka API parametra a zobrazenia role.

## Dependency graph

```text
Provider role/value types
  -> Zod GET/submit contracts
  -> parameterized API + role-aware React Query keys
     -> cache invalidation after upsert/delete
     -> source-only consumer filters
  -> create/edit form
  -> provider table and detail views

Recovery Application default state
  -> single default tier tests

Shared WizardSteps desktop overflow behavior
  -> RecoveryAppBuilder sidebar width
  -> responsive visual verification
```

## Task 1: Extend the provider domain and validation contracts

**Description:** Add canonical provider-role constants/types and extend record/submit schemas with the three backend fields. Keep the two connection IDs optional/nullable while requiring a valid role.

**Acceptance criteria:**
- [ ] `ProviderRole` only accepts `source` and `target`; `ProviderRoleFilter` additionally accepts `all`.
- [ ] GET parsing requires a valid `role` and preserves both optional connection IDs.
- [ ] Submit validation accepts the same role and optional IDs and rejects an invalid role.

**Verification:**
- [ ] Focused model/schema/API contract tests cover valid, missing and invalid role plus present/absent optional IDs.
- [ ] `npm run typecheck` reports no contract errors after fixture migration is complete.

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/model/providerTypes.test.ts`
- `src/features/providers-connectors/providers/api/schemas/providersSchema.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Medium (4 files)

## Task 2: Add the role parameter to the provider API client

**Description:** Parameterize `fetchProviders` with a default `all` value and encode it into the `GET /get_providers?role=...` URL.

**Acceptance criteria:**
- [ ] `fetchProviders()` calls `/api/get_providers?role=all`.
- [ ] `fetchProviders('source')` and `fetchProviders('target')` send the selected value.
- [ ] Callers cannot pass an unsupported filter at compile time.

**Verification:**
- [ ] `npm test -- src/features/providers-connectors/providers/api/providersApi.test.ts`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Small (2 files)

## Task 3: Make provider queries and mutations safe for role-specific caches

**Description:** Include `role` in list query keys and forward it through `useProviders`. Upsert/delete must invalidate the provider-list key family rather than leave filtered caches stale; delete must not overwrite a filtered cache with an unqualified response.

**Acceptance criteria:**
- [ ] `providerKeys.list('all' | 'source' | 'target')` creates distinct stable keys.
- [ ] `useProviders()` uses `all`, while an explicit role reaches both the key and fetcher.
- [ ] Successful submit/delete invalidates every provider list variant.

**Verification:**
- [ ] Query-key, hook and mutation tests pass.
- [ ] A test proves `source` and `target` responses do not share cache data.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/providers-connectors/providers/api/providerQueryKeys.ts`
- `src/features/providers-connectors/providers/api/providerQueryKeys.test.ts`
- `src/features/providers-connectors/providers/hooks/useProviders.ts`
- `src/features/providers-connectors/providers/hooks/useProviders.test.tsx`
- `src/features/providers-connectors/providers/hooks/useUpsertProvider.ts`
- `src/features/providers-connectors/providers/hooks/useDeleteProvider.ts`

**Estimated scope:** Medium (6 small files)

## Checkpoint: Provider data foundation

- [ ] Provider API contract tests pass.
- [ ] Query cache tests pass for all three filters.
- [ ] No production UI changes have been introduced before the contract is stable.

## Task 4: Enforce source semantics in existing provider selectors

**Description:** Update helpers whose contract explicitly says “source” so a target VMware provider is not exposed as a discovery/recovery source merely because its type matches.

**Acceptance criteria:**
- [ ] Recovery Application source-provider options exclude `role: target`.
- [ ] Recovery Group resource-type availability ignores target-only provider types.
- [ ] Discovery resource tabs and infrastructure source selection exclude target providers.

**Verification:**
- [ ] Each affected helper has a test containing both a source and target provider of the same type.
- [ ] Existing behavior for source VMware, FlashSystem and IBM Power providers remains unchanged.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/utils/eligibleProviders.ts`
- `src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.ts`
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`
- `src/features/discovery-inventory/infrastructure/model/infrastructureSourceSelection.ts`
- Corresponding colocated test files

**Estimated scope:** Medium (4 implementation files plus focused tests)

## Task 5: Extend the provider create/edit form and submit mapping

**Description:** Add required role selection and optional FlashCopy/orchestrator connection fields to the existing form. Populate edit values, include them in dirty-state detection and map blank optional inputs to omitted request properties.

**Acceptance criteria:**
- [ ] Create/edit form contains `role`, `defaultFlashcopyProviderId` and `orchestratorConnId` using shared form controls.
- [ ] Role is required and restricted to Source/Target.
- [ ] Edit mode pre-fills all returned values; the submit body preserves populated values and omits blank optional IDs.

**Verification:**
- [ ] Form test verifies accessible labels/options and required role validation.
- [ ] Modal test verifies exact create and update payloads, including optional-field omission.
- [ ] Manual check verifies a missing current FlashCopy reference remains visible in edit mode rather than being silently discarded.

**Dependencies:** Tasks 1 and 3

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`
- `src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 6: Display role in the catalogue and connection IDs in provider details

**Description:** Add a concise role column to the existing shared data-table composition and render all new metadata in both detail surfaces, using `-` for absent optional values.

**Acceptance criteria:**
- [ ] Provider table visibly distinguishes Source and Target rows and its skeleton/column count is updated.
- [ ] Detail drawer shows role, default FlashCopy provider ID and orchestrator connection ID.
- [ ] Standalone provider detail page shows the same data consistently.

**Verification:**
- [ ] Catalogue test verifies role cells and detail-drawer values.
- [ ] Detail-page test verifies populated and missing optional IDs.
- [ ] English, Slovak and Czech translation JSON remains valid and contains all new labels/options.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.tsx`
- `src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx`
- `src/locales/en.json`, `src/locales/sk.json`, `src/locales/cs.json`

**Estimated scope:** Medium (4 code/test files plus locale entries)

## Checkpoint: Provider feature end to end

- [ ] `GET` supports `all/source/target` without cache collisions.
- [ ] Provider create and edit submit the extended contract.
- [ ] Role appears in the table and all new metadata appears in details.
- [ ] Target providers are excluded from source-only selectors.

## Task 7: Start new Recovery Applications with one tier

**Description:** Replace the four-tier default map with a single `database` tier while preserving all tiers supplied through edit `initialData` and retaining the existing add/delete/reorder flow.

**Acceptance criteria:**
- [ ] A new Recovery Application renders exactly one default tier with order `1`.
- [ ] The last remaining tier cannot be deleted, but additional tiers can still be added.
- [ ] Editing an application preserves every backend-provided tier unchanged.

**Verification:**
- [ ] `npm test -- src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`

**Dependencies:** None

**Files likely touched:**
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (2 files)

## Task 8: Remove the desktop wizard sidebar scrollbar

**Description:** Widen the Recovery Application wizard navigation and constrain desktop step items so their content fits without horizontal overflow. Preserve the existing horizontal mobile step navigation.

**Acceptance criteria:**
- [ ] At desktop breakpoints, “Recovery groups & tiers” is fully visible with no horizontal scrollbar.
- [ ] Main content still uses remaining width and does not overflow the page.
- [ ] On narrow screens the existing horizontal step navigation remains usable.

**Verification:**
- [ ] Shared `WizardSteps` test covers responsive overflow classes/behavior without changing accessible navigation.
- [ ] Recovery builder component test confirms the wider desktop grid contract.
- [ ] Manual browser check at 1280, 1440 and 1920 px plus a mobile viewport confirms no regression.

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/wizard-steps/WizardSteps.tsx`
- `src/shared/components/wizard-steps/WizardSteps.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Medium (4 files)

## Task 9: Migrate provider fixtures and run cross-feature regression checks

**Description:** Add the now-required role to inline provider fixtures across discovery, recovery and provider tests, then run repository-wide checks to catch every consumer of `ProviderRecord`.

**Acceptance criteria:**
- [ ] Every typed provider fixture has an intentional source/target role.
- [ ] No fixture bypasses the stricter contract with unsafe casts.
- [ ] All provider, discovery and recovery flows compile with the updated record type.

**Verification:**
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`

**Dependencies:** Tasks 1-8

**Files likely touched:**
- Colocated provider fixtures in `src/features/providers-connectors/providers/**/*.test.*`
- Colocated provider fixtures in `src/features/discovery-inventory/**/*.test.*`
- Colocated provider fixtures in `src/features/recovery-plans/**/*.test.*`

**Estimated scope:** Medium (mechanical test-data migration across multiple files)

## Final checkpoint

- [ ] Full test suite, lint, typecheck and production build pass.
- [ ] Network inspection confirms `GET /get_providers?role=all` by default and correct explicit role serialization.
- [ ] Create and edit provider requests match the backend submit contract exactly.
- [ ] Source-only screens do not display target providers.
- [ ] Recovery Application wizard opens with one tier and has no desktop horizontal sidebar scrollbar.
- [ ] Changes are left uncommitted unless the user separately requests a commit.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Requiring `role` breaks many inline provider fixtures | Medium | Make the contract strict first, then migrate fixtures feature-by-feature and use typecheck as the exhaustive list. |
| Filtered React Query results overwrite each other | High | Put role in every list key and invalidate the list-key family after mutations. |
| Target providers remain selectable in a source flow | High | Add explicit `role === 'source'` checks to every existing source helper and test mixed-role input. |
| Optional IDs are sent as empty strings | Medium | Normalize trimmed empty values to `undefined` before schema parsing/serialization and assert the exact JSON body. |
| Desktop scrollbar fix degrades mobile navigation | Medium | Scope overflow changes to `lg:` and verify mobile plus desktop viewports. |
| `defaultFlashcopyProviderId` references a provider not present in the current list | Low | Preserve the current value as an unavailable edit option so saving unrelated fields cannot erase it. |

## Open question before implementation

- Confirm whether the one default tier should remain the current first tier `database`. This plan assumes yes; if a neutral `tier_1` is required, only Task 7 and its expected labels change.

