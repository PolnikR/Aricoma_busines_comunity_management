# Implementation Plan: Simplify Orchestration Toggle to a Plain Boolean

## Overview

Reverses AD-1 from the original Orchestration-step plan. `pushToOrchestrator`
becomes a plain `boolean` (default `false`) instead of tri-state
(`boolean | null`, `null` = unanswered). Create/Save no longer requires the
toggle to be explicitly touched — only the orchestration provider still gates
it, since `provider_id` is unconditionally required by the API.

## Why

Confirmed live in the browser: requiring an explicit toggle answer before
Create enables is friction the user doesn't want. A default of `false` is
already a valid, meaningful answer ("don't deploy"), so there's no real
"unanswered" state worth blocking on.

## Task List

### Task 1: Type + defaults
- `recoveryGroupTypes.ts`: `RecoveryGroupDraft.pushToOrchestrator: boolean` (drop `| null`)
- `RecoveryGroupBuilder.tsx`: `INITIAL_DRAFT.pushToOrchestrator: false`; edit initializer `initialData.pushToOrchestrator ?? false`

### Task 2: Drop the gate, keep provider requirement
- `RecoveryGroupBuilder.tsx`: `orchestrationValid` drops the `pushToOrchestrator !== null` check — only `orchestrationProviderId` + eligible-provider match remain
- `recoveryGroupsValidation.ts`: drop `|| draft.pushToOrchestrator === null` from the throw guard (a plain boolean can't fail that check anyway once the type changes)

### Task 3: Simplify the step component
- `RecoveryGroupOrchestrationStep.tsx`: `pushToOrchestrator: boolean` prop (drop `| null`); drop the "unanswered" branch, answer text is always "Yes"/"No"

### Task 4: Fix the tests this invalidates
- `RecoveryGroupOrchestrationStep.test.tsx`: "unanswered by default" test → asserts default is unchecked/"No", not "Not selected"
- `RecoveryGroupBuilder.test.tsx`: remove "keeps Create disabled until the orchestration toggle is answered" (no longer true); `completeOrchestrationAndCreate` no longer needs to click the toggle
- `recoveryGroupsApi.test.ts`: remove "rejects a draft with an unanswered orchestration toggle" (no longer a possible state)

## Checkpoint
- [ ] `npm run typecheck` · `npm run lint` · `npm run test`
- [ ] Browser: Create enables immediately once provider is selected, no toggle interaction needed
