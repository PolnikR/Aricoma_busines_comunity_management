# Candidate 5: Selected Entity Orchestration Details

## 1. Executive summary

**Recommendation: GO for a narrowly scoped selected-detail coordination module, subject to the characterization checkpoint before migration.** This is an architectural recommendation, not authorization to implement. No production code is changed by this planning task.

Both tables independently decide how selected metadata becomes query identity, when latest-run lookup is eligible, which provider URL to present, how provider/latest-run states feed the mapper, and whether navigation is available. A cohesive hook can own those decisions through one public interface. Keep the existing mapper, latest-run hook, generated queries, presentation, row links, and inventory fetching.

Choose **Option B: caller-owned provider query**, passed as a small snapshot. Introduce `useSelectedOrchestrationDetails` in the existing recovery-runs hooks directory. Retain an explicit `entityType` discriminator because current display rules differ and even disabled-query arguments differ. Keep inventory and navigation destinations in callers. Do not generalize Recovery Runs fan-out or history.

Planning date: 2026-10-22 (Europe/Bratislava). Recorded source/test baseline: `89f7ac52e1c978a9bbaa5f9c1772acd500736a4a`, branch `spike/ant-design-shell`. Initial Git status had only untracked `prototypes/data-workspaces/`; the task did not start from a clean workspace. By final validation those prototype files were tracked at the recorded HEAD, consistent with concurrent workspace activity between initial status and baseline recording. This task did not stage, commit, delete or edit them. Final tracked diff is empty; only the two requested planning documents are untracked. Git also emitted a permission warning reading the user's global ignore file; status and branch commands returned successfully.

The specifically requested filenames supersede the planning skill's generic `tasks/plan.md` and `tasks/todo.md` defaults. Neither requested document existed before this task. Existing plans are not overwritten. The task's explicit prohibition on commit/push supersedes the standing AGENTS.md commit requirement for this planning session.

## 2. Candidate interpretation and evidence

Read the Candidate 5 article (`id="detail"`, “Orchestration details vybratej entity”) in `C:/Users/polnikr/AppData/Local/Temp/architecture-review-recovery-cache-20261021-211912.html`. Its classification is Worth exploring. Its proposed seam is selected-detail coordination; it explicitly leaves entity inventory/actions in callers. The following findings were independently checked against current source using CodeGraph, with targeted reads for omitted sections.

| Evidence | Confirmed responsibility |
|---|---|
| `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx:177-205` | Selection; provider query and URL resolution; Push-gated run; eligibility; DAG normalization; latest lookup; mapper |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx:99-104,131-154` | Same coordination, with different identity derivation |
| `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx:210-224,478-499` | Raw row DAG links; gated detail reference; Application navigation; independently Push-gated inventory |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx:203-220,496-516` | Raw row DAG links; raw detail reference; Group navigation; stored-run inventory and summary |
| `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.ts:11-40` | Generated request, enabled behavior, latest selection, adaptive stale time/polling, loading/error conversion |
| `src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.ts:41-59` | Ordered orchestration interpretation; first matching state wins |
| `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStatus.tsx:47-72` | Status, timestamp, duration, provider label, optional raw-run reference and action presentation |
| `src/config/externalServices.ts:13-34` | Blank/missing provider URL fallback; prefix normalization and URL encoding |
| `src/features/recovery-plans/recovery-runs/model/orchestratorRunsQuery.ts:5-23` | Shared params and raw-response selection |
| `src/generated/query/operations/operations.gen.ts:84-100` | Generated query key and abort signal forwarding; read only |

The duplicate responsibility is **selected orchestration interpretation across asynchronous dependencies**, not the provider fetch or latest-run request implementation. Replacing JSX alone would fail this candidate's purpose.

## 3. Current architecture and compatibility differences

Both tables unconditionally request `useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })`. The selected entity is found in the filtered `rows`, independently of table pagination. When no row matches selection, the hook is still invoked with disabled identifiers and the mapper result is absent. Latest lookup begins on row selection, even while Overview is active; opening the Orchestration section is not the fetch gate.

