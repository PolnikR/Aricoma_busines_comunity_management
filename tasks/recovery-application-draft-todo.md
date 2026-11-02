# Candidate 6: Recovery Application draft implementation TODO

Companion: [architectural plan](recovery-application-draft-plan.md). Implementation was separately authorized by the user. Checked tasks below are backed by executed evidence; only final human acceptance remains pending.

Work on `spike/ant-design-shell`; do not create branches/worktrees. Recheck HEAD and worktree before starting. Preserve concurrent changes. The planning baseline is HEAD `3db58bbe793216d1c4087c4ef9c838edf96312dd`. Do not change generated contracts, queries, mapper/validator production behavior, tier drag algorithm, Recovery Group lifecycle, pages or Candidate 4 Save hook. Deferred hardening in the plan is not part of these tasks.

## Verification command catalogue

Run from repository root in PowerShell. These are reusable exact commands, not broad test-suite aliases. Every task identifies the applicable commands. No production build is required: `npm run build` also runs the complete suite and API checks.

**V-B (Builder):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx
```

**V-M (metadata integration):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx
```

**V-W (final validation and wire mapping):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts
```

**V-T (tier presentation):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx
```

**V-D (new transitions; only after Task 4 creates the file):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts
```

**V-R (new readiness; only after Task 7 creates the file):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts
```

**V-S (Candidate 4):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx
```

**V-L (focused production lint, select only files changed in the current slice):**

```powershell
npm.cmd exec eslint -- src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.ts src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx --max-warnings 0
git diff --check
```

Before both model files exist, omit the nonexistent paths and unchanged files. Apply the same focused ESLint command to changed test paths when applicable. `vitest.config.ts` allows no-test runs, so an exit code alone is insufficient: check discovered test/file counts are nonzero and match the intended paths.

**V-ALL (F4 focused regression, 13 files after extraction):**

```powershell
npm.cmd exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationBuilderPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationEditorPage.test.tsx src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx src/features/recovery-plans/recovery-applications/hooks/useRecoveryApplicationSaveCompletion.test.tsx src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts
npm.cmd run typecheck
npm.cmd run lint
git diff --check
```

For the pre-extraction baseline, use the ten-file command in the plan; do not invoke nonexistent model tests. Typecheck/lint are explicitly requested final static checks; do not run the complete test suite or production build by default.

## F0: Architecture decision

### Task 0: Approve the extraction contract

- [x] Complete Task 0.

**Description:** Reconcile the plan with the current checkout and approve two pure modules, descriptor-based confirmation, current compatibility behavior and the limited file inventory.

**Acceptance criteria:**

- [x] Confirm current branch/HEAD/status, review original Candidate 6 and ADR 0002, and reconcile any concurrent changes.
- [x] Approve the exact TypeScript API, responsibility boundaries and dirty table; explicitly retain readiness/final-validation separation and deferred hardening.
- [x] Obtain a separate implementation request and record design approval before any source/test edit.

**Verification:** `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, `git diff --check`; review all 17 plan deliverables against the request. Evidence: reviewed HEAD, approval and scope notes. No code tests/build needed for this document review.

**Dependencies:** None. **Files likely touched:** `tasks/recovery-application-draft-plan.md`, `tasks/recovery-application-draft-todo.md`. **Estimated scope:** Small (2 documents).

### F0 checkpoint

- [x] Design reviewed and approved; interfaces fixed without implementation.
- [x] Worktree ownership understood; no unrelated work overwritten.
- [x] GO accepted for pure extraction; no reducer/shared engine or hidden behavior changes.

## F1: Characterization baseline

### Task 1: Characterize the source transaction

- [x] Complete Task 1.

**Description:** Add source/target and pending-confirmation assertions against current production code before moving decisions.

**Acceptance criteria:**

- [x] Cover unchanged source, second VMware source, cross-type source, no-Group immediate apply and target-only updates, including invalid/unknown target/provider cases. Characterize a combined patch `{ platform: currentSourceId, name: 'Updated' }` as an applied metadata change without confirmation, versus an identical-value patch and a lock-filtered provider-only patch as effective no-ops (while preserving callback-level dirty notifications).
- [x] Prove proposal changes nothing before accept; cancel preserves source/target/Groups; acceptance detaches multiple tiers preserving IDs/descriptions/order.
- [x] Capture intervening metadata/target edits, proposal replacement/provider refresh and dirty counts, with Save-time confirmation locked.

