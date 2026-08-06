# Task Checklist: Orchestration Step for Recovery Group Builder

Full plan: `tasks/plan.md` · Drafted locale strings + code snippets: `tasks/orchestration-step-reference.md`

**Already landed (`a499bc5`)** — read side: schema parses `airflow_run_id` /
`push_to_orchestrator`, model + mapper carry them, 4 tests cover it. Do not redo.

Baseline: 72 tests in recovery-groups, 606 full suite.

## Task 1 · Draft fields
- [ ] `recoveryGroupTypes.ts`: `orchestrationProviderId: string | null`, `pushToOrchestrator: boolean | null` on `RecoveryGroupDraft` — **required, no `?`**
- [ ] `RecoveryGroupBuilder.tsx`: `INITIAL_DRAFT` both `null`; edit initializer `pushToOrchestrator: initialData.pushToOrchestrator ?? null`, `orchestrationProviderId: null`
- [ ] Fix draft literals: `recoveryGroupsApi.test.ts` (5 sites: 202-214, 234-246, 264-276, 289-301, 307-319), `useRecoveryGroups.test.tsx` (110-120), `RecoveryGroupEditorPage.test.tsx` (57-67)
- [ ] Verify: `npx tsc -b`; 72 tests still pass

## Task 2 · Validation + optimistic group
- [ ] `recoveryGroupsValidation.ts`: narrow both in `ValidatedRecoveryGroupDraft`; fold 2 conditions into the existing single `throw` guard; reuse `invalid_draft` (no new error code)
- [ ] `mapRecoveryGroups.ts` `toRecoveryGroup`: `pushToOrchestrator: draft.pushToOrchestrator`, `airflowRunId: null`
- [ ] `mapRecoveryGroups.test.ts:31-48` `validatedVmDraft` literal
- [ ] Verify: `pushToOrchestrator: false` accepted, `null` rejected

## Task 3 · Submit query params
- [ ] `recoveryGroupsApi.ts` `submitRecoveryGroup`: append `?provider_id=…&push_to_orchestrator=…`
- [ ] `recoveryGroupsApi.test.ts:217` URL assertion (runs 2× via `it.each`)
- [ ] Add 2 cases: `push_to_orchestrator=true`; null provider rejects without calling fetch
- [ ] Verify: body byte-identical; `deleteRecoveryGroup` URL test (330) untouched

## Task 4 · i18n (must precede Tasks 5 & 7 — strings are the test selectors)
- [ ] 15 keys under `pages.recoveryGroupBuilder.*` in en.json (after 364, 451), cs.json (same), sk.json (after 344, 431 — **match by key, not position**)
- [ ] Do NOT introduce `providers.platform.*` keys (they exist in no locale)

## Task 5 · Orchestration step component
- [ ] `RecoveryGroupOrchestrationStep.tsx` — presentational, no data fetching
- [ ] Answer as **visible text** (`Not selected` / `Yes` / `No`) beside the switch
- [ ] Loading / error (`FetchErrorAlert` + retry) / empty (`EmptyState`) branches
- [ ] `notRestorable` hint under the picker
- [ ] `RecoveryGroupOrchestrationStep.test.tsx` — mock `@/hooks/useTranslation`
- [ ] Verify `Toggle.tsx` (zero prior consumers, no test): focus ring, dark mode, accessible name

## Task 6 · Wizard wiring + renumbering
- [ ] Import hook + step; add `eligiblePlatformProviders` (AIRFLOW + `credentialStatus === 'ok'`) and `orchestrationValid`
- [ ] Replace 106-108 with named indices (`resourcesStepIndex`, `relatedStorageStepIndex`, `policySetStepIndex`, `orchestrationStepIndex`, `lastStep`)
- [ ] Auto-select sole provider via `setDraft` (**not** `updateDraft`); index with `?.`
- [ ] `steps` array: append **after** `policy-set`
- [ ] **`canContinue`: add `step === policySetStepIndex ? policySetValid`** ← regression fix
- [ ] `canCreate`: `&& orchestrationValid`
- [ ] Lines **192** and **261**: `step === 4` → `resourcesStepIndex`
- [ ] Line **327**: `step === lastStep` → `policySetStepIndex`
- [ ] Add `step === orchestrationStepIndex` render block after 334
- [ ] Verify: VM = 7 steps, volume = 6; Next on Policy Set gated; auto-select doesn't dirty

## Task 7 · Builder test repair
- [ ] Add `usePlatformProviders` mock after line 76 (**without it, all 9 tests throw `No QueryClient set`**)
- [ ] Drive Orchestration in the 5 submit tests (~145/147, 177/179, 210/212, 235/238, 264/266)
- [ ] Add gate test: unanswered toggle → Create disabled

## Checkpoint: Full Verification
- [ ] `npm run typecheck` · `npm run lint` · `npm run test` (606 baseline)
- [ ] **Browser walkthrough, both group types** — the render-phase `setDraft` is the exact shape that crashed this feature before; unit tests did not catch it
- [ ] Network tab: both query params present, body unchanged
- [ ] Edit an existing group — must not dead-end on Orchestration

## Open Questions (answer before Task 5)
- [ ] Q1: Answering "No" takes two clicks with a toggle — keep it, or use a Yes/No pair?
- [ ] Q2: Is `provider_id` really required when the toggle is off?
- [ ] Q3: Fix the pre-existing `providers.platform.*` locale bug separately?
- [ ] Q4: Should the backend persist the orchestration provider so it round-trips?
