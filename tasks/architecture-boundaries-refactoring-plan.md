# Implementation Plan: Feature Boundaries and Duplication Reduction

## Overview

This plan turns the current feature-oriented folder layout into enforceable module
boundaries without changing product behavior. It removes the `shared -> feature`
dependency, breaks the circular dependencies between provider, platform-provider,
discovery, and recovery code, introduces small use-case-oriented public interfaces,
and consolidates the clearest workflow and page duplication.

The work is frontend-only. It does not change backend endpoints, Orval schemas,
provider field visibility, validation rules, routing URLs, labels, or user flows.
Generated API clients remain generated code. Every task is an independently
reviewable, verified, atomic commit on the branch selected for implementation.

## Target Specification: State After the Plan

### Observable product behavior

- Existing routes, page labels, provider/recovery workflows, query parameters,
  loading states, error states, and API payloads behave as before.
- Resources and Resources ISE remain separate page components with independent
  mount, state, and query lifecycles. They share only pure role-neutral helpers
  and types that cannot introduce remount flicker during route transitions.
- Create and edit pages, and the three policy modal variants, retain their current
  confirmation, dirty-state, submit, reset, and error behavior.
- No platform-provider field is added or removed by this plan. Field coverage
  against Orval schemas remains a separate product change.

### Module boundaries

- `src/shared/**` contains only application-agnostic primitives and has zero
  imports from `src/features/**`.
- A feature may consume another feature only through that feature's explicit
  `public.ts` interface; direct imports of its hooks, models, helpers, components,
  or API files are forbidden.
- Public interfaces export domain/use-case contracts, not broad wildcard barrels.
- The feature dependency graph is acyclic. App routing/composition may depend on
  several features, but feature implementations do not import app composition.
- Recovery builders consume local recovery-facing catalog hooks instead of
  assembling provider, platform-provider, discovery, and policy queries directly.
- Recovery transport and mapping functions accept recovery-owned input types;
  they do not expose `ProviderRecord` or other foreign implementation models.

### Duplication and ownership

- `PolicySetPicker` is owned by `recovery-plans/policy-sets`, not `shared`.
- Source and target resource inventory pages remain independently rendered
  features. Only deterministic tab selection, provider-role filtering, and related
  types are shared; React state, queries, and page rendering remain page-owned.
- Recovery group create/edit pages share one editor-session hook; recovery
  application create/edit pages share a separate editor-session hook.
- Snapshot, clean-room, and application-recovery policy modals share one local
  modal-session primitive while retaining their domain-specific forms and payloads.
- Route path, navigation label/key, module ownership, and placeholder metadata
  have one typed registry. `AppRoutes` only maps that registry to route elements.

### Automated safeguards

- A repository architecture check fails when shared imports a feature, a
  cross-feature import bypasses `public.ts`, or a new feature dependency cycle is
  introduced.
- Focused unit tests cover each extracted interface/session/page primitive.
- Existing React Query keys, invalidation behavior, and generated API integration
  are unchanged and remain covered by focused regression tests.

## Architecture Decisions

1. **Use explicit `public.ts` contracts.** A named public surface is easier to
   review and enforce than unrestricted feature barrels. It exports only stable
   types and use cases needed by consumers.
2. **Keep composition at the highest owner.** Cross-domain data required by a
   recovery flow is assembled behind a recovery-owned catalog hook. Route-level
   composition connects independent feature pages where dependency injection is
   required.
3. **Preserve generated transport boundaries.** Orval output stays behind current
   API adapters and mappers. Refactoring generated files would create churn and
   would be overwritten on regeneration.
4. **Extract repeated policy, not repeated markup.** Shared lifecycle/state logic
   is extracted only where three variants enforce the same rules. Domain forms and
   payload mapping stay local.
5. **Add enforcement after migration.** The architecture check lands after the
   current violations are removed, avoiding a permanent allowlist of known debt.
6. **Preserve resource page lifecycles.** Do not introduce a role-configured shared
   page component. That shape previously caused visible remount flicker and
   non-smooth source/target transitions. Share only pure functions and types.
7. **Use app composition for integration data.** A feature that needs data owned by
   another feature receives it through a typed app-owned composition boundary. In
   particular, VMware tag choices are passed into provider creation rather than
   imported by the provider feature from discovery.
8. **Enforce the agreed boundary in CI.** `public.ts` is the only permitted
   cross-feature import convention. The architecture check is both an explicit
   local npm command and a required GitLab CI quality gate.

## Execution Prerequisite: Complete Import Inventory