**Verification:** V-M plus `git diff --check`. Tests must pass on current code; retain exact expected state and call counts, not snapshots. The newly designed authority-becomes-locked defense is tested in Task 4, not asserted as existing behavior here. Evidence: new case names and passing totals.

**Dependencies:** Task 0. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`

**Estimated scope:** Small (2 files).

### Task 2: Characterize Group, VM and tier transitions

- [x] Complete Task 2.

**Description:** Extend the existing Builder test harness to observe callback state, payload and dirty semantics that component callback-only tests do not prove.

**Acceptance criteria:**

- [x] Capture eligible/missing/incompatible/unpublished Group assignment/removal and all VM metadata fields, including no dirty for rejected Group and dirty for eligible Group targeting an absent tier.
- [x] Capture VM add/remove/re-add, stable selection/sequential order, duplicate no-op dirty, missing Group/unknown names, preserved survivor metadata and input immutability. Explicitly test a Group's first VM with `vmMetadataByName[name].order = 8`: initial assignment must retain `order: 8` because metadata is spread after `index + 1`; a subsequent actual VM selection change must reindex selected VMs from 1.
- [x] Capture tier add/edit/rename/delete/reorder, Map insertion versus numeric order, metadata retention, UI last-tier/normalized-ID constraints and existing handler preconditions.

**Verification:** V-B and V-T; `git diff --check`. Evidence: assertions against saved state, unchanged input Map entries/nested values and exact dirty counts. Do not change production guards or reorder behavior to make characterization tests pass.

**Dependencies:** Task 1 (shared Builder harness). **Files likely touched:** `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`. **Estimated scope:** Small (1 file; split cases within the file if needed).

### Checkpoint after Tasks 1-2

- [x] Source transaction and membership/order/dirty baseline is passing against unchanged production code.
- [x] Every test distinguishes current behavior from desired hardening.
- [x] Review evidence before starting module extraction; no unexplained failure waived.

### Task 3: Characterize readiness and rich wire payloads

- [x] Complete Task 3.

**Description:** Record the readiness/submit differences and a rich expected payload that can later be reused to prove mapping parity.

**Acceptance criteria:**

- [x] Cover all step predicates, locked loading/error/empty provider data, cached-data errors, Groups loading and credential differences between Create and locked Edit.
- [x] Explicitly assert current zero-tier validator acceptance versus disabled UI Save, stored invalid Group final rejection, and current policy/Push gating.
- [x] Assert an exact multi-tier payload with every VM metadata field, stored authority, environment and string/null/missing notification email; retain existing IBM Power/LPAR cases.

**Verification:** V-B and V-W; `git diff --check`. Evidence: named truth-table cases and concrete `toEqual` payload objects that remain unchanged after extraction.

**Dependencies:** Task 2. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/utils/validateRecoveryApplication.test.ts`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`

**Estimated scope:** Medium (3 files).

### F1 checkpoint

- [x] Current ten-file baseline command from the plan passes with new characterization cases.
- [x] Source/target, lock, VM/order/metadata, dirty, readiness/validation and rich payload expectations are recorded.
- [x] Production source remains unchanged; review approves moving the characterized rules.

## F2: Pure domain module extraction

### Task 4: Implement initialization and metadata decisions

- [x] Complete Task 4.

**Description:** Create the draft module with the selected types, default/clone initializer and atomic metadata/source transaction.

**Acceptance criteria:**

- [x] `createApplicationDraft` matches defaults and current clone behavior without mutating inputs; no implicit Push or provider inference.
- [x] `planApplicationMetadataChange` owns target reset, strips locked provider updates, returns typed unchanged/applied/confirmation decisions with correct dirty policy. `unchanged` means no effective scalar metadata value changed after lock filtering, **not** merely unchanged source. A same-source patch changing `name` must return `applied`; an identical-value/lock-filtered no-op retains the current callback-level dirty behavior.
- [x] `applyConfirmedSourceChange` merges the scalar descriptor into latest state, detaches all Groups only when editable, preserves cancellation/refresh semantics and enforces a newly active provider lock.

**Verification:** V-D and focused V-L; `git diff --check`. Evidence: Node-environment tests for proposal/apply, frozen nested inputs, same/different/unknown types, retained later edits and locked authority. Do not integrate Builder yet.

**Dependencies:** Task 3 and F1 checkpoint. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts`

