# Implementation Plan: Recovery Application Save Completion

**Current status:** P1/P2 hardening implemented and automatically verified on 2026-10-22. See the appended hardening section; its controlled locking/navigation rules supersede the original compatibility-only decision for these two issues. Earlier implementation evidence below is retained as history. No commit/push; browser smoke remains unverified.

## Executive summary

Extract Candidate 4 into `useRecoveryApplicationSaveCompletion`, an Application-specific hook shared by Create and Edit. It owns dirty-state bookkeeping, guarded Back/discard navigation, successful local-versus-push completion, submitted-name/provider context, push-dialog state, dismissal, and navigation to the applications list. Pages keep payload mapping, mutation invocation, errors, loading, edit locks, and presentation. Keep the existing mutation adapter, response normalizer, navigation guard, and shared dialog.

Execution approved on 2026-10-22: implement inline, with tests and a checkpoint after each phase, no unplanned behavior changes, and protection of other agents' work. No branches/worktrees, commits or pushes during execution; review is required before any later commit/push. Execution checklist: [recovery-application-save-completion-todo.md](recovery-application-save-completion-todo.md).

**Behavior decision:** implement a compatibility extraction. The pending-save/dirty race is confirmed at the page seam, but fixing it changes navigation and draft semantics. Preserve it explicitly in this scope; propose a separately approved follow-up rather than silently fixing it inside the extraction. This plan does not claim the extracted flow protects edits made after submission.

## Existing architecture and evidence

Inspected on 2026-10-22 on `spike/ant-design-shell`, HEAD `cbd76d11db073d06c900e93a0bb83cec8ff757a1`, including the current uncommitted worktree. CodeGraph was consulted before source exploration. Its slices omitted some anonymous test bodies; those bodies were read directly.

During planning, another session advanced HEAD to `3be15822176e5cdbc9846203d750d79a7537950a`, incorporating the previously observed Group draft work. A read-only comparison showed only Group source/tests and its planning files changed between those commits; Application completion sources were unchanged. This task made no commit. At final status only the two new Application planning files were untracked. Baseline counts below describe the worktree tested during planning; rerun checkpoints during execution.

Architecture report read: `C:/Users/polnikr/AppData/Local/Temp/architecture-review-recovery-cache-20261021-211912.html`, article `#completion`, Candidate 4, “Uloženie a push: dokončenie používateľského toku”. Its central recommendation is Application completion ownership first, preserving existing adapters and Group differences. Its observation about awaited Group inventory invalidation needs qualification below.

Source paths in this document are relative to the repository root.

| Evidence | Verified finding |
| --- | --- |
| `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx:23–53,80–111` | Four independent state values: dirty plus push result, name, URL. Per-call mutation success clears dirty; push plus response-field presence opens dialog; otherwise bypassed navigation. Dismissal clears result/name and navigates. |
| `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx:35–84,138–173` | Same completion protocol; mapper additionally receives `lockedProviders`. Editor independently loads application, preserves filename, supplies provider and push locks. |
| `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.ts:18–35` | `useMutation` validates trimmed orchestration provider ID for push, submits generated POST, normalizes response. Hook-level success starts list invalidation with `void`; completion does not wait for refetch. |
| `src/features/recovery-plans/recovery-applications/model/submitDagResponse.ts:4–10` | Local response strips push details. Push request always gains `orchestrator_push`, with missing/undefined/null normalized to null. |
| `src/features/recovery-plans/recovery-applications/model/recoveryApplicationTypes.ts:70–80,116–138` | Local/orchestrated response union, generated push alias, stored provider lock shape, and draft shape already exist; reuse them. |
| `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx:93–98,152–155,173–181,223–277,326–341,543–566` | Builder owns actual draft. Mutation events report `onDirtyChange(true)` repeatedly. Fieldset is disabled for initial loading only; pending Save disables the Save button, not wizard navigation or editing. No submit-time dirty revision exists. |
| `src/shared/hooks/useUnsavedChangesGuard.ts:4–64` | Owns beforeunload, router blocker, pending action, cancel/confirm and synchronous bypass. Its dirty value comes from the caller. Continue using it unchanged. |
| `src/shared/components/modal/OrchestratorPushResultDialog.tsx:18–85` | Shared presentation distinguishes pushed, skipped, missing; preserves response inspection, manual-only instructions and notes. Exact external DAG action exists whenever trimmed `dag_id` exists, including skipped results that supply one. |
| `src/config/externalServices.ts:12–34` | Provider URL fallback, trailing slash and `/dags` handling, DAG prefix and encoding stay here. Completion resolves provider context, not the final DAG URL. |

### Create versus Edit

Create maps with current source/target provider catalog; Edit maps with stored `LockedProviders`. Edit's query identifies a record by normalized filename; initial builder key is filename (or `loading`), not application object identity. Its draft initializes once per mount: a successful list refetch does not normally overwrite a mounted draft with the same key. Edit passes `disableFileName`, `isInitialLoading`, `lockPushToOrchestrator={application?.pushToOrchestrator === true}`, and `lockedProviders`; preserve all four. A run ID alone must not imply a pushed application. Create has no initial application/load-error/not-found flow. Error formatting and visual shells remain page-owned.

