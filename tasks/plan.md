# Implementation Plan: Orchestration Step for Recovery Group Builder

## Overview

Add an **Orchestration** step as the final step of the Recovery Group Builder
wizard, collecting two required values that are sent as **query params** on
`POST /api/submit_recovery_group`:

1. A tri-state toggle "Deploy to orchestrator" → `push_to_orchestrator`
2. A dropdown of AIRFLOW platform providers → `provider_id`

Next/Create stay disabled until both are answered. The JSON body's
`provider_id_vm` / `provider_id_volume` are untouched — those stay owned by the
Resource Type and Provider steps.

**Already landed — do not redo (commit `a499bc5`):** the read side. Zod was
silently stripping `airflow_run_id` and `push_to_orchestrator`; the schema now
declares them, `RecoveryGroup` carries `airflowRunId` / `pushToOrchestrator`, and
`mapRecoveryGroupApiRecord` maps both in **both** branches. Four covering tests
exist. Baseline: **72 tests** in recovery-groups, **606** full suite, all green.

## Architecture Decisions

### AD-1 · The toggle must be tri-state on the draft
`push_to_orchestrator` defaults to `false` server-side, so a draft field typed
`boolean` and initialised to `false` makes "user chose No" indistinguishable from
"user hasn't answered" — the required-gate could never fire, and the wizard would
ship a hidden default. Therefore `pushToOrchestrator: boolean | null` on the
draft (`null` = unanswered), narrowed to `boolean` in
`ValidatedRecoveryGroupDraft`. Validation is where nullables collapse, exactly as
`providerId` / `policySetId` already do.

### AD-2 · New draft fields are REQUIRED (`| null`, no `?`)
Declare `orchestrationProviderId: string | null` and
`pushToOrchestrator: boolean | null` **without** `?`, matching the existing
`providerId: string | null` / `policySetId: string | null`. This makes `tsc -b`
the safety net that catches every draft construction site. Declaring them
optional would let the builder's edit initializer silently drop them.

> **`exactOptionalPropertyTypes: true`** (`tsconfig.app.json:17`): any field that
> *is* optional must be written `foo?: T | undefined`, or assignment sites (the
> `updateDraft` spread, mapper returns) fail typecheck even though the
> declaration compiles. The two new fields sidestep this by being required.

### AD-3 · Query params only — never the JSON body
Build the query string in `submitRecoveryGroup`, mirroring
`recoveryApplicationsApi.ts:34-44` and the local `deleteRecoveryGroup` precedent
(`recoveryGroupsApi.ts:80-81`). Deliberately **not** added to
`RecoveryGroupSubmitPayload`: that interface is the JSON body *and* the
user-visible preview rendered by `RecoveryGroupsTable.tsx:67`
(`JSON.stringify(toRecoveryGroupJson(group), …)`), so adding them would both
violate the body contract and leak query params into the preview modal.

### AD-4 · `airflowRunId` cannot seed the provider dropdown
It is a DAG **run** id (`260805131217-6514c730`), not a provider id
(`airflow-01`) — verified against the live backend. So on **edit**:
`pushToOrchestrator` *is* restorable; `orchestrationProviderId` is **not**.
Un-mitigated, Save would be disabled on every edit of an existing group.
**Mitigation:** auto-select when exactly one eligible provider exists (true
today), via `setDraft` directly — **not** `updateDraft` — so the form isn't
marked dirty. With two or more providers the user must re-pick; the step shows a
`notRestorable` hint so that cost is visible in the UI rather than mysterious.

### AD-5 · Append the step, and replace every hardcoded index with a named constant
Create renders only on `lastStep` (`RecoveryGroupBuilder.tsx:346`), so a step
that gates Create must be last. There are two numberings today (6-step for VM
groups, 5-step for volume groups) and the indices are hardcoded across ~11 lines.
Replace `:106-108` with:

