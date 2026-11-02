# Recovery Application Save Completion — execution checklist

**P1/P2 follow-up:** implemented and automatically verified; see the appended checklist. Original extraction checkboxes below are historical. No commit/push; browser smoke remains unverified.

Plan: [recovery-application-save-completion-plan.md](recovery-application-save-completion-plan.md).

Execution approved on 2026-10-22, inline. Tests and a checkpoint follow every phase. No unplanned behavior changes; protect other agents' work. Do not create branches/worktrees, commit or push. Planning-time runs are baseline evidence only. F1–F3 checkpoints and F4 automated checks passed; browser smoke is blocked by missing tooling. Independent/human review is pending.

## F1 — Characterization & baseline

### F1.1 — Application completion characterization

**Description:** Establish observable Create/Edit behavior before extraction and retain focused regression cases.

**Dependencies:** Explicit implementation approval; none within F1.

**Files likely touched (medium, three files):**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx` (real mutation/HTTP coverage shared by both pages; added after reviewing existing mocks)

**Acceptance criteria:**

- [x] Add local Edit success and clean Back coverage; assert no push dialog and exact list navigation.
- [x] Add failed Save after an edit, preserved draft/dirty guard, no navigation, and successful retry; assert no Save error for skipped/null success.
- [x] Add permanent pending-edit and pending-discard success characterizations for both pages, including unload and dismissal/navigation effects; label race preservation explicitly.

**Verification:**

- [x] Run V1; verify local/pushed/skipped/null/manual-only/provider/dismissal assertions remain green.
- [x] Run V6; record output in the plan.

**Rollback:** Remove only this task's new cases, preserving all pre-existing edits.

### F1.2 — Pending builder and actual mutation lifecycle

**Description:** Distinguish page fixture evidence from actual editable-builder and Query observer behavior.

**Dependencies:** F1.1.

**Files likely touched (medium, three files):**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications.test.tsx`
- `src/features/recovery-plans/recovery-applications/hooks/recoveryApplicationsWire.test.tsx`

**Acceptance criteria:**

- [x] Verify a real builder edit and another dirty notification while Save is pending; Save button remains disabled, wizard/edit controls retain current behavior.
- [x] Add deferred real-QueryClient cases for rejected submit, overlap/latest observer and unmount callbacks; establish invalidation starts before per-call completion without waiting for refetch.
- [x] Verify local response drops unexpected wire push data; retain pushed/skipped/null/omitted wire normalization assertions.

**Verification:**

- [x] Run V1 and V2; map assertions to each matrix row, explicitly noting remaining limitations.
- [x] Run V6.

### F1 checkpoint — baseline and scope accepted

- [x] Review all Create/Edit differences, mutation behavior, provider resolution and edit locks against current source.
- [x] Record a green baseline with exact counts; do not substitute planning-time counts for new output.
- [x] Explicitly acknowledge compatibility extraction retains the confirmed pending-edit race; revise the plan before F2 if a fix is required in scope.
- [x] Confirm no Group source/tests or existing uncommitted work was changed by this task.

## F2 — Completion module

### F2.1 — Dirty navigation and local save

**Description:** Introduce Application-specific lifecycle ownership without integrating either page yet.

**Dependencies:** F1 checkpoint and approved plan.

**Files to create (small, two files):**

- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.ts`
- `src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx`

**Acceptance criteria:**

- [x] Implement the exact plan interface; hook owns dirty boolean and delegates to existing guard, using the applications route for navigation.
- [x] Cover clean/dirty Back, discard cancel/confirm, beforeunload and real-router blocked/proceeded paths through the public interface.
- [x] Cover immediate local success navigation with guard bypass; leave mutation/payload/error/pending/cache concerns outside.

**Verification:**

- [x] Run V3 and focused ESLint for both new files.
- [x] Run V1 to confirm unchanged page behavior; run V6.

**Rollback:** Remove the two unreferenced new files only.

### F2.2 — Push result lifecycle and asynchronous context

**Description:** Complete dialog ownership and preserve submitting-render context.

**Dependencies:** F2.1.

**Files likely touched (small):** The same two F2.1 files.

**Acceptance criteria:**

- [x] Store one nullable dialog object; cover pushed/skipped/null, full manual-only result preservation, and the existing response-property predicate without re-normalizing wire data.
- [x] Resolve provider URL inside hook from submitted provider ID and submitting render's catalog; test missing provider/null URL and catalog changes while a request is pending.
- [x] Cover result dismissal and bypassed exit, pending-discard parity and newer-edit dirty reset as documented compatibility; no token registry, reducer framework or implicit race fix.

**Verification:**

- [x] Run V3 and focused ESLint for both module files; run V6.
- [x] Confirm tests assert exposed state, dialogs/guards and routing outcomes rather than private setter calls.

### F2 checkpoint — cohesive and independently tested

- [x] One module owns completion ordering, dirty state, provider context, result and dismissal/navigation.
- [x] Both old pages still pass V1; module passes V3 without adapter, generated, guard or dialog source changes.
- [x] Review interface against plan; record why a hook suffices without a pure transition framework.

## F3 — Integration

### F3.1 — Migrate Create

**Description:** Replace Create's completion state and branches with the new hook.

**Dependencies:** F2 checkpoint.

**Files likely touched (small, two files):**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx`