Before the first production migration, record every current cross-feature import
and its owning migration task in
`tasks/architecture-boundaries-import-inventory.md`. The initial audit found 58
production cross-feature imports and 27 test mocks; the inventory is complete only
when each of them is assigned to a bounded task. It must include the presently
unplanned discovery-to-recovery boundary (`discovery-inventory/public.ts`) and
split any migration that would touch more than five files.

This prerequisite prevents a partial migration from making the final architecture
guard fail on legitimate but unplanned consumers. It is a planning gate, not a
production-code task, and must be reviewed before Task 1 starts.

## Dependency Graph

```text
T1 Policy picker ownership
 |
 +--> T2 Remove old shared picker

T3 Provider public contract
 |\
 | +--> T4 Resource consumers
 | +--> T5 Remove provider reverse dependencies
 |
 +--> T6 Platform-provider public contract
       |
       +--> T7 Recovery provider catalog
             |
             +--> T8 Recovery transport boundary

T4 --> T9 Shared pure resource-page logic

T7 --> T10 Recovery-group editor session
T7 --> T11 Recovery-application editor session

T1 --> T12 Policy modal session

T3 + T6 --> T13 Typed route/navigation registry

T2 + T5 + T8 + T9 + T10 + T11 + T12 + T13 --> T14 Architecture guard
```

Tasks 1 and 3 may start independently. Tasks 9, 10, 11, and 12 may proceed in
parallel once their listed dependencies are complete. Task 14 is the final gate.

## Task List

### Phase 1: Correct ownership and define provider seams

#### Task 1: Establish feature-owned policy-set picker

**Description:** Add the policy-set picker under the policy-set feature and switch
the recovery-group consumer to the new feature-owned path while keeping the old
module temporarily available for the other consumer.

**Acceptance criteria:**

- [ ] The new picker preserves current selection, details, empty, and loading behavior.
- [ ] The recovery-group flow imports only the feature-owned picker.
- [ ] Existing policy-set picker and recovery-group focused tests pass.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetPicker.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/components/PolicySetPicker.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetPickerDetails.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetPickerList.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetPicker.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupPolicySetStep.tsx`

**Estimated scope:** M (5 files)

#### Task 2: Remove the shared policy-set compatibility path

**Description:** Switch the remaining recovery-application consumer and remove the
obsolete shared implementation so that `shared` no longer owns recovery behavior.

**Acceptance criteria:**

- [ ] All picker consumers use the policy-set feature path.
- [ ] `src/shared/components/policy-set-picker` no longer exists.
- [ ] A static search finds no `shared -> features` import.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetPicker.test.tsx`
- [ ] `rg "@/features/" src/shared` returns no matches.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/shared/components/policy-set-picker/PolicySetPicker.tsx`
- `src/shared/components/policy-set-picker/PolicySetPickerDetails.tsx`
- `src/shared/components/policy-set-picker/PolicySetPickerList.tsx`
- `src/shared/components/policy-set-picker/PolicySetPicker.test.tsx`

**Estimated scope:** M (5 files)

#### Task 3: Define the infrastructure-provider public contract

**Description:** Introduce a curated provider interface containing the stable query
and read model required by other features. Keep provider API mapping and mutations
private.

**Acceptance criteria:**

- [ ] The contract exposes only consumer-needed provider reads and types.
- [ ] Provider query keys and returned runtime values remain unchanged.
- [ ] Contract tests prove the public query delegates to the existing implementation.

**Verification:**

- [ ] `npm exec vitest run src/features/providers-connectors/providers/public.test.tsx src/features/providers-connectors/providers/hooks/useProviders.test.tsx`
- [ ] `npm exec eslint -- src/features/providers-connectors/providers/public.ts src/features/providers-connectors/providers/public.test.tsx`

**Dependencies:** None

**Files likely touched:**

- `src/features/providers-connectors/providers/public.ts`
- `src/features/providers-connectors/providers/public.test.tsx`
- `src/features/providers-connectors/providers/hooks/useProviders.ts`

**Estimated scope:** M (3 files)

### Checkpoint A: Ownership and first contract

- [ ] Tasks 1-3 acceptance criteria and focused tests pass together.
- [ ] `shared` has no feature dependency.
- [ ] Review public provider exports before migrating consumers.
- [ ] Each task is a separate atomic commit.

### Phase 2: Break provider/platform/discovery cycles

#### Task 4: Move resource pages onto the provider public contract

**Description:** Replace direct provider hook/model imports in both resource role
pages with the stable provider contract, including their test mocks.

**Acceptance criteria:**

- [ ] Source and target resource pages import providers only through `public.ts`.
- [ ] Provider loading, empty, error, refresh, and tab behavior is unchanged.
- [ ] Tests no longer mock the internal `useProviders` path.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`
- [ ] `rg "providers/(hooks|model|api|utils)" src/features/discovery-inventory` returns no in-scope matches.

