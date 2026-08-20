# Implementation Plan: Provider VM Prefix and Provider-Scoped VM Tags

Status: Implemented and verified on the current branch. The focused suite
passed (10 files, 74 tests), TypeScript validation, focused lint, OpenAPI
generation checks, and `git diff --check` passed. Manual browser verification
was not available in this agent session.

## Overview

Implement GitHub issue #3 by preserving `vmPrefix` and `vmTags` through both
provider API boundaries and exposing them in the infrastructure-provider and
platform-provider forms. Existing VMware providers load tag choices from
`GET /tags?provider_id=<id>`. Create mode, non-VMware providers, and platform
providers do not fetch tag choices. Empty values submit as `vmPrefix: null` and
`vmTags: []`.

## Architecture Decisions

- Generated OpenAPI files remain generator-owned; local types, Zod schemas,
  API adapters, and forms explicitly preserve the new fields.
- Implement approved option 2: VM tag choices are unavailable during provider
  creation and become available only when editing a persisted VMware provider.
- Scope the React Query tag cache by provider ID. `X-User` remains the shared
  API client's responsibility.
- Platform and non-VMware providers never query `/tags`; saved tags still
  render and can be removed.
- Extend the shared multi-select so selected values missing from `options`
  remain visible, removable, unique, and accessible. Add disabled behavior.
- Blank prefix normalizes to `null`; no tags normalizes to `[]`.

## Dependency Graph

```text
Generated OpenAPI contract
  +-- Infrastructure local contract --+-- Provider modal
  |                                    |
  +-- Provider-scoped tags API/cache --+
  |
  +-- Platform local contract ----------+-- Platform modal
  |
  +-- Shared MultiSelectDropdown --------+-- Both forms
```

## Task 1: Infrastructure-provider API contract

**Description:** Preserve VM settings through infrastructure-provider domain
types, Zod validation, GET mapping, and POST serialization.

**Acceptance criteria:**

- [ ] Records and submit data model nullable `vmPrefix` and string-array `vmTags`.
- [ ] GET and POST preserve populated values.
- [ ] Clearing sends exactly `vmPrefix: null` and `vmTags: []`.

**Verification:**

- [ ] `npm exec vitest run src/features/providers-connectors/providers/api/providersApi.test.ts`
- [ ] Focused lint for changed model/schema/API/test files.

**Dependencies:** None

**Files likely touched:**

- `src/features/providers-connectors/providers/model/providerTypes.ts`
- `src/features/providers-connectors/providers/api/schemas/providersSchema.ts`
- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Medium (4 files)

## Task 2: Provider-scoped tags API

**Description:** Require a provider ID in the existing VMware tags adapter and
pass it to the generated `/tags` client while retaining response validation.

**Acceptance criteria:**

- [ ] Requests send the intended `provider_id`.
- [ ] Validated tag records map to unique names in stable response order.
- [ ] Existing stable error behavior remains intact.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/api/vmwareTagsApi.test.ts`
- [ ] Focused lint for the tag API and test.

**Dependencies:** None

**Files likely touched:**

- `src/features/discovery-inventory/resources/api/vmwareTagsApi.ts`
- `src/features/discovery-inventory/resources/api/vmwareTagsApi.test.ts`

**Estimated scope:** Small (2 files)

## Task 3: Provider-scoped tag cache

**Description:** Include provider ID in tag query keys and hook parameters.
Update the existing Resources caller to pass its selected VMware provider ID.

**Acceptance criteria:**

- [ ] Different providers produce different tag cache keys.
- [ ] The hook passes provider ID to the API and can be disabled.
- [ ] Disabled queries issue no request; fresh same-provider data is reused.

**Verification:**

- [ ] `npm exec vitest run src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts src/features/discovery-inventory/resources/hooks/useVmwareTags.test.tsx`
- [ ] `npm run typecheck`
- [ ] Focused lint for changed query/hook/Resources files.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`
- `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.test.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareTags.ts`
- `src/features/discovery-inventory/resources/hooks/useVmwareTags.test.tsx`
- `src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.tsx`

**Estimated scope:** Medium (5 files)

## Checkpoint: Data foundation

- [ ] Run Tasks 1-3 focused tests together.
- [ ] Run `npm run typecheck`.
- [ ] Confirm no `/tags` request can occur without an explicit provider ID.
- [ ] Review the diff before shared UI work.

## Task 4: Shared multi-select behavior

**Description:** Make the shared multi-select suitable for persisted provider
values and disabled create mode.

**Acceptance criteria:**

- [ ] Selected values absent from `options` remain visible and removable.
- [ ] Options/selections cannot produce duplicates.
- [ ] Disabled state blocks opening, selection, and removal with accessible semantics.

**Verification:**

- [ ] `npm exec vitest run src/shared/components/form/MultiSelectDropdown.test.tsx`
- [ ] Focused lint for the component and test.
- [ ] Keyboard and labelled-control behavior is covered through user interactions.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/form/MultiSelectDropdown.tsx`
- `src/shared/components/form/MultiSelectDropdown.test.tsx`

**Estimated scope:** Small (2 files)

## Task 5: Infrastructure-provider form layout

**Description:** Add VM prefix and VM tags to the presentational provider form
and apply the approved responsive field order.

**Acceptance criteria:**

- [ ] VM prefix and VM tags share the row formerly occupied by URL.
- [ ] URL and orchestrator connection ID share the final field row.
- [ ] The form exposes prefix/tag changes plus tag loading, error, and disabled state.

**Verification:**

- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- [ ] Focused lint for the form, test, and locale files.
- [ ] Manual narrow-width check confirms paired rows stack cleanly.

**Dependencies:** Task 4

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProviderCreateForm.tsx`
- `src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx`
- `src/locales/en.json`
- `src/locales/cs.json`
- `src/locales/sk.json`