**Estimated scope:** Small (2 files).

### Task 5: Implement Group and VM operations

- [x] Complete Task 5.

**Description:** Add the Group assignment/removal and VM-selection operations, sharing current eligibility predicates.

**Acceptance criteria:**

- [x] Assignment reuses `isRecoveryGroupEligible`, copies Group/VM values in resource order, and preserves current early rejection/dirty behavior. Preserve assignment spread order `{ name, order: index + 1, ...vmMetadataByName[name] }`: metadata `order: 8` overrides the first VM's computed `order: 1`; reindex to 1..N only after a subsequent actual VM selection change.
- [x] Removal and VM selection preserve characterized tier shape, metadata precedence, sequential order, unknown/missing data behavior and no-op dirty signals.
- [x] Neither inputs nor query data are mutated; compatible Groups remain usable for VM metadata independently of publication.

**Verification:** V-D and focused V-L; `git diff --check`. Evidence: rich VMware/Power fixtures, duplicate/re-add cases, original Map/nested equality and rejected assignment assertions.

**Dependencies:** Task 4. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts`

**Estimated scope:** Small (2 files).

### Checkpoint after Tasks 4-5

- [x] Pure source/Group/VM tests pass without React/DOM or query mocks.
- [x] No copied eligibility rules, adapter changes or dirty-on-equality optimization.
- [x] API still matches the approved plan; production Builder remains on baseline behavior.

### Task 6: Implement tier transformations

- [x] Complete Task 6.

**Description:** Add public add/edit/delete/apply-order functions for valid existing UI callback inputs.

**Acceptance criteria:**

- [x] Rename preserves Group/VM data and numeric order while matching current Map delete/set insertion semantics.
- [x] Add/delete preserve current max-order/UI preconditions, deletion gaps and callback dirty behavior; no new zero-tier or duplicate-ID rejection.
- [x] Apply-order consumes the existing algorithm result immutably, without DOM state or changing `calculateTierReorder`.

**Verification:** V-D and V-T; focused V-L; `git diff --check`. Evidence: exact key/order/content assertions and unchanged original nested data. UI final-tier protection remains tested separately.

**Dependencies:** Task 5 (shared module). **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraft.test.ts`

**Estimated scope:** Small (2 files).

### Task 7: Implement readiness projection

- [x] Complete Task 7.

**Description:** Create the independent readiness module with the exact eight return fields and current predicate semantics.

**Acceptance criteria:**

- [x] Details/tiers/policy/orchestration/continue/Save formulas match the plan across Create, Edit and steps 1-4.
- [x] Undefined providers, loaded-empty providers and cached data with errors remain distinct; stored verdict uses `storedProvidersProblem` only when loaded without error.
- [x] Readiness does not invoke full final validation or add query-fetch/error/membership requirements absent from current UI predicates.

**Verification:** V-R and V-W; focused V-L; `git diff --check`. Evidence: table-driven Node tests including Group-present-but-invalid, zero tiers, legacy IDs, same HMC and locked credential asymmetry.