**Dependencies:** Task 3

**Files likely touched:**

- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx`

**Estimated scope:** M (4 files)

#### Task 5: Remove provider-to-discovery and provider-to-platform imports

**Description:** Make provider creation receive discovery tag data through a typed
input at its composition boundary, and move mixed provider eligibility rules to the
consumer that owns that decision. This removes both reverse dependency edges from
the provider feature.

**Acceptance criteria:**

- [ ] Provider components contain no discovery or platform-administration imports.
- [ ] VMware tag choices and credential-status filtering behave as before.
- [ ] Focused provider modal tests cover injected data and empty data.

**Verification:**

- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [ ] `rg "@/features/(discovery-inventory|platform-administration)" src/features/providers-connectors` returns no matches.

**Dependencies:** Task 3

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- `src/features/providers-connectors/providers/utils/credentialStatusChecks.ts`
- `src/features/providers-connectors/providers/pages/ProvidersPage.tsx`
- `src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx`

**Estimated scope:** M (5 files)

#### Task 6: Define the platform-provider public contract

**Description:** Add a curated platform-provider read contract and a platform-owned
credential/eligibility projection. Consumers no longer depend on platform hook or
model internals.

**Acceptance criteria:**

- [ ] Public exports cover only read/catalog use cases needed by recovery flows.
- [ ] Supported provider types and credential status semantics remain unchanged.
- [ ] Public contract tests cover mapping and filtering behavior.

**Verification:**

- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/public.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** Task 3

**Files likely touched:**

- `src/features/platform-administration/platform-providers/public.ts`
- `src/features/platform-administration/platform-providers/public.test.tsx`
- `src/features/platform-administration/platform-providers/hooks/usePlatformProviders.ts`
- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`

**Estimated scope:** M (4 files)

### Checkpoint B: Acyclic provider foundation

- [ ] Tasks 4-6 focused tests pass together.
- [ ] Provider and platform-provider public surfaces are human-reviewed.
- [ ] Static import inspection shows no provider reverse edge to discovery/platform.
- [ ] Existing React Query keys and network calls are unchanged.

### Phase 3: Deepen the recovery boundary

#### Task 7: Introduce a recovery-owned provider catalog

**Description:** Add a recovery hook that composes infrastructure providers,
platform providers, policy sets, and credential eligibility behind one recovery
use-case interface. Switch `RecoveryGroupBuilder` to this local interface.

**Acceptance criteria:**

- [ ] The builder imports no foreign feature internals.
- [ ] Source-role, edit-mode, credential, and orchestration eligibility are unchanged.
- [ ] Tests mock the recovery catalog instead of three foreign hooks.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryProviderCatalog.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** Tasks 3 and 6

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryProviderCatalog.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryProviderCatalog.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Estimated scope:** M (4 files)

#### Task 8: Make recovery-group transport recovery-owned

**Description:** Replace `ProviderRecord[]` at the recovery API/mapping boundary with
a minimal recovery-owned provider lookup. Preserve payload and response mapping.

**Acceptance criteria:**

- [ ] Recovery API and mapper signatures expose no foreign feature model.
- [ ] Existing backend request URLs/payloads and mapped recovery groups are identical.
- [ ] Mapper and API regression tests cover missing and known provider lookups.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`
- [ ] `rg "ProviderRecord" src/features/recovery-plans/recovery-groups/api src/features/recovery-plans/recovery-groups/helpers` returns no matches.

**Dependencies:** Task 7

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/model/recoveryProviderLookup.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`

**Estimated scope:** M (5 files)

### Checkpoint C: Recovery integration boundary

- [ ] Tasks 7-8 focused tests pass together.
- [ ] Recovery builders and transport use recovery-owned contracts.
- [ ] Query enablement, cache keys, invalidation, and mapped output are unchanged.
- [ ] Review confirms the new catalog is a use-case API, not a re-export barrel.

### Phase 4: Consolidate high-value duplication

#### Task 9: Share pure resource-page logic without merging page components

**Description:** Keep `ResourcesPage` and `ResourcesIsePage` as separate rendered
features with independent component lifecycles. Extract only deterministic,
side-effect-free provider-role filtering and active-tab resolution that both pages
already implement. Do not extract a shared page component or stateful page hook.

