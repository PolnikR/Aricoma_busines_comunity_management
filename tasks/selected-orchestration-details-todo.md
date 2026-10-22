# Candidate 5: Selected Entity Orchestration Details TODO

Companion: [architectural plan](selected-orchestration-details-plan.md). Recommendation: GO for a focused hook with caller-owned provider queries. This checklist is for a future implementation session. All tasks/checkpoints started unchecked. Execution was authorized by the subsequent inline request; completed items have evidence in the plan. No production code, branches, worktrees, generated files, commit or push in the planning session.

## Verification command catalog

Run from the repository root. Commands below name explicit suites; none invokes the complete suite or production build. Record command, exit code, test totals and revision/worktree state in the plan when executed in the future.

### V-A: Existing Application regression

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx
```

### V-G: Existing Group regression

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx
```

### V-CA: New Application characterization (after file exists)

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx
```

### V-CG: New Group characterization (after file exists)

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx
```

### V-D: Existing domain/query contracts

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.test.ts src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx src/config/externalServices.test.ts
```

### V-H: New public hook tests (after file exists)

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.test.tsx
```

### V-R: Recovery Runs context regressions

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.test.tsx src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.test.tsx
```

### V-Q: Implementation acceptance checks

```powershell
npm run typecheck
npm run lint
git diff --check
```

`npm run lint` runs full ESLint and `node scripts/orval/check-feature-layout.mjs`. Before F4, use `node node_modules/eslint/bin/eslint.js <changed-ts-or-tsx-files> --max-warnings 0` with actual changed paths for focused lint. Run broader tests only if the affected scope or new failures justify them. Do not run commands for nonexistent test files: Vitest has `passWithNoTests` enabled, so a successful exit alone is insufficient; confirm expected suite/test counts.

## F0 - Architectural feasibility

### Task 1: Review and accept the selected-detail seam

- [x] Confirm current branch/status and compare the plan's source baseline to the current revision; preserve unrelated work.
- [x] Review GO against keep-current and pure-resolver alternatives, provider ownership A/B, and ADR 0002; accept the exact interface or revise the plan before proceeding.
- [x] Confirm that entityType preserves detail references and disabled-query DAG identity while inventory and routing remain in callers.

**Dependencies:** None. **Scope:** Small, two documentation files.

**Files:** `tasks/selected-orchestration-details-plan.md`, `tasks/selected-orchestration-details-todo.md`.

**Verification:** `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git diff --check`; inspect `docs/adr/0002-generated-react-query-api-layer.md` and the exact source evidence referenced in the plan. Use CodeGraph first for code exploration while `.codegraph/` exists.

**Acceptance evidence:** recorded architectural review, confirmed GO/NO-GO, agreed compatibility contract. If NO-GO, stop after recording the rationale; do not execute F2-F3.

### Checkpoint F0

- [x] Architecture decision and public interface reviewed; affected files and exclusions agreed. This is a future review checkpoint, not a claim that approval was given during planning.

## F1 - Characterization baseline

### Task 2: Characterize Application requests and legacy references

- [x] Add real-client characterization for no selection, Push off, missing provider/run, provider pending/error/absent and eligible normalized requests; prove provider state does not gate lookup.
- [x] Verify Push-off stored run still links in the row but hides detail reference and inventory identity; with Push on/provider missing, inventory retains the run and detail reference stays hidden.
- [x] Assert provider/latest endpoint counts, row link click propagation, fallback URL and encoded Application navigation destination.

**Dependencies:** Task 1. **Scope:** Small/Medium, one new suite and at most the existing table suite for presentation-only assertions.

**Files:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx`; optionally `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`. Production source under test: `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`, unchanged in F1.

**Verification:** V-CA and V-A; focused ESLint on new/changed suites. Use isolated QueryClient + real generated requests, with retries disabled and separate endpoint counters. Exercise actual inventory section when asserting its identity; do not infer identity from a status label.

**Acceptance evidence:** passing counts and exact provider/DAG params; zero latest requests while disabled; one initial latest request for a cold eligible identity; paired stored-run assertions. Do not count inventory requests as latest-run fan-out.

### Task 3: Characterize Group requests and stored-run preservation