| Concern | Application | Group |
|---|---|---|
| Latest eligibility | Truthy Push, stored run ID, provider ID | Same |
| Argument provider ID | Eligible provider ID, otherwise `null` | Same |
| Argument DAG ID | Normalize the Push-gated run even if provider ID is missing | Normalize only when full eligibility holds |
| Detail run reference | Stored run only when full eligibility holds | Raw stored run, even with Push off or missing provider |
| Inventory run | Stored run when Push is truthy, even if provider ID is absent | Raw stored run independently of Push |
| Inventory summary | Existing Application inventory | Group summary also receives raw stored run |
| Row DAG link | Raw stored run regardless of Push; URL resolved by row provider ID | Same |
| View Recovery Runs | Eligibility above; `tab=applications`, `entityType=application`, encoded selected ID | Eligibility above; `tab=groups`, `entityType=group`, encoded selected ID |

For `{ pushToOrchestrator: false, airflowRunId: 'old-run-id', orchestrationProviderId: 'airflow-01' }`, both map to `notOrchestrated` and make no latest request. Application detail hides the reference and passes `null` to inventory. Group detail keeps the reference, and inventory/summary receive `old-run-id`. Both row links may still show `dag_old-run-id`.

Another important case: Push on, stored run present, provider ID absent. Application inventory still receives the run; its detail reference is hidden. Group detail and inventory retain the run. Both map to `incomplete`. Application's disabled query uses `dag_<run>`, Group's disabled query uses an empty DAG parameter after null conversion. Preserve these arguments rather than silently canonicalizing disabled keys.

Mapper precedence must remain exactly:

`notOrchestrated -> incomplete -> providersPending -> providersFailed -> orchestratorUnavailable -> noRunId -> runPending -> runFailed -> noRuns -> lastRun`.

Thus provider pending/error outrank missing run ID, while Push off outranks all provider/query states. Provider errors also outrank cached latest data. Existing `runFailed` outranks cached latest data if the latest observer reports an error; do not introduce a different cached-error presentation.

## 4. Architectural alternatives and GO assessment

| Alternative | Benefits | Costs / decision |
|---|---|---|
| Keep current structure | No migration risk; existing mapper/query already have depth | Leaves identical eligibility and state coordination in two large callers. Reasonable NO-GO fallback if characterization reveals disproportionate complexity. Not preferred now. |
| Pure orchestration-details resolver only | Easy deterministic tests; centralizes provider/identity facts | Requires callers to run resolver, invoke latest hook, then assemble mapper state or call a second resolver. Leaves the sequence and invariants distributed. A pure helper remains an internal implementation option, not an additional public interface. |
| Cohesive selected-detail hook | One seam for selected metadata + provider snapshot -> interpreted detail; centralizes eligibility, query identity and interpretation | Adds an entity discriminator and keeps existing cross-feature mapper dependency. Preferred: bounded responsibilities and meaningful observable tests. |

### Provider ownership

| Dimension | Option A: hook owns provider query | Option B: tables retain query (chosen) |
|---|---|---|
| Cohesion | Owns all detail dependencies but must also expose catalog for row rendering | Owns interpretation; fetch remains with its existing table consumers |
| Coupling | Rows depend on a selected-detail hook even with no selection | Hook depends only on needed catalog facts and status flags |
| Interface complexity | Needs catalog and potentially provider query internals in result | Small provider snapshot input, no query internals in output |
| Duplication | Must remove table observer or create another observer | No new provider observer or independently configured fetch |
| Cache reuse | Same key can share raw cache, but added observers may alter refetch lifecycle | Existing generated key, selector and observer lifecycle unchanged |

Option A could work if it became the sole table provider source, but would mix table-wide row requirements into a selected-detail seam. Cache deduplication alone does not justify another observer.

### Ten decision tests