**Acceptance criteria:**

- [ ] Both pages remain separate components that own their queries, local state,
      URL synchronization, loading/error states, and resource rendering.
- [ ] Shared helpers are pure and preserve existing source/target tab selection.
- [ ] Route transitions have no new loading/empty flash or remount regression.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/pages/ResourcesPage.test.tsx src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.test.tsx src/features/discovery-inventory/resources/helpers/resolveResourcePageState.test.ts`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`
- [ ] Browser check: switch repeatedly between Resources and Resources ISE and
      confirm that content does not flash through loading/empty state.

**Dependencies:** Task 4

**Files likely touched:**

- `src/features/discovery-inventory/resources/helpers/resolveResourcePageState.ts`
- `src/features/discovery-inventory/resources/helpers/resolveResourcePageState.test.ts`
- `src/features/discovery-inventory/resources/pages/ResourcesPage.tsx`
- `src/features/discovery-inventory/resources-ise/pages/ResourcesIsePage.tsx`

**Estimated scope:** M (4 files)

#### Task 10: Extract the recovery-group editor session

**Description:** Move shared create/edit dirty guard, save lifecycle, navigation,
and orchestration-success state into one recovery-group hook used by both pages.

**Acceptance criteria:**

- [ ] Create and edit pages use the same session contract.
- [ ] Cancel, unsaved-change confirmation, successful save, and failure behavior match current tests.
- [ ] Page components retain only route data and rendering responsibilities.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupEditorSession.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** Task 7

**Files likely touched:**

- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupEditorSession.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupEditorSession.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.tsx`

**Estimated scope:** M (4 files)

#### Task 11: Extract the recovery-application editor session

**Description:** Apply the same page-level separation within recovery applications,
without sharing a generic hook across different recovery domains.

**Acceptance criteria:**

- [ ] Application create/edit pages use one application-owned session contract.
- [ ] Dirty guard, save, navigation, and orchestration-success behavior is unchanged.
- [ ] Existing page tests plus the new hook test cover both modes.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationEditorSession.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** Task 7

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationEditorSession.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationEditorSession.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`

**Estimated scope:** M (4 files)

### Checkpoint D: Page/workflow consolidation

- [ ] Tasks 9-11 focused tests pass together.
- [ ] Manual smoke check covers source/target resources and create/edit recovery flows.
- [ ] No route, query-string, or payload snapshot changes are accepted without review.
- [ ] Each extraction reduced duplication without creating a cross-domain generic abstraction.

#### Task 12: Extract the policy modal lifecycle

**Description:** Add a recovery-policy-local session primitive for dirty tracking,
reset, submit/error state, close confirmation, and successful close. Keep each
policy form and mapper domain-specific.

**Acceptance criteria:**

- [ ] All three policy modal variants use the same lifecycle contract.
- [ ] Each modal preserves its current payload, labels, validation, and close behavior.
- [ ] Session tests cover clean close, dirty cancel, submit failure, and submit success.

**Verification:**

- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/hooks/usePolicyModalSession.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPolicyModal.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.test.tsx`
- [ ] `npm exec eslint -- <changed TypeScript/TSX files>`

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/recovery-policies/hooks/usePolicyModalSession.ts`
- `src/features/recovery-plans/recovery-policies/hooks/usePolicyModalSession.test.tsx`
- `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPolicyModal.tsx`
- `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPolicyModal.tsx`
- `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPolicyModal.tsx`

**Estimated scope:** M (5 files)

#### Task 13: Introduce one typed route and navigation registry

**Description:** Make one app-owned registry authoritative for paths, navigation
keys/labels, module ownership, and placeholder configuration. Keep lazy component
loading explicit and type-safe.

**Acceptance criteria:**

- [ ] A route/nav item is declared once and consumed by routes and sidebar.
- [ ] Existing URLs, redirects, active navigation, and lazy-loading behavior remain unchanged.
- [ ] Route and sidebar tests cover registry consistency and unknown paths.

**Verification:**

- [ ] `npm exec vitest run src/app/AppRoutes.test.tsx src/layouts/app-shell/AppSidebar.test.tsx src/app/routeRegistry.test.ts`
- [ ] `npm exec eslint -- src/app/AppRoutes.tsx src/app/routes.ts src/app/modulePageConfigs.ts src/app/routeRegistry.ts src/layouts/app-shell/AppSidebar.tsx`

**Dependencies:** Tasks 3 and 6

**Files likely touched:**