Both pages currently resolve URL from the provider array captured by the submitting render, matching the submitted orchestration provider ID, and use the submitted name rather than a response list item. Provider changes while awaiting success must not silently replace that context during extraction.

### Mutation callbacks and asynchronous behavior

Installed primary implementation inspected: `node_modules/@tanstack/query-core/src/mutation.ts:238–273` and `mutationObserver.ts:97–98,128–180`. Hook-level success runs before success dispatch to observer/per-call callbacks. Application invalidation returns immediately because its promise is discarded. Per-call completion fires only for an observing mounted consumer. A new `mutate` call detaches the observer from the prior mutation and replaces per-call options; only the currently observed submission drives page completion. Earlier requests can still succeed on the server and run hook-level invalidation. Latest-observer UI behavior is not server request ordering or cancellation.

Keep `mutate(..., { onSuccess })`, not `mutateAsync`, a global mutation callback, or an effect watching `isSuccess`. Keep success side effects in that callback: moving them changes unmount and overlapping-call semantics. Normal UI prevents another Save while pending; do not add a submission queue, token registry, abort mechanism, or retry policy. During execution add a real-QueryClient deferred-request test of latest observer and unmount behavior so a mocked callback test is not mistaken for transport lifecycle evidence.

### Pending Save and dirty-state race: confirmed with limits

Concrete sequence: dirty draft A -> submit A -> edit B while request is pending -> success A -> `setIsDirty(false)`. A push success opens the dialog; beforeunload no longer blocks despite newer B. Closing bypasses the guard and navigates. Local success bypasses the guard immediately. A revision check on `setIsDirty(false)` alone would not fix this because unconditional navigation/dismissal bypass could still lose B.

Static reachability is confirmed by editable controls and repeated dirty notifications. Two temporary characterization suites copied the existing page fixtures and added one test each: mark dirty, submit push, mark dirty again, assert beforeunload blocked, invoke saved success callback, wait for dialog, assert beforeunload unblocked, close and assert list navigation. Both passed against current pages. The fixture suites mock builder and mutation, so this proves the page-level sequence, not real-network browser reproduction. No persistent tests or production code were changed; both temporary files were removed. A real-builder pending-edit test remains an F1 deliverable.