1. **Duplicated decisions:** eligibility, provider URL lookup, query identity, mapper invocation and action availability occur in both tables.
2. **Ownership:** hook owns those decisions plus entity-specific detail reference projection; it does not own inventory or routing.
3. **Caller simplification:** replace each multi-step coordination block with one unconditional call and output consumption. Keep the catalog query and explicit inventory assignment. Benefit is fewer business rules at call sites, not a promised line-count reduction.
4. **Consistency:** fixes to eligibility or provider precedence have one coordination location and shared public-interface tests.
5. **Query reuse:** call `useLatestOrchestratorRun` exactly once; preserve its implementation completely.
6. **Meaningful interface tests:** real QueryClient and fetch stubs exercise request enabling, params, request counts, returned state, provider URL and action availability.
7. **Entity contracts:** one explicit discriminator selects detail reference behavior and disabled DAG argument behavior; no framework, callbacks, strategy registry or inventory switch is needed.
8. **Deletion test:** deleting the hook sends eligibility, normalization, URL resolution and state assembly back into both tables.
9. **ADR 0002:** preserve sections 7-9 and 11. This module derives domain behavior over an existing domain hook, not a rename-only facade over generated fetchers/options. No direct `useQuery`, manual keys, generated adapter, schema or invalidation. The existing low-level facade remains unchanged. The new hook needs no ESLint restricted-import exemption; the listed ESLint exceptions concern low-level composite imports, which this hook does not add. Record this rationale here rather than expanding that allowlist.
10. **Simpler alternative:** the pure resolver does not hide the asynchronous coordination sequence. If implementation starts exposing raw latest-query internals or reimplementing polling, stop and reassess GO rather than broadening the design.

**GO is justified by ownership of a real domain decision sequence.** It is not justified by combining two hooks or reducing JSX. Architectural approval and successful F1 characterization remain future checkpoints.

## 5. Chosen module and exact public interface

Create `src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.ts`. This directory already contains the selected latest-run hook; use no new generic folder or barrel. The mapper remains at its current Group path to avoid an unrelated move. Its import back to run formatting helpers is already present; keep the new hook separate from those helpers to avoid a runtime import cycle.

Proposed complete exports (a declaration of future design, not production implementation):

```typescript
import type { OrchestrationState } from '@/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState'

export interface SelectedOrchestrationEntity {
  pushToOrchestrator?: boolean | undefined
  orchestrationProviderId?: string | null | undefined
  airflowRunId?: string | null | undefined
}

export interface SelectedOrchestrationProviders {
  providers: readonly {
    id: string
    name: string
    url?: string | null | undefined
  }[]
  isLoading: boolean
  isError: boolean
}

export interface SelectedOrchestrationInput {
  entityType: 'application' | 'group'
  selected: SelectedOrchestrationEntity | null
  providers: SelectedOrchestrationProviders
}

export interface SelectedOrchestrationDetails {
  state: OrchestrationState
  providerUrl: string | null | undefined
  displayRunId: string | null
  canViewRecoveryRuns: boolean
}

export function useSelectedOrchestrationDetails(
  input: SelectedOrchestrationInput,
): SelectedOrchestrationDetails | null
```

Structural input accepts either existing entity directly; no view-model adapter is needed. Explicit `undefined` supports existing optional fields under strict optional-property checking. No entity ID/name is needed because routing stays in the table. Provider data is the existing selected catalog output; do not pass the full generated query result.

Output justification:

| Field | Existing consumers |
|---|---|
| `state` | Both header meta rows and `RecoveryGroupOrchestrationStatus` |
| `providerUrl` | Both selected-detail presentation calls; leave fallback URL construction to existing link/config module |
| `displayRunId` | Both selected-detail reference props; encodes their verified difference |
| `canViewRecoveryRuns` | Both callers conditionally supply their existing navigation callback |

Do not return `dagId`: neither caller needs query DAG identity after coordination moves. `AirflowDagLink` already normalizes its run reference. Do not return provider lists, raw query objects, loading/error duplicates, inventory IDs, routing callbacks or translated text.

### Behavioral contract of the interface

- Invoke the hook unconditionally at table scope. Internally invoke `useLatestOrchestratorRun` exactly once before any null-selection return. Never invoke hooks in a selection branch.
- Full eligibility is `Boolean(selected?.pushToOrchestrator && selected.airflowRunId && selected.orchestrationProviderId)`. Pass eligible provider ID or `null` to the existing hook. Provider catalog state never participates in this predicate.
- For Applications, DAG argument is normalization of a truthy Push-gated stored run; for Groups it is normalization only when fully eligible. No selection yields `null` arguments for both. Preserve prefix behavior, whitespace behavior, and truthiness; do not trim IDs or add provider-type validation.
- Feed the raw selected entity, supplied provider state, and existing latest state to the unchanged mapper. Return `null` when selection is absent even if an observer has cached data.
- Resolve URL by selected provider ID exactly as today, independently of Push and catalog status flags. Do not substitute a fallback here: preserving missing/blank URL lets the existing builder apply the central fallback.
- `displayRunId`: Application gets its stored run only if fully eligible; Group gets `selected.airflowRunId ?? null`. `canViewRecoveryRuns` equals full eligibility, including when provider fetch fails or the provider is absent from the catalog.
- Application inventory continues to compute `selected?.pushToOrchestrator ? selected.airflowRunId ?? null : null` in its caller. Group inventory/summary continue using `selected.airflowRunId ?? null`. Never reuse `displayRunId` for inventory: Application inventory and reference rules differ when provider ID is missing.