- `src/app/routeRegistry.ts`
- `src/app/routeRegistry.test.ts`
- `src/app/AppRoutes.tsx`
- `src/app/routes.ts`
- `src/layouts/app-shell/AppSidebar.tsx`

**Estimated scope:** M (5 files)

### Checkpoint E: Consolidated app structure

- [ ] Tasks 12-13 focused tests pass together.
- [ ] Snapshot/clean-room/application policy CRUD receives a manual smoke check.
- [ ] Every existing route opens and highlights the same sidebar item as before.
- [ ] `modulePageConfigs.ts` is removed or reduced to registry-owned data in Task 13's commit.

### Phase 5: Enforce the architecture

#### Task 14: Add the architecture dependency guard

**Description:** Add a small static import-graph check and repository command. It
rejects `shared -> feature`, non-public cross-feature imports, and cycles. Run it in
the existing CI quality path without changing production build output.

**Acceptance criteria:**

- [ ] The check passes on the migrated tree with no debt allowlist.
- [ ] Fixtures prove each forbidden dependency class fails with an actionable message.
- [ ] The focused CI/local command is documented and invoked by the quality pipeline.

**Verification:**

- [ ] `npm run architecture:check`
- [ ] `npm exec vitest run scripts/check-architecture.test.ts`
- [ ] Run the repository's affected CI configuration validation and `git diff --check`.

**Dependencies:** Tasks 2, 5, 8, 9, 10, 11, 12, and 13

**Files likely touched:**

- `scripts/check-architecture.mjs`
- `scripts/check-architecture.test.ts`
- `package.json`
- `.gitlab-ci.yml`
- `README.md`

**Estimated scope:** M (5 files)

### Final Checkpoint

- [ ] `npm run architecture:check` reports zero violations and zero cycles.
- [ ] All task-specific Vitest files pass in one focused combined run.
- [ ] Changed TypeScript/TSX files pass ESLint; affected locale/config files parse.
- [ ] Typecheck passes because public contracts and route registry cross module boundaries.
- [ ] Manual smoke verification covers flicker-free transitions between both
      resource roles, provider creation,
      recovery group/application create+edit, policy modal cancel+save, and navigation.
- [ ] Network comparison confirms unchanged endpoints, query keys, request payloads,
      invalidation, and first-load query enablement.
- [ ] Each task has its own reviewed commit; unrelated worktree changes are excluded.
- [ ] The complete test suite/build is run only if focused verification exposes a
      cross-cutting failure or a reviewer requests it.

## Definition of Done for Every Implementation Task

- Acceptance criteria are demonstrated by focused automated tests or a named manual check.
- Changed files pass focused lint/type validation appropriate to their contract.
- `git diff --check`, unstaged/staged diff inspection, and secret inspection pass.
- No generated API file is hand-edited.
- The task is committed atomically with only in-scope files.
- The next checkpoint is not started until the previous checkpoint is reviewed.

The shared skill reference `../../references/definition-of-done.md` is absent in
this environment, so this section applies the stricter repository rules from
`AGENTS.md` directly.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Public files become shallow re-export barrels | High | Export only consumer use cases/types; review contracts at Checkpoints A-C |
| Import moves break test mocks while runtime code still works | High | Migrate production imports and their focused mocks in the same task |
| Query keys or enablement change during hook extraction | High | Assert key/invalidation/first-request behavior before and after |
| Shared resource abstraction reintroduces transition flicker | High | Keep both page components and their lifecycles separate; share pure helpers only |
| Generic workflow hook mixes recovery domains | Medium | Keep separate group, application, and policy session primitives |
| Route registry changes URL or lazy-loading semantics | High | Snapshot paths/redirects and test navigation highlighting before removal |
| Architecture script has false positives | Medium | Fixture tests, actionable output, explicit parsing scope, no generated files |
| Large migration conflicts with concurrent feature work | Medium | Small atomic tasks, checkpoint merges, no broad formatting/refactoring |
| Scope drifts into provider field redesign | Medium | Treat Orval/UI field completeness as a separate product plan |

## Approved Decisions — 2026-09-01

- The implementation remains behavior-preserving; platform-provider field
  completeness is a separate follow-up.
- `public.ts` is the sole cross-feature import convention; `index.ts` is not an
  alternative public boundary.
- App composition owns injection of cross-feature integration data, including
  VMware tag choices for provider creation.
- The architecture check runs as an explicit local npm command and in GitLab CI;
  it is not added as a pre-commit hook.

Implementation may start only after the import inventory prerequisite above is
reviewed and its bounded migration tasks are added to this plan and checklist.