**Acceptance criteria:**

- [x] Keep payload mapping, mutation invocation and submit error UI; copy submitted descriptor and call captured completion function only from per-call success.
- [x] Wire dirty/Back/Cancel/discard/result close to hook; remove page completion state, provider lookup and guard bypass code.
- [x] Preserve local/push/error/dirty/manual-only/provider behavior with real completion hook in page tests.

**Verification:**

- [x] Run V3 and first V4 command (Create); focused ESLint on changed Create files; V6.

**Rollback:** Restore only Create migration edits; Edit can remain on its old flow.

### F3.2 — Migrate Edit

**Description:** Use the same completion hook without changing stored-provider/push locks or draft initialization.

**Dependencies:** F3.1 verification passes.

**Files likely touched (small, two files):**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.tsx`
- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx`

**Acceptance criteria:**

- [x] Apply identical completion integration; retain locked-provider mapper arguments and notification email.
- [x] Preserve filename key/disabled filename, initial loading, locked stored platform/source/target IDs and backend-pushed lock; do not infer pushed from run ID alone.
- [x] Keep loading/load-error/not-found/error presentation and mounted draft behavior; remove duplicated completion state and branching only.

**Verification:**

- [x] Run V3, second V4 command (both pages), and V2; focused ESLint on changed Edit files; V6.

**Rollback:** Restore only Edit migration edits; retain hook while Create uses it.

### F3 checkpoint — shared completion

- [x] Both pages use one module; no direct page guard bypass, completion URL lookup or result/name/URL state remains.
- [x] Submit payload mapping, adapter/normalizer, query keys and invalidation policy remain unchanged.
- [x] Both caller suites and new module suite pass with behavior matching F1 evidence.

## F4 — Regression & acceptance

### F4.1 — Automated acceptance evidence

**Description:** Validate affected contracts and unchanged Group behavior; record failures without suppressing checks.

**Dependencies:** F3 checkpoint.

**Files likely touched:** This checklist and the companion plan for evidence only; no planned source changes.

**Acceptance criteria:**

- [x] V1–V4 applicable tests pass, including required page/wire/hook/dialog/guard/Group suites, real-builder pending behavior and URL rules.
- [x] V5 typecheck and ESLint pass; V6 passes; distinguish unrelated pre-existing failures if encountered.
- [x] Compare final diff to exact planned files and confirm Group and generated sources are untouched.

**Verification:**

- [x] Run V1, V2, V3, V5, V6 once against final source; V4 is already subsumed by V1, repeat it only if changes justify it.
- [x] Record exact commands/counts and any pre-existing warnings or failures; complete test suite/build need not run.

### F4.2 — Browser smoke and review

**Description:** Validate browser routing, unload and external-link behavior with documented backend/tooling limits.

**Dependencies:** F4.1.

**Files likely touched:** Companion plan/checklist for evidence only.

**Acceptance criteria:**

- [ ] Smoke both pages: local Save; pushed/manual-only dialog and DAG URL; skipped/null/missing results; close-to-list; error retaining draft; Back cancel/confirm; edit locks. **Blocked:** no Chrome DevTools MCP or installed browser runner.
- [ ] Check actual browser Back/refresh and slow Save followed by edit; record retained race behavior without claiming it fixed. **Evidence 2026-10-27:** real Edge + Playwright (mock POST) verified pending Save disables UI Back and repeat Save, HTTP 500 preserves editable draft, retry succeeds and navigates. **Still open:** native browser Back/refresh during an unresolved Save and follow-up edits; real authenticated backend. Browser tooling itself is now available.
- [x] Identify real-backend versus stubbed scenarios and any unavailable environment, Airflow permission or browser limitations explicitly.