## 6. Query and caching impact

Keep `latestRunParams(providerId, dagId)` unchanged:

```typescript
{ provider_id: providerId, dag_id: dagId, limit: 1, order_by: '-logical_date' }
```

The generated key remains `getGetOrchestratorRunsQueryKey(latestRunParams(...))`, currently `['/get_orchestrator_runs', params]`. The existing hook converts null arguments to empty strings for disabled queries. Preserve the Application/Group difference described above even for disabled placeholder keys. No entity type or selected entity ID is added to query keys. Different records with the same provider/DAG intentionally share cache data.

`useLatestOrchestratorRun` uses 15-second stale time and polling for a nonterminal latest run; otherwise stale time is 15 minutes and interval is false. Background interval polling is false. The standard cache policy also has 60-minute GC, retry 1, and focus/mount/reconnect behavior; do not override them in the new hook. Stale time expiry alone does not initiate a request.

Expected parity under deterministic tests (isolated QueryClient, retry false, no focus/reconnect events): no selection/Push off/missing identifiers => zero latest requests; cold eligible selection => one initial request; eligible selection while provider pending/error/missing => still one initial latest request; active latest => one additional request per 15 seconds until terminal. Count latest and provider endpoints separately from inventory endpoints.

Selection changes must bind the observer to the new provider/DAG generated key. A fresh cached terminal result for B should display B without a new request. Cold B should not display A while pending. A delayed A response must not appear in B or a closed detail. Generated options forward AbortSignal; characterize real cancellation/response behavior with stubs rather than promising every prior request is physically canceled. Closing disables this observer's new lookups/polling; another consumer of the same cache entry may legitimately keep fetching. Do not add cancellation, cache removal, placeholder data, or force-refetch logic.

These selection/cache expectations follow the current source architecture but lack direct selected-detail request tests. F1 must measure the current implementation before migration; do not present them as already tested.

### Recovery Runs context, unchanged