**Dependencies:** Task 3; scheduled after Task 6 for the F2 checkpoint. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.ts`
- `src/features/recovery-plans/recovery-applications/model/recoveryApplicationDraftReadiness.test.ts`

**Estimated scope:** Small (2 files).

### F2 checkpoint

- [x] V-D, V-R and `npm.cmd run typecheck` pass; record counts and exit codes.
- [x] Model modules import only types and pure helpers; no React/query/network runtime dependencies.
- [x] No mapper, validator, generated contract, query, algorithm or Candidate 4 hook modification.

## F3: Incremental Builder integration

### Task 8: Delegate metadata and confirmation

- [x] Complete Task 8.

**Description:** Migrate initialization/source/target/confirmation as one coherent UI path, removing target-reset decisions from AppMetadataForm.

**Acceptance criteria:**

- [x] Builder uses the initializer and metadata planner; AppMetadataForm emits raw metadata intent and keeps controlled provider values/options/missing labels.
- [x] Builder stores only the pending descriptor and controls ConfirmDialog; cancellation/acceptance, latest-state merge and all disabled guards remain intact.
- [x] Move reset assertions from isolated metadata-parent merging to domain/Builder tests; preserve call-count dirty behavior outside state updaters and deployed Push initialization.

**Verification:** V-M, V-D and V-S; focused V-L; `git diff --check`. Evidence: same-type multi-tier detach, cross-type reset/cancel, pending dialog during Save, no reset of failed-Save values. No direct domain updates bypass disabled callbacks.

**Dependencies:** Tasks 4-7 and F2 checkpoint. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/AppMetadataForm.test.tsx`

**Estimated scope:** Medium (4 files).

### Task 9: Delegate Group membership

- [x] Complete Task 9.

**Description:** Replace Builder assignment/removal transformations with pure Group functions while retaining sidebar/query projections.

**Acceptance criteria:**

- [x] Assignment/removal delegate domain transformations with current providers, Groups and locks; Group eligibility remains rechecked.
- [x] No-op/rejection dirty semantics and immutable metadata copies match characterization.
- [x] Pending Save rejects direct resource drop/removal callbacks and leaves existing state unchanged.

**Verification:** V-B and V-D; focused V-L; `git diff --check`. Evidence: assignment payload, removal tier shape, rejected unpublished Group and pending drop assertions.

**Dependencies:** Task 8. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (2 files).

### Checkpoint after Tasks 8-9

- [x] Source/target confirmation and Group membership use model operations with unchanged Create/Edit behavior.
- [x] UI still owns queries/dialogs; dirty calls are outside functional state updaters.
- [x] Focused tests and disabled-callback assertions pass before further integration.

### Task 10: Delegate VM selection

- [x] Complete Task 10.

**Description:** Replace the inline VM selection handler with the pure function while retaining current VM option rendering.

**Acceptance criteria:**

- [x] VM selection delegates metadata/order behavior using compatible Group context and current draft.
- [x] Duplicate/no-op, unknown-name/missing-data and remove/re-add cases retain state and dirty semantics.
- [x] Every VM edit is rejected while saving; resulting rich Save payload matches the characterization fixture.

**Verification:** V-B, V-D and V-W; focused V-L; `git diff --check`. Evidence: VM array equality including all metadata and order fields plus original-input equality.

**Dependencies:** Task 9. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (2 files).

### Task 11: Delegate tier transformations

- [x] Complete Task 11.

**Description:** Replace Builder tier add/edit/delete/reorder transformations without changing tier component contracts or drag logic.

**Acceptance criteria:**

- [x] All four handlers delegate to model functions; normalized-ID/description and last-tier UI rules remain in their existing owners.
- [x] Numeric tier order, Map insertion behavior and nested metadata/VM selection match baseline through rename/delete/reorder.
- [x] Guards reject every tier callback during pending Save, including a drag started before Save; dirty notifications remain event-level.

**Verification:** V-B, V-D and V-T; focused V-L; `git diff --check`. Evidence: UI-to-saved-state assertions and in-flight drag protection. No algorithm modification.

**Dependencies:** Task 10. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (2 files).

### Task 12: Delegate wizard and Save readiness

- [x] Complete Task 12.

**Description:** Replace Builder predicates with the projection, preserving final validation and Candidate 4 boundaries.

**Acceptance criteria:**

- [x] Step headers, Next, stored-provider warnings and preliminary Save use the projection with uncollapsed provider data/error state.
- [x] `handleSave` still uses the existing final validator with current Groups/providers, alert messages and guarded `onSave`; policy/orchestration scalar edits cannot bypass provider/tier operations.
- [x] Existing query adapters, disabled fieldset/inert region, Push lock and completion hook remain intact; remove only imports/local helpers made unused by this extraction.