```ts
const resourcesStepIndex = 4
const relatedStorageStepIndex = 5
const policySetStepIndex = hasRelatedStorageStep ? 6 : 5
const orchestrationStepIndex = hasRelatedStorageStep ? 7 : 6
const lastStep = orchestrationStepIndex
```

Appending (not inserting) keeps the related-volume discovery gating at `:109-120`
working unchanged.

### AD-6 · The step is presentational; the builder owns the hook
Matches all four sibling steps and the `AppMetadataForm` / `RecoveryAppBuilder`
split. The builder passes an **already-filtered** list
(`type === 'AIRFLOW' && credentialStatus === 'ok'`), since it needs the same list
for `orchestrationValid`. The `selectedPlatformIsMissing` synthetic-option trick
(`AppMetadataForm.tsx:44-46`) is deliberately **not** copied — there is no stored
provider id to fall back to (AD-4).

### AD-7 · Use the working i18n keys
`AppMetadataForm.tsx:143,156` reference `providers.platform.loading` /
`providers.platform.loadFailed`, which exist in **none** of the three locale
files (verified: 0 matches in en/sk/cs) — that UI currently renders raw key
strings. Do not copy those keys. See Open Question 3.

### AD-8 · Dropdown over SelectableCard, per explicit instruction
Every sibling step selects via `SelectableCard` grids; you asked for a dropdown,
so this follows `AppMetadataForm.tsx:134-164` (`Field` + `Select`, option label
`{name} - {type}`). A deliberate inconsistency, not an accident.

---

## Task List

### Task 1 · Add the two fields to `RecoveryGroupDraft`
Declaration + every construction site, so the tree still typechecks. No behaviour
change yet.

**Files:**
- `…/model/recoveryGroupTypes.ts` — in `RecoveryGroupDraft` (after `policySetId`, line 67) add `orchestrationProviderId: string | null` and `pushToOrchestrator: boolean | null`. **Do not touch `RecoveryGroup`** (lines 48-57) — already done in `a499bc5`.
- `…/components/RecoveryGroupBuilder.tsx` — `INITIAL_DRAFT` (lines 28-40): both `null`. Edit initializer (lines 55-70): `orchestrationProviderId: null` and `pushToOrchestrator: initialData.pushToOrchestrator ?? null`.
- `…/api/recoveryGroupsApi.test.ts` — five draft literals at lines **202-214, 234-246, 264-276, 289-301, 307-319**.
- `…/hooks/useRecoveryGroups.test.tsx` — the `create({…})` literal at lines **110-120**.
- `…/pages/RecoveryGroupEditorPage.test.tsx` — the `onCreate({…})` literal at lines **57-67**.