- `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx:27-39` passes only page-limited visible entities to `useOrchestratedEntityRuns`.
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.ts:22-51` uses generated options in `useQueries`, a 5-minute stale time, no interval and full identity for retry targeting. It shares raw latest keys, not observer policy, with details.
- `src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.ts:27-53` uses paginated params; page 1 polls active runs, later pages do not; it is a separate concern.
- `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.ts:25-38` includes stored run/provider records without a Push check; `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.ts:20-33` checks Push. Record this as a separate domain asymmetry, not a proven bug. The Apps suite does not explicitly cover Push false with stored IDs. Comments about Applications sharing one provider lookup are stale relative to the current per-record provider code; leave this unrelated cleanup outside Candidate 5.

## 7. File scope

Create in future implementation:

- `src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.ts`
- `src/features/recovery-plans/recovery-runs/hooks/useSelectedOrchestrationDetails.test.tsx`
- `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.orchestration.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.orchestration.test.tsx`

Use the two new table suites for real request tests because existing suites mock provider/latest hooks. Avoid mixing global mock and real-client tests in one file. Reuse existing fetch test utilities where possible; no new test abstraction is required.

Modify the two production tables to consume the hook. Extend their existing suites only for missing visual/reference/inventory contract assertions that fit their setup. Extend `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx` only if new polling/background characterization is best isolated there. No change to its production file is planned.

Leave unchanged: generated files, `src/config/externalServices.ts`, `src/shared/components/airflow/AirflowDagLink.tsx`, mapper and presentation production files, provider query/selector, cache policy, ESLint rules, all Recovery Runs production files except the new selected hook, inventory production files, CRUD/Push/rollback, routes, backend and Orval configuration. No visual redesign or generic orchestration framework.

## 8. Behavioral compatibility matrix

Evidence codes below refer to the exact suite paths in section 9: **A** Application table, **G** Group table, **M** mapper, **L** latest hook, **E** external services. “Existing” identifies an assertion inspected in a passing suite, not full end-to-end coverage. “Gap” is a required future characterization. Unless stated otherwise, Push and identifiers are valid.

| Scenario | Application contract | Group contract | Existing evidence / missing coverage |
|---|---|---|---|
| No selected entity | Absent result; zero latest request | Same | Source verified; gap: real requests in both tables |
| Push disabled | `notOrchestrated`; latest disabled | Same | M:10-13; A:454; G:674; request gate gap |
| Push off, stored run | Hide detail reference; inventory null; row link remains | Keep reference and inventory/summary stored ID | Source verified; gap: complete paired assertions |
| Provider ID missing | `incomplete`; no request; disabled normalized DAG if pushed run exists | `incomplete`; no request; disabled DAG null | M:16-18; A:461; G:683; request/key/inventory gap |
| Provider loading | `providersPending`; eligible latest still starts | Same | M:21-23; gap: real integration for both |
| Provider error | `providersFailed`; eligible latest still starts | Same | M:26-28; gap: real integration for both |
| Provider absent | `orchestratorUnavailable`; eligible latest still starts | Same | M:31-33; G:692; A rendering/request gap |
| Provider without URL | Existing central fallback | Same | E fallback; G:430; A integration gap |
| Provider exists, run absent | `noRunId`; no request | Same | M:36-38; G:700; A/request gap |
| Provider and run present | Exact provider and normalized DAG; no double `dag_` | Same | L:33-36 checks params on supplied DAG; E normalizes; gap: combined table normalization/request |
| Latest pending | `runPending` | Same | M:41-43; G:737; A/request gap |
| Latest failed | `runFailed` | Same | M:46-48; gap: both tables real error response |
| Latest empty | `noRuns` | Same | M:51-53; A:446; G:709; real request path gap |
| Successful latest | Last status/duration/timestamp, unchanged formatting | Same | M:56-58; A:355 status/link/action; G:719 full presentation; A timestamp/duration gap |
| Active latest | Existing 15-second interval and stale time | Same | L:22-45 tests active -> terminal request counts; composition gap |
| Latest becomes terminal | Stop fast polling; standard stale time | Same | L:22-45; observer stale-time/background assertions remain gaps |
| Selected entity changes rapidly | New identity; no old response in new detail; same-key reuse | Same | Source-derived expectation; gap: delayed A/B and provider-only/DAG-only changes |
| Detail closes | Absent state; no new selected lookup or interval | Same | G:763 closes UI; no selected request test; history closure tests do not prove this path |
| View Recovery Runs | Applications tab/type + encoded selected ID | Groups tab/type + encoded selected ID | A:355; G:465 assert ordinary IDs; encoded special ID gap |
| Row DAG link | Stored run + row URL; new tab; click does not select | Same | A:242; G:176; Push-off clickable link explicit gap |
| Inventory | Push-gated stored run, independent of provider completeness | Stored run for inventory and summary independently of Push | Source verified; G:641 lazy inventory mount; paired legacy run gap |
| Conflicting pending/error/data facts | Preserve mapper precedence | Same | M covers individual states; add combined precedence and cached-error cases |

## 9. Test strategy and baseline evidence

Exact inspected suites:

| Code | Full path | Scope / limits |
|---|---|---|
| A | `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx` | Latest hook and provider query mocked; UI/action assertions, not request enabling |
| G | `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx` | Latest/provider mocked; real inventory only in relevant setups |
| M | `src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.test.ts` | All ten states and summary/meta text; pure inputs |
| L | `src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx` | Real generated request; active-to-terminal polling and exact params |
| E | `src/config/externalServices.test.ts` | Normalization, provider URL joining, default fallback |
| R | `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.test.tsx` | Empty fan-out, per-provider requests, retry identity, no overview interval |
| RA | `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx` | Record inclusion and DAG mapping; no explicit Push-false stored-run case |
| RG | `src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.test.tsx` | Push/identifier exclusion and empty list |
| H | `src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.test.tsx` | Pagination, enabled gate, first-page polling and closure |

Baseline command B1, executed 2026-10-22 against the source baseline above:

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState.test.ts src/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun.test.tsx src/config/externalServices.test.ts
```