**Verification:**

- [x] Record browser, environment, actions and observed outcomes in the plan; mark blocked smoke items as blocked, not passed.
- [x] Review acceptance matrix against evidence and request review of the concrete implementation before any later integration action. Author inline review completed; independent/human review remains pending, with no commit/push.

### Final definition of done

- [x] Explicit implementation approval exists; compatibility scope or an explicitly revised race-fix scope is recorded.
- [ ] F1–F4 acceptance checkpoints have current evidence; all unresolved failures/limitations are visible. **Remaining:** actual browser smoke; automated checkpoints passed.
- [x] One Application-owned completion implementation, two migrated callers, meaningful hook/page/transport/guard coverage.
- [x] No Group refactor, generated contract change, backend change, cache-policy change, generic framework, unrelated UI change or unapproved race behavior change.
- [x] Final report lists focused commands, browser evidence/limitations and complete-suite/build omissions.

### Separate prioritized repair (excluded from extraction)

- [x] **P1 — Save/dirty race:** resolved by the explicitly approved controlled form lock, with P2 navigation hardening. See the appended hardening section for current behavior, tests and evidence; the original compatibility-only treatment above is historical.

## Exact verification commands

Run these from repository root in PowerShell. Variables are task-specific aliases, not environment configuration. `npm.cmd` avoids blocked `npm.ps1`; `--` forwards flags to the tool.

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

# V1
npm.cmd exec -- vitest run $A $E $W $H $R $D $G $GB $GE $I
# V2
npm.cmd exec -- vitest run $B $L
# V3 (after F2 file creation)
npm.cmd exec -- vitest run $C
# V4 (Create, then both callers)
npm.cmd exec -- vitest run $A
npm.cmd exec -- vitest run $A $E
# V5
npm.cmd run typecheck
npm.cmd run lint
# V6
git diff --check
```

For phase-specific lint, supply exact changed TS/TSX file paths to `npm.cmd exec -- eslint <paths> --max-warnings 0`. For example F2:

```powershell
npm.cmd exec -- eslint src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.ts src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx --max-warnings 0
```

Do not run `npm test`, the full production build, or regenerate API contracts by default. Final full typecheck and lint are explicitly requested; focused suites cover the chosen scope.

## P1/P2 hardening execution

### F1 — reproduce (dependency: explicit user hardening request)

- [x] Run existing eight Candidate 4 suites and record baseline.
- [x] Add and run red tests for pending native/custom draft edits, Save versus stale Discard/router navigation, and duplicate exit.
- [x] Checkpoint: paths needing protection documented before production changes.

### F2 — controlled form locking (dependency: F1)

- [x] Disable/busy fieldset for initial loading or Save; verify mouse and keyboard lock.
- [x] Guard custom draft-changing callbacks and portal source confirmation; prevent duplicate submit.
- [x] Test failed-Save unlock, retained values and correction/retry.
- [x] Checkpoint: focused builder/page/integration tests and diff validation pass.

### F3 — exclusive Save navigation (dependency: F2)

- [x] Add centralized begin/success/failure coordination; page Back and builder share its Save lock.
- [x] Block router navigation/unload and stale Discard authorization while saving; preserve normal guard otherwise.
- [x] Clear stale navigation on settlement; local success and Push dismissal navigate once.
- [x] Checkpoint: real-router hook tests and both page/integration suites pass; no unrelated guard behavior change.

### F4 — regression and acceptance (dependency: F3)

- [x] Run affected focused suites and any required shared-guard/Group regressions. **177 tests across 13 files passed**, including both Group page regressions; shared guard source unchanged.
- [x] Run typecheck, full lint, and diff validation; record exact counts and paths. All exited 0; exact command aliases/paths are in the plan.
- [x] Update plan with problems, selected strategy, final rules, tests and limitations; preserve original history.
- [x] Checkpoint: P1/P2 acceptance proven; browser smoke stated accurately; no commits/pushes or unrelated changes. Browser smoke, complete suite and production build were not run.