The temporary invocation executed 31 tests total (the original page tests plus two new cases); npm consumed the attempted `-t` filter. Do not interpret this as a two-test-only run. Command used:

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.planning-characterization.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.planning-characterization.test.tsx -t 'characterizes dirty changes'
```

For future filtered runs use `npm.cmd exec -- vitest run ... -t ...`. The temporary filenames above no longer exist and are evidence references, not execution commands.

### Recovery Group comparison (read-only)

`src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.tsx:41–64` and `RecoveryGroupEditorPage.tsx:50–73` await `create`/`update`, catch domain errors locally, then store one result/name/URL object. They branch on the draft's push flag rather than response property presence; optional push normalizes to null in `hooks/useRecoveryGroups.ts:108–120`. Group uses different draft validation, returned-record mapping, fallback record construction, and error translation.

The report's inventory-await warning is not a Create/Edit Save timing difference in current code: Group `invalidateInventory` is awaited by delete/rollback (`useRecoveryGroups.ts:123–148`), not its submit path. Generated Group submit `onSuccess` starts list invalidation without awaiting its promise (`src/generated/query/recovery-groups/recovery-groups.gen.ts:232–242`). Preserve Application fire-and-forget invalidation. Do not transplant Group lifecycle, refactor Group, or change cache policy.

## Problem statement

Both Application callers must currently know the order of dirty updates, response-shape branching, provider lookup, push result visibility, guard bypass, and dismissal navigation. A shared dialog alone cannot own those rules. Consolidate that protocol behind one hook interface so its ordering and compatibility can be exercised once, with integration evidence for both callers.

## Save/Push behavior and coverage matrix

Test aliases below resolve to exact paths in Verification commands. “Gap” means not established by existing assertions; do not infer coverage from a passing file.

| Scenario | Required/current behavior | Existing evidence | F1/F2 coverage action |
| --- | --- | --- | --- |
| Local Create | Clear dirty; navigate directly; no result dialog | A: local-only response test | Add dirty-to-clean/unload assertion |
| Local Edit | Same as Create | Static Edit callback; E submits unchanged but does not complete local response | Gap: add complete local-success case |
| Push `pushed` | Dialog, no list navigation until dismissal | A/E: orchestrated submit plus close | Retain integration; add hook case |
| Push `skipped` | Warning dialog; successful Save, no Save error | A/E nullable/skipped; D | Assert no submission error and close |
| Explicit null | Missing-result dialog, no invented DAG | A/E nullable/skipped; D | Hook result null differs from closed state |
| Missing/undefined wire push | With push requested, normalize to null then show missing-result dialog | W: parameterized optional push results | Keep W; add page/hook normalized-null case |
| Missing field in already normalized callback | Current page falls through to local navigation even if submitted push=true | Static `'orchestrator_push' in response` | Characterize this adapter-bypass edge; preserve predicate, do not add second normalizer |
| Local response includes wire push | Normalizer strips push field when push=false; no dialog | Static normalizer | Add W local-with-extra-push case |
| `manual_only` | Forward schedule/notes unchanged; dialog explains Unpause then Trigger, does not claim execution started | A/E manual-only; D manual-only variants | Retain raw result; no completion-level note rewriting |
| Provider URL/DAG | Use submitting render's selected provider URL and response `dag_id`; no invented legacy run ID | A/E dynamic URL; R; static helper | Add provider missing/null URL and changed provider-catalog context tests |
| Dismiss push | Close result, leave via guard bypass | A/E close | Hook and real-router success navigation checks |
| API failure | Error alert, mounted draft, dirty guard unchanged, no navigation/result | A/E render preset mutation error; static success-only dirty reset | Gap: genuine rejected submission after editing, retained draft and retry |
| Clean Back | Navigate immediately | A clean Back; static guard | Add E clean Back |
| Dirty Back | Discard confirmation, no navigation yet | A/E | Keep |
| Cancel discard | Keep current form | A/E | Keep |
| Confirm discard | Navigate to applications list | A/E | Keep |
| Browser unload/route | Unload blocked while dirty; router uses pathname guard | G tests unload and explicit request only | Add real data-router blocker/cancel/proceed evidence at hook seam |
| Edit provider locks | Stored platform/source/target IDs survive attempted changes and legacy IDs remain locked | E lock tests; builder component tests | Retain E; run builder tests |
| Pushed app Edit | Push forced on when backend pushed=true; run ID alone insufficient | E | Retain |
| Save pending, newer edits | Currently success clears newer dirty state; automatic exit can discard changes | Static builder + two temporary page tests | Permanent characterization in A/E, actual pending-edit check in B; compatibility limitation remains explicit |
| Failure then retry | Failure retains draft; later success follows normal local/push rule | Not covered end-to-end by Application preset-error tests | Add deferred reject/retry case |
| Overlap/unmount | Current observer owns completion; no per-call completion after unmount; old mutations may still invalidate | Installed Query core source | Add deferred real-mutation test, not arbitrary direct invocation of an obsolete mock callback |
| Group regression | Existing Group local/push/error/guard behavior unaffected | GB/GE, including uncommitted failure/dirty cases | Execute unchanged suites; never edit their work for this task |

## Target module design

### Choice and responsibilities

Use one hook with private state, not an exported pure reducer plus effect interpreter. The domain branch is small; guard coordination and success navigation are essential React side effects. A separate state machine would expose more ordering machinery than it hides. A single nullable dialog object replaces the result/name/URL triple; null means closed, and an object's `result: null` means open with missing push details.

Domain rules: success completion predicate, submitted identity, and provider matching. UI state: dirty boolean and dialog object; shared guard retains its own blocker state. Infrastructure side effects: router navigation via existing `useNavigate`/route constant and guard, mutation/cache operations left outside, `window.open` left in the dialog. The hook does not own the form draft or mutation pending/error state.

### Exact public interface

All new types may be colocated in the hook; no new barrel or shared types package.

```typescript
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type {
  OrchestratorPush,
  RecoveryApplicationFormState,
  SubmitDagResponse,
} from '../model/recoveryApplicationTypes'

export interface ApplicationPushDialog {
  entityName: string
  result: OrchestratorPush | null
  providerUrl: string | undefined
}

export interface SaveCompletionInput {
  submitted: Readonly<Pick<RecoveryApplicationFormState,
    'name' | 'pushToOrchestrator' | 'orchestrationProviderId'>>
  response: SubmitDagResponse
}

export interface SaveCompletionOptions {
  platformProviders: readonly Pick<PlatformProviderRecord, 'id' | 'url'>[]
}

export interface ApplicationSaveCompletion {
  markDirty: (dirty: boolean) => void
  requestBack: () => void
  discardDialog: {
    open: boolean
    cancel: () => void
    confirm: () => void
  }
  pushDialog: ApplicationPushDialog | null
  completeSave: (input: SaveCompletionInput) => void
  dismissPushDialog: () => void
}