Result: exit 0; **5 files, 96 tests passed**, duration 39.46 seconds; runner reported Vitest 4.1.11. This independently reverifies the five directly relevant suites; the earlier audit's pass claim is not used as current evidence.

Context command B2:

```powershell
node node_modules/vitest/vitest.mjs run src/features/recovery-plans/recovery-runs/hooks/useOrchestratedEntityRuns.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedApps.test.tsx src/features/recovery-plans/recovery-runs/hooks/useOrchestratedGroups.test.tsx src/features/recovery-plans/recovery-runs/hooks/useAppRunHistory.test.tsx
```

Result: exit 0; **4 files, 18 tests passed**, duration 20.22 seconds; runner reported Vitest 4.1.11. Together B1 and B2 passed 114 tests in nine focused suites. No complete suite, production build, typecheck, full ESLint or browser smoke is claimed for this documentation-only task. F4 explicitly schedules typecheck and full lint for implementation acceptance.

Planning artifact validation: Node content assertions passed for both Markdown documents, 33 explicit source/document references (allowing only the four explicitly planned new source/test paths), local document links, balanced code fences, whitespace, nine numbered tasks with dependencies/acceptance evidence, and initially unchecked checkboxes. The TypeScript compiler API parsed the proposed declaration without syntax diagnostics; this is syntax validation, not implementation typechecking. `git diff --check` passed; because the documents are untracked, their whitespace was also checked directly by the Node assertions. Final status contains only the two new planning documents; no tracked source diff was produced.

Use real generated clients + deterministic fetch stubs for new orchestration integration suites. Prefer `src/features/recovery-plans/recovery-runs/test/stubOrchestratorRuns.ts` for latest responses; stub the existing provider endpoint as well. Provide isolated QueryClients with retry disabled. Assert public states, exact requests and bounded counts; avoid asserting private local variable names, helper calls or an invented key shape. When checking cache identity, use the generated key helper. Account for retries/polling/focus separately from initial request counts. Use deferred responses for selection races and fake timers for intervals, restoring timers and globals after each test.

F1 creates current-table characterization before the hook exists; F2 adds hook tests through its public interface; F3 reruns the unchanged table characterization. Existing mapper and latest tests remain owners of their own semantics, rather than duplicating every formatter/polling assertion in every table suite.

## 10. F0-F4 execution and dependency graph

This is a future implementation outline. Detailed unchecked tasks, exact paths and commands are in [selected-orchestration-details-todo.md](selected-orchestration-details-todo.md). Do not start them during planning.

`F0 review -> F1 Application characterization + Group characterization -> F1 identity/polling baseline -> F2 hook -> F3 Application -> F3 Group -> F4 acceptance`.

| Phase | Deliverable | Checkpoint |
|---|---|---|
| F0 | Review evidence, GO decision, exact interface and scope | Human reviews architectural recommendation; no code migration yet |
| F1 | Current-table request and legacy-ID characterization, recorded test counts | Behaviors and request/key expectations pass before extraction; resolve any source-vs-runtime mismatch |
| F2 | Independently tested hook reusing mapper/latest module | Public-interface tests pass; provider query and generated/cache files unchanged |
| F3 | Application first, Group second; each remains independently functional | Both consume one coordination module; inventory/action/row behavior unchanged |
| F4 | Focused regressions, typecheck, full lint/layout, diff check, browser/network parity | All acceptance evidence recorded; no extra observers/fan-out or contract drift |

Application and Group characterization files can be worked independently once fixtures/expectations are agreed. Migrations are sequential, as requested. No parallel agents are needed for this planning task. Avoid concurrent edits to shared hooks or shared fetch fixtures.

## 11. Risks, mitigations and rollback