- [x] Add the Group equivalent of eligible/disabled and provider-state request characterization, including disabled DAG identity differences.
- [x] Verify Push-off stored run remains in detail, inventory and inventory summary; missing provider does not erase stored references; latest lookup remains disabled where required.
- [x] Preserve successful/pending/failed/empty presentation, provider URL/fallback, row click behavior and encoded Group navigation destination.

**Dependencies:** Task 1; coordinate request fixtures with Task 2, but tests may be authored independently. **Scope:** Small/Medium, one new suite and optionally the existing Group suite.

**Files:** `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx`; optionally `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`. Production source under test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`, unchanged in F1.

**Verification:** V-CG and V-G; focused ESLint on changed suites. Mount real inventory/summary where checking their request identity; no inventory production edits.

**Acceptance evidence:** request counts/params and explicit detail/inventory/summary observations for Push-off stored IDs, plus unchanged navigation and links.

### Checkpoint F1a - After Tasks 2-3

- [x] Both current tables pass characterization before any extraction; source-derived claims have matching runtime evidence or a documented discrepancy requiring resolution.

### Task 4: Characterize selection, cache reuse and observer lifecycle

- [x] In both new table suites, test null -> A -> B -> null, deferred A response after B selection, provider-only and DAG-only changes, fresh cached B revisit and same provider/DAG across distinct entity IDs.
- [x] Verify no old run appears under a new identity, no new selected lookup/poll follows close, and combined provider/latest data/error flags preserve mapper precedence.
- [x] Complete any missing active/terminal, 15-second/15-minute stale-time and no-background-interval checks in the existing latest suite; record B1/B2 rerun evidence.

**Dependencies:** Tasks 2-3. **Scope:** Medium, at most three test files plus plan evidence.

**Files:** both new `RecoveryApplicationsTable.orchestration.test.tsx` and `RecoveryGroupsTable.orchestration.test.tsx` paths above; `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx` if required; `tasks/selected-orchestration-details-plan.md` for evidence.

**Verification:** V-CA, V-CG, V-D, V-R, and V-A/V-G if their test files changed; fake timers and deferred responses restored after tests. Use the generated key helper for cache seeding/identity inspection, not a private replacement key builder.

**Acceptance evidence:** sequence of requested identities and counts; current-table outputs for cached/cold/racing results; polling timestamps; no background interval evidence; fresh baseline command exit codes/counts. A history-hook test is not evidence of selected-table lifecycle.

### Checkpoint F1 - Behavioral compatibility documented

- [x] Matrix gaps are covered for affected behavior; baseline green on current production code. Unexpected behavior is explained before choosing whether to proceed. No production refactoring has occurred.

## F2 - Shared module

### Task 5: Implement the independently tested selected-detail hook

- [x] Implement the plan's exact public interface with one unconditional existing latest-hook invocation, entity-specific DAG/reference projection, selected URL resolution and unchanged mapper invocation.
- [x] Test its public output and real requests for all mapper states, null selection, both entity projections, catalog-independent eligibility, exact params/keys and selection lifecycle; reuse lower-level polling tests rather than rewriting polling.
- [x] Confirm no provider query, raw query exports, new keys/adapters, policy overrides, schema changes or ESLint exemption was introduced.

**Dependencies:** Task 4 and F1 checkpoint; GO reviewed. **Scope:** Small, two new files.

**Files:** `src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.ts`, `src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.test.tsx`.

**Verification:** V-H and V-D; focused ESLint on both new files; `git diff --check`. Existing `src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.ts`, `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.ts` and `src/features/recovery-plans/recovery-runs/model/orchestratorRunsQuery.ts` remain unchanged.

**Acceptance evidence:** expected new suite/test totals, one latest observer, no extra provider request, generated key identity including disabled Application/Group difference, interface-level outputs matching F1 contracts.

### Checkpoint F2 - Independently testable module

- [x] Hook tests pass without table migration; no behavior has moved into a new generated API facade or duplicated mapper/query implementation.

## F3 - Table integration

### Task 6: Migrate Recovery Applications

- [ ] Replace selected-detail coordination with one unconditional hook call using `entityType: 'application'` and the existing provider snapshot.
- [ ] Feed state, URL, displayRunId and canViewRecoveryRuns to the existing consumers; preserve caller-owned Push-gated inventory run and exact navigation callback.
- [ ] Remove only newly unused orchestration imports/variables; retain provider query, raw row links and unrelated workflows.

**Dependencies:** Task 5. **Scope:** Small, table plus its existing test only if setup needs adaptation.

**Files:** `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`; optionally `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`. New characterization suite remains a regression gate.

**Verification:** V-A, V-CA, V-H; focused ESLint on changed files; `git diff --check`.

**Acceptance evidence:** all pre-extraction characterization unchanged and passing; no new provider observer; inventory still gets stored run with Push on/provider missing. Group remains functional with its original coordination until Task 7.

### Task 7: Migrate Recovery Groups

- [ ] Replace Group coordination with the same hook using `entityType: 'group'` and existing provider snapshot.
- [ ] Preserve raw Group detail reference, inventory/summary run IDs, row links, mapper presentation and Group navigation.
- [ ] Remove only newly unused imports/coordination; confirm both tables now share the selected-detail decision sequence.

**Dependencies:** Task 6. **Scope:** Small, table plus existing test if needed.

**Files:** `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`; optionally `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`.

**Verification:** V-G, V-CG, V-H, plus V-A/V-CA to check both consumers together; focused ESLint; `git diff --check`.

**Acceptance evidence:** both table characterization suites pass; Push-off stored Group identity still reaches reference/inventory/summary; no duplicated selected URL/eligibility/normalization/mapper assembly remains in either table.

### Checkpoint F3 - After Tasks 6-7

- [ ] Two callers use one coordination implementation; entity-specific inventory/actions and table provider sources retain their F1 contracts.

## F4 - Regression and acceptance

### Task 8: Verify static and focused runtime contracts

- [ ] Run V-A, V-G, V-CA, V-CG, V-D, V-H and V-R, recording actual suite/test counts rather than assuming no-test success.
- [ ] Run V-Q, retaining full ESLint/layout and typecheck results; inspect the production diff for unchanged generated/cache/provider/inventory/Recovery Runs contracts.
- [ ] Compare request evidence to F1: no initial count growth, unchanged identity and disabled gates, no new provider observer or page fan-out.

**Dependencies:** Task 7. **Scope:** Small, evidence updates in the two planning documents; production fixes require rerunning the affected checks.

**Files:** `tasks/selected-orchestration-details-plan.md`, `tasks/selected-orchestration-details-todo.md`; all exact suites listed in the verification catalog are verification inputs, not planned production changes.

**Verification:** all catalog commands above, `git status --short`, `git diff --stat`, targeted diff inspection. Do not regenerate Orval output. Full suite/build only if separately justified.

**Acceptance evidence:** command exit codes, test totals and request-parity comparison; no reduced thresholds, suppressed rules or skipped tests.

### Task 9: Browser smoke and final acceptance record

- [ ] Smoke both tables: select/switch/close, Overview/Orchestration/Inventory, Push-off stored-run cases, links and navigation destinations; inspect console and endpoint-specific network counts.
- [ ] Confirm Recovery Runs still uses page-limited visible fan-out and existing history behavior; distinguish shared-cache observer requests from new selected-detail requests.
- [ ] Record matrix completion, remaining limitations and reviewed diff; use the plan's reverse-order rollback if acceptance fails.

**Dependencies:** Task 8. **Scope:** Small, evidence in the two documents; no visual redesign.

**Files:** `tasks/selected-orchestration-details-plan.md`, `tasks/selected-orchestration-details-todo.md`. Browser targets are the existing Application, Group and Recovery Runs routes.

**Verification:** browser smoke using existing available browser tooling/session; record environment, fixtures, observed requests and console results. If unavailable, leave the browser checkbox unchecked and report the limitation explicitly.

**Acceptance evidence:** observed UI/network behavior for both consumers, complete regression/static evidence, unchanged out-of-scope production files. This planning session stops before all implementation tasks and performs no commit or push.

### Checkpoint F4 - Acceptance

- [ ] All implementation acceptance criteria in the plan are satisfied with evidence; no additional network fan-out, cache-policy drift or entity contract drift. Any unverified browser step remains explicitly open.