export function useRecoveryApplicationSaveCompletion(
  options: SaveCompletionOptions,
): ApplicationSaveCompletion
```

Keep the options provider array rather than creating another provider query: the pages already fetch it and their submitting-render context must survive asynchronous completion. Internal navigation uses `routes.recoveryApplications`; no configurable entity, destination, mutation, or generic CRUD policy. `providerUrl` is explicitly `string | undefined` rather than an optional property to fit exact optional-property typing while preserving existing fallback.

`markDirty` is a stable callback matching the builder's current boolean contract. `completeSave` closes over the provider catalog of its render: a page's per-call success callback must invoke the completion function captured when submitting, not a latest-callback ref. Pass a small copied submitted descriptor from that same handler. Do not derive submitted name/provider from subsequently edited state or response list contents.

### Lifecycle and ordering contract

No public lifecycle enum is needed. Observable states are editing (dirty or clean), pending discard (owned by guard), and displaying push result. Mutation pending/error is orthogonal and remains outside.

| Event | Transition and side effect |
| --- | --- |
| Builder dirty notification | Set hook dirty boolean to supplied value, forwarding it to `useUnsavedChangesGuard`. |
| Back/Cancel builder | Guard requests list navigation. Dirty shows discard dialog; clean navigates. |
| Cancel discard | Delegate to guard cancel; leave draft intact. |
| Confirm discard | Delegate to guard confirm and list navigation. |
| Success, local or absent normalized push property | Set dirty false; call guard `runWithoutBlocking` around list navigation immediately. |
| Success, requested push with response property present | Set dirty false; create one dialog object using submitted name, response result (including null), and matching provider URL. No navigation. |
| Dismiss push dialog | Clear dialog object and bypass guard around list navigation, exactly as today. |
| Mutation rejection | Do not call completion. Mutation exposes error; page retains draft and guard state. |

The hook consumes `SubmitDagResponse`, not wire data. Preserve the explicit `submitted.pushToOrchestrator && 'orchestrator_push' in response` branch. Do not throw for skipped/null or reinterpret these as submission failures. Carry the complete push object unchanged, including schedule/notes/optional fields. URL lookup stays `id === submitted.orchestrationProviderId`, `url ?? undefined`; existing dialog/helper provide default URL behavior and final DAG URL.

No new tokens or stale-response filter belong in the compatibility interface: adapter observer ownership already governs which successful call reaches it. Preserve that call site. Do not promise immunity to manually retained obsolete callbacks, backend write races, or edits during Save. Refs holding latest options would change provider-context behavior and are unnecessary here.

Outstanding discard while a save finishes is another order-sensitive combination: characterize local success and push-success then cancel/confirm before altering it. Preserve existing guard delegation; do not silently add modal precedence or clear pending navigation inside completion.

### Integration sketch (not implementation)

Each page constructs `completion = useRecoveryApplicationSaveCompletion({ platformProviders })`. Its existing `handleSave` still builds the same payload and calls the same mutation. Copy `{ name, pushToOrchestrator, orchestrationProviderId }` at submit; the per-call success callback only calls the captured `completion.completeSave({ submitted, response })`. Builder receives `completion.markDirty`; page Back and builder Cancel receive `completion.requestBack`. Existing confirm dialog consumes `completion.discardDialog`; existing push dialog renders only when `completion.pushDialog !== null`, with unchanged `entityType="application"` and its three data fields plus `completion.dismissPushDialog`.

Remove the pages' dirty/result/name/URL state, direct guard setup, completion branches, provider lookup, and duplicated close handlers. Keep provider catalog query, source/target catalog, mapper, mutation error formatting, loading UI, editor memoization/key/lock props. The hook owns guard bypass so pages cannot accidentally bypass it differently.

### Race follow-up proposal (excluded from compatibility implementation)

If a behavior fix is later approved, use submit identity plus a monotonically increasing edit revision, capturing revision and provider/name at submission. Repeated `markDirty(true)` must advance revision even when already dirty. A successful old revision may mark its submitted snapshot saved but cannot make a newer revision clean; local navigation and push dismissal must also respect newer dirtiness. For local success with newer edits, remain in the builder; for push success, show result, then use guarded exit on dismissal. Define whether a second Save is allowed after persistence while a result is open and what retry means for Create after the first record was saved. Simply disabling fields during Save is an alternative behavior change affecting draft editing and must be approved too. Neither approach belongs in this extraction by implication.

## Files to create or modify

| Phase | Exact files | Purpose |
| --- | --- | --- |
| F1 | `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`; `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx` | Local Edit, failed submit/retry with dirty draft, pending-edit and pending-discard characterizations. |
| F1 | **Create** `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx` | Both pages with the real submit hook and controlled HTTP failure/retry or omitted push response. Existing page suites mock the mutation; this separate suite meaningfully closes that gap without expanding production scope. |
| F1 | `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx` | Prove editable controls and dirty notifications during pending Save using real builder. |
| F1 | `src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`; `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx` | Local-extra-push normalization; deferred callback/unmount/overlap/invalidation timing coverage. No adapter source change. |
| F2 | **Create** `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.ts`; **create** `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx` | Completion implementation and interface tests with real guard/data router. `.tsx` selects existing jsdom project without config changes. |
| F3 Create | `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`; its existing `.test.tsx` | First caller migration and behavior checks. |
| F3 Edit | `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`; its existing `.test.tsx` | Second caller migration, preserving locks and initialization. |
| F4 | These two planning/checklist Markdown files only for evidence updates | Record acceptance and limitations; no extra production changes planned. |

Read/test only: `useRecoveryApplications.ts`, `submitDagResponse.ts`, `recoveryApplicationTypes.ts`, `RecoveryAppBuilder.tsx`, `useUnsavedChangesGuard.ts` and `.test.ts`, `OrchestratorPushResultDialog.tsx` and both dialog suites, `externalServices.ts` and `.test.ts`, Group pages/hooks/generated contracts and both Group page suites. If evidence requires changing one, document necessity and scope before expanding the plan. Generated files never edited.

## Detailed implementation phases and rollback

### F1 — Characterization & baseline

1. F1.1, small, dependency none: expand both existing Application page suites with local Edit/clean Back, actual failure/dirty/retry, and explicit pending-change/pending-discard behavior. Limit to the two page test files; split further if needed. Assert visible draft, errors, beforeunload and navigation, not private setters.
2. F1.2, medium, depends F1.1: in builder test prove Save is disabled but another draft edit is possible while pending; in mutation hook test exercise deferred requests, callbacks, unmount/overlap and no waiting on list refetch; in wire test cover local-extra-push. Three test files maximum.
3. Record matrix evidence and approve compatibility/race limitation before F2. Do not change expected behavior silently to make a new design pass.

Checkpoint: all focused baseline tests green; every matrix row linked to an assertion or explicitly documented source-only limitation. Rollback: remove only this task's new test cases; no production changes exist yet. Current Group work remains untouched.

### F2 — Completion module

1. F2.1, small, depends F1 checkpoint and explicit implementation approval: create hook and hook test file with local success, dirty Back/cancel/confirm and beforeunload/real router transitions through its public interface.
2. F2.2, small, depends F2.1: in the same two files add pushed/skipped/null dialog flow, complete response preservation, missing-field predicate, provider fallback/captured-render context, success bypass/dismissal and pending-discard compatibility. Preserve characterization of newer dirty clearing as a named current limitation.

Checkpoint: independently testable module with pages still using their old flow; hook tests green. No reducer/framework/config or cache changes. Rollback: delete only the two unused new files.

### F3 — Integration

1. F3.1, small, depends F2: migrate Create in page + its test. Keep real completion hook in integration tests; mock transport/builder as existing tests do. Ensure temporary test assumptions have become permanent coverage, not code-shape assertions.
2. F3.2, small, depends F3.1 passing Create checks: migrate Edit in page + its test. Preserve stored IDs, notification email, filename, loading key, backend push lock and run-ID-only distinction. Run both page suites after Edit migration.

Checkpoint: one Application completion implementation; no duplicated completion state/branch/bypass/provider resolution in either caller. Rollback each page independently to its pre-migration content without overwriting other work; remove unused hook only after both callers are rolled back.

### F4 — Regression & acceptance

Run the focused commands below, full requested TypeScript check and ESLint, diff validation, and browser smoke. Compare matrix behavior against F1, including named race compatibility. Record output and pre-existing failures separately. No broad build or complete test suite by default. Do not repair unrelated Group changes to obtain green. Rollback: page migrations first; unused hook second; preserve independently valuable characterization tests.

## Verification commands and test strategy

PowerShell uses `npm.cmd` because `npm.ps1` is blocked by host execution policy. Use `--` after `exec` for tool flags. Run from repository root; existing node_modules were sufficient, no installation/network required.

Exact test aliases and commands for execution:

```powershell
$A = 'src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx'
$E = 'src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx'
$W = 'src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx'
$H = 'src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx'
$R = 'src/shared/components/modal/OrchestratorPushResultDialog.response.test.tsx'
$D = 'src/shared/components/modal/OrchestratorPushResultDialog.test.tsx'
$G = 'src/shared/hooks/useUnsavedChangesGuard.test.ts'
$GB = 'src/features/recovery-plans/recovery-groups/pages/RecoveryGroupBuilderPage.test.tsx'
$GE = 'src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx'
$B = 'src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx'
$L = 'src/config/externalServices.test.ts'
$C = 'src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx'
$I = 'src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx'