| Risk | Impact | Mitigation |
|---|---|---|
| Reusing query eligibility for all run references/inventory | High: legacy Group inventory disappears; incomplete Application inventory changes | Paired Push-off/stored-run and missing-provider tests; inventory stays caller-owned |
| Waiting for provider catalog before fetching | High: eligibility/timing drift | Pending/error/absent catalog request tests; enable solely on metadata |
| Conditional hook invocation or early return | High: Hook order failure on selection | Unconditional internal latest hook before null return; null -> selected -> null rerender test |
| Canonicalizing disabled identities | Medium: unexpected cache entry changes | Preserve discriminator-specific DAG arguments; characterize generated keys without hand-writing new keys |
| Old response under new selection | High: wrong run displayed | Deferred A/B tests, fresh-cache return tests, provider-only and DAG-only changes |
| Treating cached refresh error as success | Medium: presentation precedence drift | Test conflicting error/data flags and reuse existing mapper |
| Provider query duplication | Medium: extra observers/requests | Option B; endpoint-count parity; retain exact query and selector in both callers |
| New hook grows into API facade/framework | Medium: ADR violation and weak depth | No raw query result, direct generated request, new key, policy override or inventory responsibilities |
| Existing UI tests conceal network drift | High | Separate real-client characterization suites before migration |
| Concurrent workspace changes | Medium | Recheck Git before each phase; stage/change only authorized task files; no branch/worktree creation |

Rollback future implementation in reverse dependency order: restore Group coordination, then Application coordination, verifying each table's characterization; remove the now-unused new hook/tests only after both callers are restored. Keep characterization suites that still validate the original contracts. No migration, persisted data, cache schema, backend or generated artifact rollback is needed. Do not reset the whole workspace or discard concurrent work. Future commit policy must follow that future session's instructions; this session explicitly creates no commit.

## 12. Acceptance criteria and definition of done

The plan is ready for review when both documents exist, paths and commands are validated, the decision and alternatives are explicit, and evidence clearly distinguishes executed tests from source-derived expectations and missing coverage.

Future implementation is accepted only when:

- Both callers use the same selected-detail coordinator; they no longer independently assemble eligibility, selected URL, query DAG and mapper inputs.
- All matrix gaps relevant to changed behavior have passing focused tests, including exact request parameters/counts, selection/closure, legacy IDs, provider-state independence and both navigation destinations.
- Mapper precedence, generated keys (including disabled identities), polling/stale policies, URL fallback and inventory contracts remain unchanged.
- No provider fetch duplication, generated edits, page fan-out changes, new query keys or unrelated behavior changes are present.
- `npm run typecheck`, `npm run lint` (includes feature-layout), focused affected Vitest suites and `git diff --check` pass after implementation. A full production build and complete test suite are not default acceptance commands.
- Browser smoke covers both detail views, row link click behavior, open/switch/close, View Recovery Runs and inventory sections. Record endpoint counts separately and confirm the Runs page still requests only its visible page. If browser access is unavailable, record that limitation explicitly; do not mark smoke passed.

Confirmed findings are those in sections 2-3 and inspected test assertions. Assumptions are that the current behaviors should all be preserved and that a focused discriminator is acceptable for compatibility. Remaining uncertainty is runtime selection/cache/request behavior absent from current tests; F1 resolves it before implementation. A policy change to require a catalog match for latest lookup, or to align Recovery Runs Push gates, requires a separate proposal and is excluded here.


## 13. Implementation execution record

The user's subsequent executing-plans inline request authorizes implementation in this session and satisfies the F0 review checkpoint. Work remains in spike/ant-design-shell, without agents, branches or worktrees. The earlier no-implementation/no-commit restriction applied to the planning session; implementation uses the standing verified-commit requirement. No push is requested.

F1: Added two real-client table characterization suites (18 tests each). Both passed against the original tables before extraction. An eleven-suite baseline ran 153 tests: 152 passed and the new terminal stale-time test failed because its test QueryClient used default five-minute GC rather than the application's sixty-minute GC. Aligning that test wrapper with STANDARD_QUERY_OPTIONS resolved the mismatch; the affected latest suite then passed all 4 tests. The other ten suites were unchanged and had passed. No production cache change was made. Focused ESLint passed for the characterization files and latest suite.

A shared HTTP/fixture utility, src/features/recovery-plans/recovery-runs/test/selectedOrchestrationFixtures.tsx, was added to avoid repeating endpoint routing and valid wire fixtures in both table suites and the forthcoming hook suite. It stubs only HTTP; generated clients, validation, selectors, inventory and presentation remain real. This is an additional test-only file beyond the original file list.

The new hook test was written first and its initial run failed to resolve the not-yet-created module, as expected. Behavioral assertion checks follow once its public declaration exists. Browser/DevTools tools are unavailable in this session; browser acceptance remains open rather than inferred from JSDOM.