**Verification:** V-B, V-R, V-W and V-S; focused V-L; `npm.cmd run typecheck`; `git diff --check`. Evidence: Create/Edit readiness matrix and failure/retry, duplicate Save, navigation/result-dialog regressions.

**Dependencies:** Task 11 and Task 7. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx`

**Estimated scope:** Small (2 files).

### F3 checkpoint (after Tasks 10-12)

- [x] Builder delegates all selected domain decisions; metadata reset has a single owner.
- [x] Characterized behavior, dirty notifications, immutable values and guarded mutations remain equivalent.
- [x] Final validator, mapper and Candidate 4 production hook are unchanged; review confirms no unrelated rewrite.

## F4: Regression and acceptance

### Task 13: Prove integrated Save and payload parity

- [x] Complete Task 13.

**Description:** Exercise real submit wiring with rich draft fixtures after migration and run the required focused regression/static checks.

**Acceptance criteria:**

- [x] Real request bodies match baseline for Create/Edit, stored provider authority, rich tier/VM metadata and notificationEmail, with no generated contract/query-key changes.
- [x] Pending Save blocks duplicate submits, draft callbacks and Back/Discard; failure preserves values/dirty guard, retry succeeds, local/pushed completion behaves unchanged.
- [x] V-ALL passes with explicit counts; any failure is explained and fixed within scope or recorded as a blocker, never suppressed.

**Verification:** V-ALL (13 explicit test paths, typecheck, lint, diff check). Evidence: command outputs/exit codes, exact submitted request assertions and diff review. Production build/full suite not run unless separately justified.

**Dependencies:** Task 12 and F3 checkpoint. **Files likely touched:**

- `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationSaveCompletion.integration.test.tsx`
- `src/features/recovery-plans/recovery-applications/utils/recoveryApplicationFormMapper.test.ts`

**Estimated scope:** Small (2 test files).

### Task 14: Execute isolated browser Create/Edit smoke

- [x] Complete Task 14.

**Description:** Execute the browser procedure with deterministic fixtures and the existing local authenticated development context. Actual isolated Edge CDP was used because Playwright was unavailable; the exact tool deviation and scope limits are recorded below. No browser execution occurred during planning.

**Acceptance criteria:**

- [x] Exercise metadata/provider changes, source confirm/cancel, Group drag/drop, VM/tier order, wizard navigation, locked/missing/legacy providers and deployed Push.
- [x] Exercise delayed Save, blocked edits/navigation/duplicates, failure/retry, local navigation and pushed result dialog; compare captured Create/Edit wire bodies.
- [x] Record reproducible browser/harness/route/fixture details, results and evidence locations; explicitly record any blocked scenario instead of declaring it passed.

**Verification:** Actual isolated browser execution via documented CDP fallback, without installing dependencies or claiming a Playwright trace. Commands: `node .superpowers/sdd/recovery-application-draft-todo/browser/cdp-baseline.mjs --after`, `node .superpowers/sdd/recovery-application-draft-todo/browser/cdp-extended.mjs --after`, and `node .superpowers/sdd/recovery-application-draft-todo/browser/verify-browser-evidence.mjs`. Evidence: screenshots, CDP console/network events, behavioral assertions, exact original Edit request parity and complete Create oracle.

**Dependencies:** Task 13. **Files likely touched:** `tasks/recovery-application-draft-plan.md`, `tasks/recovery-application-draft-todo.md` (evidence links only; no expected production edits). **Estimated scope:** Small (2 documents plus external browser evidence).

### Checkpoint after Tasks 13-14

- [x] Required focused tests, typecheck and lint pass with output recorded.
- [x] Create/Edit browser behavior and exact payload parity are proved by executed evidence, or acceptance remains explicitly blocked.
- [x] No complete-suite/build or browser claim exceeds what actually ran.

### Task 15: Review scope and accept extraction

- [x] Complete Task 15.

**Description:** Compare final implementation and evidence against the approved plan, then record acceptance without expanding into deferred hardening.

**Acceptance criteria:**

- [x] Verify model ownership/API/no-React boundary, metadata raw intent, readiness/validation distinction and unchanged mapper/generated/Save lifecycle contracts.
- [x] Verify every characterization-matrix row has evidence and all implementation tasks are complete; unresolved browser or behavior failures remain blockers.
- [x] Record final diff/HEAD, commands/results, remaining limitations and rollback slice; follow the then-current implementation request for commit handling, never infer permission to push.

**Verification:** `git diff --check`, `git diff --stat`, `git status --short`; review only task-owned diff and evidence. Rerun affected focused tests only if review leads to changes. Evidence: acceptance notes in these two documents.

**Dependencies:** Tasks 13-14. **Files likely touched:** `tasks/recovery-application-draft-plan.md`, `tasks/recovery-application-draft-todo.md`. **Estimated scope:** Small (2 documents).

### F4 / final checkpoint

- [x] All approved acceptance criteria are met, including compatibility quirks and Candidate 4 protections.
- [x] Required focused tests/static checks pass and actual browser smoke executed via the documented CDP fallback.
- [x] No unrelated scope, generated changes, framework/reducer, validator hardening or API transport change.
- [ ] Human final acceptance recorded; any optional hardening is a separate future request.

## Execution evidence ledger

Planning baseline only: ten existing files / 213 Vitest tests passed; typecheck and lint passed. Full static/artifact validation results and the unrelated concurrent prototype-only HEAD advancement are in the plan's final validation record. The original planning request created only these two documents. The subsequent explicit implementation request authorized the checked F0-F4 work; no push or merge was performed.

For each future completed task, record the relevant HEAD, modified paths, commands with exit codes and test counts, characterization/payload/browser evidence, and any deviation approved during implementation. Never check a checkpoint based solely on intended tests.

## Final execution evidence (2026-10-26)

- Source accepted at `ec23bc21`; independent per-task and whole-change reviews found no remaining findings.
- V-ALL: **13 files / 403 tests passed**, duration 87.84 s.
- `npm.cmd run typecheck`: passed on the final source/test commit.
- `npm.cmd run lint`: passed (full ESLint and feature-layout guard). First full lint had only third-party extension warnings in disposable test browser profiles; those profiles/cache were moved outside the repository and the unchanged command re-passed. No quality rules were weakened.
- `git diff --check`: passed; final document assertions, typechecked API declarations, archive links and scope/status checks passed before documentation commit.
- Browser: exact original Edit method/URL/body parity;14 extended scenario groups; full Create request oracle; exactly4 extended submissions; zero unexpected runtime/console/network errors. Intentional Save/provider failures and unseeded policy-detail501 responses are recorded in the browser report.
- Method deviation: isolated Edge CDP, no Playwright trace, no physical pointer gesture or real Keycloak session. Original Create browser baseline and every synthetic pending-mutation permutation were not executed; complete Create wire tests and focused component/domain Save-guard tests provide their separate evidence.
- [Browser acceptance report](C:/Users/polnikr/AppData/Local/Temp/recovery-application-draft-evidence-20261026-wAFat4/browser-acceptance-report.md), [final source review](C:/Users/polnikr/AppData/Local/Temp/recovery-application-draft-evidence-20261026-wAFat4/final-review.md). Archive contains per-phase command reports and raw browser evidence; runtime profiles/cache were excluded. Run corrected archived harnesses directly from OS temp with the repository as cwd; never restore them into the checkout.
- Full suite and production build were not run. Branch remains `spike/ant-design-shell`; no push/merge/worktree creation. Final human acceptance is the sole open checklist item.

## Post-handoff dev-server recovery

- [x] Reproduced real localhost5173 dependency failure: `@tanstack/react-virtual` returned504 `Outdated Optimize Dep`; initial fixture Vite host had overwritten the shared default cache.
- [x] Restarted the existing Vite optimizer through the config watcher without changing configuration content; dependency returned200 and126 static modules loaded without errors.
- [x] Real-server isolated Edge dynamic import passed; no authenticated full-page claim, writes or user-session access.
- [x] Corrected four archived harnesses to use OS-temp private caches/profiles and reject in-repository execution; syntax and actual guard checks passed with live cache unchanged.

Detailed cause, recovery and evidence are in the plan's post-handoff incident section. Source code is unchanged; no full suite or build rerun for this operational fix.