# V1 baseline and required regressions (F1, F4)
npm.cmd exec -- vitest run $A $E $W $H $R $D $G $GB $GE $I
# V2 real builder and URL rules (F1, F4)
npm.cmd exec -- vitest run $B $L
# V3 new module (F2, F4; only once file exists)
npm.cmd exec -- vitest run $C
# V4 caller checkpoints (F3)
npm.cmd exec -- vitest run $A
npm.cmd exec -- vitest run $A $E
# V5 final requested compiler and lint checks (F4)
npm.cmd run typecheck
npm.cmd run lint
# V6 whitespace (each changed phase; F4)
git diff --check
```

V5 lint includes `eslint . --max-warnings 0` and `node scripts/orval/check-feature-layout.mjs`; report unrelated pre-existing failures instead of suppressing them. During F2/F3, focused lint may use `npm.cmd exec -- eslint <explicit changed TS/TSX paths> --max-warnings 0`; final full lint/typecheck are requested. V1 covers API wire behavior without regenerating contracts or invoking the broad build script. Never use `npm run build` merely for type verification: it also runs all tests and API checks.

Hook tests use `renderHook`/small harness, real `useUnsavedChangesGuard`, and a data router for blocked/proceeded navigation. Page tests keep real hook to ensure wiring, actual dialog output and target path are correct. Deferred adapter tests use real QueryClient and local fetch stubs. Do not test private setState calls or create test-only generic adapters. Keep meaningful existing page assertions even where hook tests centralize permutations.

Planning-time evidence: V1's nine exact files ran with `npm.cmd exec vitest run` followed by those paths (no variables/`--` in the original invocation): **9 files, 84 tests passed**, Vitest 4.1.11, 59.95 seconds. Temporary page copies: **2 files, 31 tests passed**, 15.31 seconds. These establish current worktree behavior, not F1–F4 completion. V2–V5 and browser smoke were not run during planning. Complete suite and production build were not run.

### Browser smoke acceptance (F4)

Use a development environment with safe test applications and known Airflow provider; record which actions hit a real backend versus deterministic local responses. On both Create and Edit: local save returns to list; pushed result holds navigation until close; DAG action opens the selected provider's exact DAG; skipped/null/missing and manual-only show correct warning/instructions/notes; rejected Save retains typed draft and guard; Back cancel/confirm work. Edit must retain stored provider IDs/filename and pushed lock. Exercise slow Save followed by another edit to document current race, not to claim it fixed. Exercise browser Back/refresh separately from explicit page Back.

There is no live-browser verification evidence in this planning task. Native unload dialogs, external Airflow permissions and actual backend status generation cannot be established by jsdom. If no safe backend or browser tooling exists at execution, report blocked smoke scenarios explicitly rather than count mocked UI tests as browser evidence.

## Risks, mitigations, and open decisions

| Risk | Impact | Mitigation / decision |
| --- | --- | --- |
| Confirmed newer-edit dirty reset and unconditional exit | High: unsaved edits can be lost | Compatibility scope explicitly retains it. Separate approved behavior fix must address revision and exit, not just dirty reset. |
| Replacing callback with promise/effect | High: overlap/unmount semantics change | Preserve per-call success; deferred real-mutation tests. |
| Latest-ref provider lookup | Medium: wrong context when provider catalog changes | Capture submitting render's completion callback and copied submitted descriptor. |
| Collapsing open-null and closed | High: missing result disappears | Nullable dialog object whose inner result can be null. |
| Save treated as failure when push skipped/missing | High: misleading failure and unnecessary resubmit | Success branch forwards result untouched; error remains mutation-owned. |
| Cache refetch races with Edit | Medium: remount/lock changes may alter draft | Preserve filename key and initialization; deferred invalidation test; do not await refetch or reset draft. |
| Simultaneous pending discard and success | Medium: modal/order differences | Characterize first and preserve shared guard's behavior. |
| Tests mocking router/blocker too much | Medium: bypass looks safe without route proof | New hook harness exercises actual data-router blocker and success navigation. |
| Concurrent uncommitted Group refactor | Medium: unstable regression baseline | Existing Group tests/work remain read-only; record baseline context and new failures separately. |
| Missing provider URL | Existing fallback may target default Airflow | Preserve current fallback; do not invent a different URL or remove DAG action. Any fallback policy change is separate scope. |

Open product decision for follow-up: preserve editability with revision-aware completion versus freeze editing while pending. The extraction has a concrete default (compatibility) and does not depend on deciding that fix. Before implementation approval, reviewers must acknowledge this limitation; if they require it fixed as part of Candidate 4, revise interface/tasks/test expectations explicitly before coding.

## Acceptance criteria

- Both Application pages use one completion hook; completion dirty/result/provider/navigation knowledge is removed from callers.
- Matrix behavior is preserved, including local exit, pushed/skipped/null/missing normalization, manual-only content, provider DAG links, mutation failure draft/guard preservation, discard flow, edit provider/push locks, and documented async compatibility.
- Existing adapter, normalizer, shared guard/dialog, payload mapping, generated contracts, query keys and invalidation timing stay intact; Group implementation is unchanged.
- F1–F4 focused evidence, typecheck, ESLint, diff validation and browser results/limitations are recorded without overstating coverage. A confirmed race is not called fixed without a separately approved design and test expectation change.

## Execution evidence

### F1 checkpoint — passed

The 12-file baseline command used V1 + V2 + `RecoveryApplicationSaveCompletion.integration.test.tsx`: 152 passed, one new builder fixture assertion failed (ASCII ellipsis instead of the localized ellipsis, then an invalid spaced application name affecting its exact label). Corrected test data only. The affected builder/hook/integration run then passed 51 tests across three files. After tightening async test code for ESLint, the hook/integration rerun passed nine tests across two files. All 153 distinct tests in the baseline scope therefore passed with final test code; six changed test files passed focused ESLint, and `git diff --check` passed. No production code was changed in F1.

New evidence closes the matrix gaps: both pages' local/dirty/pending-discard completion; actual HTTP rejection preserving edited draft and dirty guard, successful retry, normalized omitted push; local-wire-extra-push; real builder edits during pending Save; actual mutation latest-observer, unmount and invalidation-before-completion behavior. Provider missing/refresh and actual data-router navigation are covered in F2. Existing locks, manual-only and Group regression assertions remain green. User approved compatibility and separate P1 repair in the execution request.

### F2 checkpoint — passed

Wrote the module tests before creating its source; initial run failed because the module did not exist. After implementation, corrected an `it.each` fixture that spread provider arrays into test arguments; no production adjustment was needed. All 15 module tests passed, including real data-router blocking/cancel/proceed, local success bypass, push/null/skipped/raw manual-only response, submitting-render provider context, missing URL fallback and existing dirty/pending-discard behavior. The three still-unmigrated page suites passed 43 tests in the same checkpoint run.

Focused ESLint for both new module files and `git diff --check` passed. The public interface matches the plan; no reducer or cache change was introduced.

### F3 checkpoint — passed

Create migrated first: `npm.cmd exec -- vitest run $A $I $C` passed 37 tests across three files; focused Create ESLint and diff check passed. Then Edit migrated with original payload mapping, stored-provider arguments, initial filename key, filename disablement and backend-pushed lock intact. `npm.cmd exec -- vitest run $A $E $I $C $B $L` passed 108 tests across six files; focused Edit ESLint and diff check passed. The variables refer to the exact paths in Verification commands above.

### F4 checkpoint — automated checks passed; browser smoke blocked

Final regression command (aliases defined in Verification commands):

```powershell
npm.cmd exec -- vitest run $A $E $I $B $H $W $C $R $D $G $GB $GE $L
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Results: **13 test files, 168 tests passed**, Vitest 4.1.11, 75.10 seconds. Typecheck (`tsc -b`), full lint (`eslint . --max-warnings 0` plus Orval feature-layout check), and diff check all exited 0. The complete test suite and production build were not run. Windows Git emitted existing ignore-file permission and LF-to-CRLF notices during status/diff commands; no whitespace errors or test/lint/compiler failures remain.