Concurrent unrelated edits have appeared in shared table infrastructure and unrelated planning documents. This task leaves those files untouched and stages only explicitly named task files.

F2: A declaration-only stub produced six expected assertion failures for missing selected-detail results. Replacing it with the minimal coordinator made the complete hook/domain check pass: 4 suites, 50 tests (26 public hook cases plus mapper, latest and URL tests). Focused ESLint passed for the new hook and its tests. No table has migrated at this checkpoint. Characterization commit: 69baed0d.

F2 typecheck: npm.cmd run typecheck passed after restricting the Group test fixture override type to orchestration fields/id/name. A full Partial<RecoveryGroup> could construct invalid combinations of its resource-kind discriminant; the test helper now preserves that contract without assertions or suppressions. The Group characterization rerun passed 18 tests. PowerShell blocks npm.ps1, so npm.cmd is used for equivalent package scripts.

F3 Application: migrated only selected coordination and presentation props. Existing provider query/row links and Push-gated inventory assignment remain. V-A + V-CA + V-H passed 3 suites / 77 tests; focused Application ESLint passed. Hook checkpoint commit: 76930dbd.

F3 Group: migrated to the same coordinator. Group inventory and summary still read the stored run directly. Both table regression suites, both real-client characterization suites and the public hook suite passed together: 5 suites / 137 tests. An additional Application presentation regression then passed with its full characterization suite: 19 tests, protecting actual duration/timestamp rendering (the Group equivalent already existed). The final focused scope therefore totals 180 tests across 12 suites, with the updated Application suite replacing its earlier 18-test result.

F4 automated evidence:
- V-A, V-G, V-CA, V-CG and V-H: 137 tests passed in the five-suite command; V-CA rerun after the timestamp test passed 19 tests. No other files in that group changed after its passing run.
- V-D and V-R: 7 suites / 42 tests passed, including existing overview fan-out, entity inclusion, history and latest polling behavior.
- npm.cmd run typecheck: exit 0 after both migrations. npm.ps1 was blocked by host execution policy; npm.cmd invokes the same package script.
- npm.cmd run lint: exit 1, due solely to the concurrent untracked .qa-recovery-flat/main.tsx being outside the TypeScript project service. This task does not edit that file or ESLint/tsconfig to silence it. A separate ESLint pass excluding only that unrelated temporary directory is recorded below when complete.
- node scripts/orval/check-feature-layout.mjs: exit 0.
- Focused ESLint for all changed TypeScript/test files passed; git diff --check passed.

Final inline review used the code-review-and-quality checklist: correctness, readability, architecture, security and performance. No blocking issue found in the Candidate 5 diff. The shared hook invokes the existing query unconditionally, keeps provider catalog loading/error separate from eligibility, preserves disabled identity differences and delegates state precedence. Caller inventory assignments, row links and route callbacks remain intact. No generated file, query key, cache constant, mapper, latest-query production file, or inventory production file changed in this task. Recovery Runs page/table and shared table changes visible in the workspace belong to concurrent work; they are not Candidate 5 changes and are not included in its commits.

Runtime coverage added after the original matrix: real HTTP gates for null selection/Push/identifiers; catalog pending/error/absence; empty/error/pending/success latest states; fallback link; encoded routes; Push-off and incomplete metadata inventory/reference differences; raw and normalized DAG params; disabled cache identity; rapid selection with delayed response; provider-only/DAG-only changes; same-identity cache reuse; active close stops polling; cached-refresh error precedence; Application timestamp and duration. Existing mapper/latest tests retain terminal and state precedence coverage. Browser screenshots, console inspection and browser network smoke were not performed: neither Chrome DevTools tools nor local Playwright packages are available. Task 9 browser checks and unconditional full-lint acceptance remain open. No complete test suite or production build was run.

Final broad lint alternative: node node_modules/eslint/bin/eslint.js . --max-warnings 0 --ignore-pattern '.qa-recovery-flat/**' completed with exit 0. This excludes only the concurrent untracked QA harness; it does not change repository lint rules or claim npm.cmd run lint passed. Final document path/fence/whitespace assertions and git diff --check also passed. Keep the existing branch/workspace; do not merge or push.