**Acceptance criteria:**
- [ ] Both fields non-optional, typed `| null`; `RecoveryGroup` unchanged
- [ ] `npx tsc -b` clean
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups` still passes 72 tests

**Dependencies:** None · **Scope:** M (5 files, additive)

---

### Task 2 · Narrow in validation; carry onto the optimistic group

**Files:**
- `…/api/recoveryGroupsValidation.ts` — add `orchestrationProviderId: string` + `pushToOrchestrator: boolean` to `ValidatedRecoveryGroupDraft` (lines 27-38); normalize `draft.orchestrationProviderId?.trim() ?? ''`; fold `|| !orchestrationProviderId` and `|| draft.pushToOrchestrator === null` into the **existing single** `if (…) throw` guard (lines 57-72). Reuse `invalid_draft` — **no new error code**, `recoveryGroupsErrors.ts` untouched.
- `…/helpers/mapRecoveryGroups.ts` — `toRecoveryGroup` (lines 150-163): add `pushToOrchestrator: draft.pushToOrchestrator` and `airflowRunId: null` (the POST response body is never read, so no run id is knowable at create time; the real value arrives on list refetch). Leave `toRecoveryGroupSubmitPayload` / `toRecoveryGroupJson` alone (AD-3).
- `…/helpers/mapRecoveryGroups.test.ts` — the `validatedVmDraft` literal at lines **31-48** needs both fields, or lines 52, 61-71, 82 fail typecheck.

**Acceptance criteria:**
- [ ] `orchestrationProviderId` `null`/`''` → throws `invalid_draft`
- [ ] `pushToOrchestrator: null` → throws `invalid_draft` (does **not** default to `false`)
- [ ] `pushToOrchestrator: false` **is accepted** — a valid answer, distinct from `null`
- [ ] `toRecoveryGroupSubmitPayload` / `toRecoveryGroupJson` output byte-identical (existing tests at `mapRecoveryGroups.test.ts:50-90` pass untouched)

**Dependencies:** Task 1 · **Scope:** S (3 files)

---

### Task 3 · Send the query params on submit

**Files:**
- `…/api/recoveryGroupsApi.ts` — in `submitRecoveryGroup` (lines 51-66) build `new URLSearchParams({ provider_id: validated.orchestrationProviderId, push_to_orchestrator: String(validated.pushToOrchestrator) })` and append to `API_ENDPOINTS.recoveryGroups.submit`. No extra empty-string guard needed — Task 2 already guarantees a non-empty trimmed id.
- `…/api/recoveryGroupsApi.test.ts` — **breaking:** line **217** `expect(url).toBe('/api/submit_recovery_group')` (runs twice via the `it.each` at 192-195). Lines 248 and 278 destructure `[, init]` and survive. Add two cases: `push_to_orchestrator: true` in the URL; and a `null` provider rejecting with `invalid_draft` without calling `fetch`.

**Acceptance criteria:**
- [ ] URL is `/api/submit_recovery_group?provider_id=<id>&push_to_orchestrator=<bool>`
- [ ] Body still exactly `id, name, description, provider_id_vm, provider_id_volume, policy_set_id, vms, volumes` — assertions at 219-228 and 249-258 pass unchanged
- [ ] `deleteRecoveryGroup`'s URL assertion at line **330** unchanged
- [ ] The 500-status test (lines **305-320**) still reaches `fetch` (needs Task 1's fields to clear validation)

**Dependencies:** Tasks 1, 2 · **Scope:** S (2 files)

---

### Task 4 · Add i18n keys to all three locales
Flat dot-separated keys (`useTranslation.ts` resolves `translations[key] ?? key`;
a missing key renders the raw key). Tests resolve real English strings via
`mockUseTranslation`, so **these become the test selectors and must land before
Tasks 5 and 7.**

Keys under `pages.recoveryGroupBuilder.*`: `steps.orchestration`,
`orchestration.title`, `.description`, `.deployLabel`, `.deployHint`,
`.deployUnanswered`, `.deployOn`, `.deployOff`, `.providerLabel`,
`.providerPlaceholder`, `.loading`, `.loadError`, `.empty.title`,
`.empty.description`, `.notRestorable`.

**Files:** `src/locales/en.json` (insert after lines **364** and **451**), `cs.json` (same positions), `sk.json` (after **344** / **431** — offset from en/cs, so **match by key, not position**).

Drafted en/cs/sk strings are in `tasks/orchestration-step-reference.md`.

**Acceptance criteria:**
- [ ] All 15 keys present in all three files
- [ ] No `providers.platform.*` keys introduced (AD-7)

**Dependencies:** None · **Scope:** S (3 files)

---

### Task 5 · Create `RecoveryGroupOrchestrationStep`
Presentational only — no data fetching, per the four siblings.

**Props:** `platformProviders` (pre-filtered), `isLoading`, `error`, `onRetry`,
`pushToOrchestrator: boolean | null`, `selectedProviderId`,
`onPushToOrchestratorChange`, `onProviderSelect`.

**Layout:** sibling-matching header; toggle row rendering the answer as **visible
text** (`Not selected` / `Yes` / `No`) beside the switch; `Field`+`Select` picker;
`FetchErrorAlert` on error; `EmptyState` when the list is empty; a
`notRestorable` hint under the picker.

**Files:**
- `…/components/RecoveryGroupOrchestrationStep.tsx` (new)
- `…/components/RecoveryGroupOrchestrationStep.test.tsx` (new) — mock `@/hooks/useTranslation` with `@/test-utils/mockUseTranslation` (the recovery-groups convention), not the `LanguageProvider` wrapper `AppMetadataForm.test.tsx` uses.

**Acceptance criteria:**
- [ ] `getByRole('switch', { name: 'Deploy to orchestrator' })` has `aria-checked="false"` when `null`, `"true"` when `true`
- [ ] Answer text renders `Not selected` / `No` / `Yes` for `null` / `false` / `true`
- [ ] `findByRole('option', { name: 'Primary Airflow - AIRFLOW' })` resolves; selecting calls `onProviderSelect('airflow-01')`
- [ ] `isLoading` disables the Select; `error` renders the alert + working retry; `[]` renders the empty state
- [ ] Component contains **no** `usePlatformProviders` / `useQuery` call

> `src/shared/components/toggle/Toggle.tsx` exists but has **zero consumers and
> no test file** — verified. This is its first real use, so also verify its focus
> ring, dark-mode track colour, and that its `label` prop yields an acceptable
> accessible name (it renders no visible text and takes no `id` — it generates
> one via `useId`).

**Dependencies:** Task 4 · **Scope:** S (2 new files)

---

### Task 6 · Wire into the wizard and renumber every index
All in `…/components/RecoveryGroupBuilder.tsx`. **A missed index breaks the
wizard silently, and often for only one group type.**

1. Import `usePlatformProviders` + the new step
2. After line 104: `platformProvidersQuery`, `eligiblePlatformProviders` (filter AIRFLOW + `credentialStatus === 'ok'`), `orchestrationValid`
3. Replace lines **106-108** with the AD-5 named-index block; leave 109-120 alone
4. Auto-select the sole eligible provider via `setDraft` (**not** `updateDraft`) so the form isn't dirtied. `noUncheckedIndexedAccess: true` → index with `?.`
5. `steps` array (134-157): append **after** `policy-set` — array order *is* the step number, and `related-storage` is a conditional spread, so this is the only placement that keeps both numberings correct
6. **`canContinue` (159-165): add a `step === policySetStepIndex ? policySetValid` branch.** Policy Set is currently shielded only by being last; once Orchestration is last, its new Next button would be enabled by `draft.resources.length > 0` alone, letting the user skip policy-set selection
7. `canCreate` (166-177): `&& orchestrationValid`
8. Line **192**: `step === 4` → `step === resourcesStepIndex`
9. Line **261**: `step === 4` → `step === resourcesStepIndex`
10. Line **327**: `step === lastStep` → `step === policySetStepIndex` (skipping this makes the Policy Set panel vanish)
11. After line **334**: the new `step === orchestrationStepIndex` render block

**Acceptance criteria:**
- [ ] No bare integer step comparisons remain beyond `step === 1/2/3` and the two index declarations
- [ ] VM groups show 7 sidebar steps, volume groups 6; Orchestration last in both
- [ ] Next on Policy Set disabled until a policy set is selected (**new** — regression fix)
- [ ] Create/Save renders only on Orchestration, disabled until toggle answered **and** an eligible provider selected
- [ ] Related-volume discovery still fires only on step 5 for VM groups
- [ ] Resources step keeps `overflow-hidden`; all others `overflow-y-auto`
- [ ] Auto-select does **not** call `onDirtyChange`

**Dependencies:** Tasks 1, 4, 5 · **Scope:** S (1 file, ~11 edits)

---

### Task 7 · Repair `RecoveryGroupBuilder.test.tsx`
Largest blast radius. The file renders **without** a `QueryClientProvider` and
`src/test-utils/setup.ts` adds none, so the new `usePlatformProviders()` call
throws `No QueryClient set` in **all 9 tests** until mocked.

1. Add a `vi.mock('…/usePlatformProviders')` after the `usePolicySets` mock (line 76), returning one eligible `airflow-01` AIRFLOW record — copy the shape from `RecoveryAppBuilder.test.tsx:46-47`
2. **Five tests** click "Policy Set" then submit (lines ~145/147, 177/179, 210/212, 235/238, 264/266) — each needs added Orchestration navigation + toggle + provider before submitting
3. Add a test asserting the gate: toggle unanswered → Create disabled

**Acceptance criteria:**
- [ ] Full suite green (baseline 606)
- [ ] At least one test proves `pushToOrchestrator: null` cannot submit

**Dependencies:** Task 6 · **Scope:** S (1 file)

---

### Checkpoint: Full Verification
- [ ] `npm run typecheck` · `npm run lint` · `npm run test`
- [ ] **Browser walkthrough — non-negotiable.** This feature already produced one infinite-render crash that unit tests did not catch. Drive the real wizard for **both** a VM group and a volume group, watching the console. The render-phase `setDraft` in Task 6 item 4 is exactly the shape that crashed before.
- [ ] Network tab: POST URL carries both query params; body unchanged
- [ ] Edit an existing group end-to-end — confirm it does not dead-end on Orchestration

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A plain-`boolean` toggle makes the required gate unexpressible | **High** — ships a hidden default; gate never fires | Tri-state `boolean \| null`, narrowed in validation (AD-1, Task 2) |
| ~11 hardcoded step indices across two different numberings | **High** — silently wrong panel, often for one group type only | Named derived indices (AD-5, Task 6 items 3, 8-11); acceptance criteria test both types |
| Policy Set loses its "shielded by being last" protection | **Medium** — user can skip policy-set selection | Explicit `canContinue` branch (Task 6 item 6), its own acceptance criterion |
| Render-phase `setDraft` for auto-select re-triggers renders | **Medium** — the exact crash class already hit in this feature | Guard on `draft.orchestrationProviderId === null`; browser walkthrough is a required checkpoint |
| `orchestrationProviderId` unrestorable on edit | **Medium** — Save disabled on every edit | Auto-select sole provider + visible `notRestorable` hint (AD-4) |
| `Toggle.tsx` has zero prior consumers and no tests | **Medium** — unexercised code in a required control | Task 5 explicitly verifies focus ring, dark mode, accessible name |
| Missing `usePlatformProviders` mock breaks all 9 builder tests | Low — loud, easy to diagnose | Task 7 adds the mock first |
| `push_to_orchestrator=true` triggers a real Airflow push, and `submitRecoveryGroup` never reads the POST response | **Medium** — orchestrator-side failure invisible until refetch | Out of scope; flagged as follow-up |
| Schema fields must stay `.optional()` | Low — already correct | `deleteRecoveryGroup` re-parses the same schema (`recoveryGroupsApi.ts:86`); making them required would break DELETE too |

## Open Questions

1. **Answering "No" costs two clicks.** With `checked={pushToOrchestrator === true}`,
   going from unanswered → "No" means toggling on then off. Mitigated by rendering
   the answer as visible text, but a two-button "Yes / No" radio pair would be
   unambiguous in one click. Keep the toggle (as you asked) or switch?

2. **Is the provider still required when the toggle is off?** The API marks
   `provider_id` required unconditionally, so this plan always requires it — even
   when not deploying. Confirm that matches real backend behaviour.

3. **Pre-existing bug, deliberately not bundled** (CLAUDE.md §3, surgical changes):
   `AppMetadataForm.tsx:143,156` reference `providers.platform.loading` /
   `providers.platform.loadFailed`, which exist in **none** of the three locale
   files — that UI renders raw key strings today. The correct keys
   (`platformProviders.loading` / `.loadFailed`) do exist. Fix separately?

4. **Should the backend persist the orchestration provider?** If it round-tripped
   in the GET response, Open Question 1's auto-select workaround and the
   `notRestorable` hint both become unnecessary. Worth raising with the backend team.