**Estimated scope:** Medium (5 files)

## Task 6: Infrastructure-provider modal integration

**Description:** Add VM settings to modal initialization, prefilling, reset,
dirty state, and submit behavior. Fetch tags only while editing an existing
VMware provider.

**Acceptance criteria:**

- [ ] Edit mode prefills/submits both fields and clearing sends `null`/`[]`.
- [ ] Only persisted VMware edit mode enables `/tags?provider_id=<locked-id>`.
- [ ] Create/non-VMware mode offers no fetched options; failures preserve saved tags and unrelated editing.

**Verification:**

- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- [ ] Focused lint for the modal and test.
- [ ] Manual create, VMware edit, non-VMware edit, error, and dirty-close checks.

**Dependencies:** Tasks 1, 3, and 5

**Files likely touched:**

- `src/features/providers-connectors/providers/components/ProvidersCreateModal.tsx`
- `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`

**Estimated scope:** Small (2 files)

## Checkpoint: Infrastructure-provider slice

- [ ] Run Tasks 1-6 focused tests together.
- [ ] Run `npm run typecheck` and focused lint for all changed files.
- [ ] Manually verify option 2 and the approved responsive layout.

## Task 7: Platform-provider API contract

**Description:** Preserve VM settings through platform-provider types,
validation, GET/write mapping, and POST serialization without adding a tags
inventory dependency.

**Acceptance criteria:**

- [ ] Platform records and submit data model both fields.
- [ ] GET/write responses and POST preserve populated values.
- [ ] Clearing sends `vmPrefix: null` and `vmTags: []`.

**Verification:**

- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`
- [ ] Focused lint for changed platform model/schema/API/test files.

**Dependencies:** None

**Files likely touched:**

- `src/features/platform-administration/platform-providers/model/platformProviderTypes.ts`
- `src/features/platform-administration/platform-providers/api/schemas/platformProvidersSchema.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`

**Estimated scope:** Medium (4 files)

## Task 8: Platform-provider form layout

**Description:** Widen and reorganize the platform form to match the provider
form's responsive visual language. Add VM prefix and the shared multi-select
with no fetched options.

**Acceptance criteria:**

- [ ] ID/name, IP/port, and VM prefix/VM tags use paired responsive rows.
- [ ] Existing URL, DAG directory, and credential fields remain; no infrastructure-only fields are added.
- [ ] Persisted platform tags render as removable chips with empty `options`.

**Verification:**

- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`
- [ ] Focused lint for the form and test.
- [ ] Manual desktop/narrow responsive check.

**Dependencies:** Task 4

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProviderForm.test.tsx`

**Estimated scope:** Small (2 files)

## Task 9: Platform-provider modal integration

**Description:** Add VM settings to platform modal state, prefilling, dirty
checks, reset, submit, and modal sizing. Never fetch VMware tags.

**Acceptance criteria:**

- [ ] Untouched create submits `vmPrefix: null` and `vmTags: []`.
- [ ] Edit prefills both fields and submits removals correctly.
- [ ] The modal uses the approved wide responsive size and performs no `/tags` request.

**Verification:**

- [ ] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`
- [ ] Focused lint for the modal and test.
- [ ] Manual create, edit, saved-tag removal, dirty-close, and failure checks.

**Dependencies:** Tasks 7 and 8

**Files likely touched:**

- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.tsx`
- `src/features/platform-administration/platform-providers/components/PlatformProvidersModal.test.tsx`

**Estimated scope:** Small (2 files)

## Final Checkpoint

- [ ] Run all focused test files listed above together.
- [ ] Run `npm run typecheck`.
- [ ] Run focused lint for all changed files.
- [ ] Run `npm run api:check` and `git diff --check`.
- [ ] Verify both responsive forms and keyboard multi-select behavior in a real browser.
- [ ] Report that the complete suite/build was not run unless later required.
- [ ] Review and commit task files atomically without unrelated changes.

## Parallelization Opportunities

- Tasks 1, 2, 4, and 7 can run in parallel with disjoint file ownership.
- Task 3 follows Task 2. Task 6 follows Tasks 1, 3, and 5.
- Task 9 follows Tasks 7 and 8.
- Infrastructure and platform UI slices can run in parallel after Task 4.
- Assign all locale files to one worker if UI tasks run concurrently.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Global cache mixes vCenter tags | High | Provider ID in every tag query key/request; test two IDs. |
| Missing options hide saved tags | High | Render selected independently from options; shared/modal tests. |
| Create uses backend default tags | High | Disable query unless editing a persisted VMware provider. |
| Local Zod strips generated fields | High | API boundary tests before UI integration. |
| Hook change breaks Resources | Medium | Update caller in Task 3 and typecheck at checkpoint. |
| Platform layout regresses responsively | Medium | Reuse provider grid/modal patterns and browser-check two widths. |

## Open Questions

- None. Issue #3 and the approved conversation define the behavior.

## Definition of Done

- [ ] Every task acceptance criterion and focused verification passes.
- [ ] Both forms preserve and submit both VM settings.
- [ ] Option 2 and provider-scoped cache behavior are enforced.
- [ ] Platform providers never fetch VMware tag options.
- [ ] Responsive/accessibility behavior is verified in a real browser.
- [ ] Focused tests, typecheck, API check, focused lint, and diff check pass.
- [ ] Full-suite/build status is reported explicitly.
- [ ] Atomic commits exclude unrelated worktree changes.