Browser smoke is blocked by environment: no Chrome DevTools MCP tools were available; the workspace has no installed Playwright/Puppeteer runner. Browser used: none. Real-backend actions: none. Browser actions/outcomes: not exercised. No browser/visual/native-unload-dialog or external Airflow verification is claimed. Real-router/guard behavior and stubbed HTTP behavior are covered by jsdom tests; these are not browser smoke substitutes. Leave those smoke acceptance items unchecked.

Inline review compared both page diffs with their original flow and reviewed the new hook/tests against the interface and behavior matrix. No new blocking findings were identified. The known P1 dirty race is deliberately retained, not fixed. Payload mapping, mutation adapter/normalizer, shared guard/dialog, generated/model sources and Recovery Group files have no diff. No dependencies or configuration changed. This is an author review; independent/human review is pending. No commits/pushes/branches/worktrees were created; HEAD remains `3be15822176e5cdbc9846203d750d79a7537950a` on `spike/ant-design-shell`.

## Separate priority repair: P1 Save/dirty race

**Status:** Confirmed; intentionally not fixed by this compatibility refactor. **Priority:** P1, possible loss of unsaved user input on both Create and Edit.

Reproduction: edit A, submit, edit B while pending, resolve success for A. Dirty is reset despite B; local completion navigates immediately or push-dialog dismissal bypasses the guard. Permanent page characterizations and the pending-edit builder test document this behavior.

Follow-up acceptance: newer revisions remain dirty after older success; local completion and push dismissal cannot discard newer edits without explicit confirmation; failure/retry, Create's already-persisted identity, overlapping requests and provider context are defined and tested. A dirty revision comparison alone is insufficient because exit bypass must change too. Select revision-aware completion or freezing edits as an explicit behavior decision in a separate repair, not inside this extraction.

## Explicitly out of scope

Recovery Group completion/draft refactoring; backend or generated Orval contracts; generic CRUD/state-machine frameworks; Application builder draft ownership changes; styling/layout changes; query-key/cache-policy changes; implicit race fixes or new editing restrictions; DAG execution/monitoring; commits, pushes, branches or worktrees during this task. Implementation approval is recorded above; leave the result uncommitted for review.

## P1/P2 Save lifecycle hardening — approved follow-up

Scope: controlled form locking during Save (P1), exclusive Save versus Back/Cancel/Discard/router navigation (P2). No revision tracking or architectural redesign. Existing extraction history remains above. Work inline on `spike/ant-design-shell`; no commit, push, branch/worktree, generated changes or unrelated repairs.

### F1 — reproduce and characterize

Baseline: the eight requested existing Candidate 4 suites passed **110 tests**, Vitest 4.1.11, 58.01s. Command:

```powershell
npm.cmd exec -- vitest run $B $A $E $I $C $H $G $R
```

Aliases are defined above. Known paths: native builder controls remained enabled; custom resource drop and tier reorder run on non-native elements. Source confirmation was inspected separately (the current Modal is fixed-position DOM, not a portal); its own disabled/loading contract is used rather than assuming fieldset inheritance for every dialog implementation. Existing pending navigation could coexist with Save and Push; stale submit-time guard callbacks could retain old router-blocker state.

New regression expectations were written before production fixes: lock native/wizard edits and duplicate Save; block stale Discard and router navigation during Save; reset stale navigation on failure/success; navigate once. Focused red run: seven failing cases (two P1 assertions on enabled controls; stale Discard still open; four cases requiring the missing exclusive-Save interface). Additional real-tier/source-dialog red run: two failing cases, showing a VM change after in-flight drops and enabled source-confirmation buttons. These were targeted `-t` runs; other tests were filtered, not disabled in source.

F1 checkpoint passed: baseline green and new failures established before production edits. CodeGraph MCP transport was unavailable, so exploration used `codegraph.cmd explore` plus focused source reads. No index/config change was made.

### F2 — P1 controlled locking

Use `isInitialLoading || isSaving` for builder fieldset disabled/busy. Native buttons/inputs/selects, wizard, policy choice and VM checkboxes inherit disabled semantics for pointer/keyboard. Explicitly reject custom draft callbacks while locked: group drop/clear, VM selection, tier create/edit/delete/reorder, metadata/policy updates, source confirmation and Save. Reuse confirmation's existing loading/disabled contract for its dialog controls independently of DOM placement. Preserve draft and unlock after failed request; test edit/retry and submitted payload.

F2 checkpoint passed: builder + both pages + integration suites passed **88 tests across four files** (40.75s). Tests verify keyboard/mouse metadata lock and unlock, disabled wizard/Save, submitted snapshot preserved, real tier drag/drop rejected during Save, VM selection protected and source-confirmation buttons locked. Focused builder ESLint passed after removing the type import made unused by the improved real-canvas fixture; diff check passed. No TierCanvas, shared controls or shared guard source changes were needed.

### F3 — P2 exclusive Save and navigation

Extend only Application completion interface with `isSaving`, synchronous `beginSave(): boolean`, and `failSave(): void`. Pages map payload before beginning Save, then retain per-call mutation success and add per-call error completion. A ref rejects duplicate starts before rerender. Page Back and builder controls use that same save lock.

Keep shared `useUnsavedChangesGuard` unchanged if tests prove sufficient: pass `isDirty || isSaving`; hide pending Discard while saving, suppress stale confirmation callbacks, cancel pending actions on Save start/settlement, and reset blocked router navigation with the latest guard (not the stale submitting-render blocker). Success clears dirty and stale navigation, then locally exits once or shows the existing Push result. Failure clears the Save lock and stale navigation, preserving dirty draft; the next navigation uses normal confirmation. Repeated completion/dismiss callbacks must not navigate twice. Provider catalog still comes from submitting render; API/cache/push contracts are unchanged.

Implemented rules: refs protect duplicate starts, stale confirmation and duplicate completion/navigation synchronously; `useLayoutEffect` keeps only the guard reference current for asynchronous settlement. `completeSave` still closes over the submitted provider catalog. `failSave` cancels any route blocked during Save and preserves dirty state. Page Back is disabled, builder Cancel is covered by fieldset, and direct callback requests are refused while Save or completed Push owns the lifecycle. Map payload before acquiring Save lock so a synchronous mapper error cannot strand it. No API adapter changes.

F3 page/hook/integration checkpoint: **64 tests across four files passed** (29.20s), including controlled HTTP failure, locked input/Back/Cancel, correction/retry, no stale Discard, no duplicate submission, real-router cancel/reset, stale handler invocation and exactly-once local/Push exit. A stale hook snapshot after local-route unmount was not treated as live dialog state; assertions use the actual destination after unmount and live dialog state for the remaining Push screen. Focused ESLint for all nine changed source/test files passed.

### F4 — verification and scope

Run affected builder, Create/Edit, real mutation integration, completion hook, mutation hook, shared guard and response dialog suites. Also retain wire/dialog/URL regressions; Group Create/Edit regression is mandatory if shared guard changes. Run `npm.cmd run typecheck`, `npm.cmd run lint`, `git diff --check`. No complete suite/build by default. Record exact counts and any browser limitations; jsdom is not browser smoke.

### Planned files

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx` and `.test.tsx` — controlled native and custom mutation lock.
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.ts` and `.test.tsx` — exclusive Save, guard coordination and once-only exit.
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx` and `.test.tsx` — start/error lifecycle and disabled Back.
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx` and `.test.tsx` — same with existing Edit locks preserved.
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx` — HTTP pending/failure/retry and lock/navigation checks for both pages.
- These two Markdown files — evidence/status. Shared guard source/tests stay unchanged unless an independently demonstrated need requires a documented small extension.

### Hardening verification results and remaining limitations

**P1 and P2 fixed within the approved scope.** Final command (aliases defined above):

```powershell
npm.cmd exec -- vitest run $B $A $E $I $C $H $W $G $R $D $GB $GE $L
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

Results: **13 files, 177 tests passed**, Vitest 4.1.11, 94.90s. Typecheck (`tsc -b`) and full ESLint/Orval feature-layout validation exited 0. Whitespace check passed. Final hook-only checkpoint before F4 also passed all 19 cases. The real HTTP failure fixture demonstrates a locked draft/Back/Cancel, preserved pre-submit values, unlocked correction and successful retry on both pages. Router tests cover clean/dirty pending Save, cancellation of blocked routes after failure, stale Discard before/during/after Save and once-only local/Push navigation.

Final author review: every parent `formState` mutation is guarded during Save/initial loading; native controls use disabled semantics rather than styling. Save start is synchronous and exclusive; cancellation uses the current router guard, provider URL uses the original submitting catalog. Shared `useUnsavedChangesGuard`, shared controls/dialog source, generated contracts, mutation adapters, query keys, cache policy and Recovery Group production source remain unchanged. The earlier extraction's uncommitted wire/mutation tests were preserved. No suppressed checks, skipped source tests, branch/worktree, commit or push was introduced. HEAD remains `3be15822176e5cdbc9846203d750d79a7537950a`.

Exactly nine source/test files changed in this follow-up, as listed under Planned files, plus this plan and its checklist. The module and integration test files were already untracked at the start of hardening; they were updated in place, preserving the extraction. Earlier 168-test results above are historical; current hardening evidence is the 177-test run.

Browser smoke was **not** executed: no browser automation tools/runner were available in the session/workspace. jsdom covers keyboard/pointer disabled semantics, controlled HTTP and the real in-memory router; it does not establish native browser refresh dialogs, browser drag/drop rendering, live-backend deployment or external Airflow access. The complete test suite and production build were not run. These verification limits are retained explicitly; no remaining P1/P2 implementation defect was identified by the focused tests or author review.
