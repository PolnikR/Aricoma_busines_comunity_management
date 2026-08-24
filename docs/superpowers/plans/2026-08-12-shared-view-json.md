# Shared View JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared API-payload JSON viewer to Providers, Platform Providers, all Recovery Policy tables, and Policy Sets while preserving the existing Recovery Application and Recovery Group behavior.

**Architecture:** Each feature exposes one pure function that converts a validated frontend record to its submit endpoint payload. Submit functions and tables share that mapper. All tables render the payload through one localized `JsonViewerModal`; table components own only the currently viewed row state.

**Tech Stack:** React 19, TypeScript 6, Zod 4, Tailwind CSS 4, Vitest, Testing Library.

## Global Constraints

- The modal shows the exact object accepted by the corresponding `submit_*` endpoint.
- The View button must not trigger row selection or open the detail drawer.
- Response-only fields such as `credentialStatus` and `url` must not appear unless accepted by submit.
- Existing filters, pagination, drawers, CRUD actions, and provider connection testing remain unchanged.
- English, Slovak, and Czech labels must be available.
- Do not add copy, download, syntax highlighting, or a new backend request.

---

### Task 1: Shared JSON viewer

**Files:**
- Modify: `src/shared/components/modal/JsonViewerModal.tsx`
- Create: `src/shared/components/modal/JsonViewerModal.test.tsx`
- Modify: `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`

**Interfaces:**
- Produces: `JsonViewerModal({ open, title, data, closeLabel, onClose })`
- Consumes: shared `Modal` and `Button`

- [ ] **Step 1: Add failing shared modal tests**

Test that the modal renders `JSON.stringify(data, null, 2)`, is named by `title`, calls `onClose`, and renders nothing when `open` is false.

- [ ] **Step 2: Verify the focused test fails**

Run: `npx vitest run src/shared/components/modal/JsonViewerModal.test.tsx`

- [ ] **Step 3: Update the shared component**

Add the required `closeLabel` prop, use shared `Button`, and match the established large constrained modal layout:

```tsx
<Modal open={open} onClose={onClose} title={title} size="lg" className="flex max-h-96 flex-col overflow-hidden" footer={...}>
  <div className="flex-1 overflow-y-auto bg-surface-subtle px-6 py-4">
    <pre className="whitespace-pre-wrap break-words font-mono text-xs text-text-secondary">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
</Modal>
```

- [ ] **Step 4: Migrate existing Recovery Applications and Groups**

Delete both local `JsonViewerModal` definitions, import the shared modal, and pass their existing mapper result as `data`. Preserve titles, close translations, button behavior, and existing component tests.

- [ ] **Step 5: Run shared and migrated tests**

Run the shared modal test plus `RecoveryApplicationsTable.test.tsx` and `RecoveryGroupsTable.test.tsx`; expect all to pass.

### Task 2: Infrastructure and Platform Provider payloads

**Files:**
- Modify: `src/features/providers-connectors/providers/api/providersApi.ts`
- Modify: `src/features/providers-connectors/providers/api/providersApi.test.ts`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- Modify: `src/features/platform-administration/platform-providers/api/platformProvidersApi.ts`
- Modify: `src/features/platform-administration/platform-providers/api/platformProvidersApi.test.ts`
- Modify: `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- Modify: `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`

**Interfaces:**
- Produces: `toProviderSubmitPayload(provider: ProviderSubmitData): ProviderSubmitData`
- Produces: `toPlatformProviderSubmitPayload(provider: PlatformProviderSubmitData): PlatformProviderSubmitData`
- Consumes: shared `JsonViewerModal`

- [ ] **Step 1: Add failing mapper/API tests**

Assert that provider payloads contain only submit fields and exclude `credentialStatus`, `port`, and `url` where those are response-only.

- [ ] **Step 2: Export and reuse validated payload mappers**

Implement each mapper by parsing the input with its existing submit Zod schema. Change each submit function to stringify the mapper result.

- [ ] **Step 3: Add failing provider table interaction tests**

For each table, click `View`, assert the API payload is present, assert response-only keys are absent, and assert the detail drawer did not open.

- [ ] **Step 4: Add JSON columns and shared modals**

Track `jsonViewId`, resolve the record from the complete rows array, add the final `JSON` column, stop event propagation, and render the shared modal with mapper output.

- [ ] **Step 5: Run both provider API and table suites**

Run the four affected test files; expect all to pass.

### Task 3: Recovery Policy payloads

**Files:**
- Modify: `src/features/recovery-plans/recovery-policies/snapshot/api/snapshotPoliciesApi.ts`
- Modify: `src/features/recovery-plans/recovery-policies/snapshot/api/snapshotPoliciesApi.test.ts`
- Modify: `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx`
- Modify: `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`
- Modify: `src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.ts`
- Modify: `src/features/recovery-plans/recovery-policies/application-recovery/api/recoveryAppPoliciesApi.test.ts`
- Modify: `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx`
- Modify: `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`
- Modify: `src/features/recovery-plans/recovery-policies/clean-room/api/cleanRoomPoliciesApi.ts`
- Modify: `src/features/recovery-plans/recovery-policies/clean-room/api/cleanRoomPoliciesApi.test.ts`
- Modify: `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx`
- Modify: `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`

**Interfaces:**
- Produces: `toSnapshotPolicySubmitPayload(policy): SnapshotPolicyWire`
- Produces: `toRecoveryAppPolicySubmitPayload(policy): RecoveryAppPolicySubmitWire`
- Produces: `toCleanRoomPolicySubmitPayload(policy): CleanRoomPolicySubmitData`
- Consumes: shared `JsonViewerModal`

- [ ] **Step 1: Add failing mapper tests**

Assert exact snake_case Snapshot Policy output; assert mode-specific Application Recovery Policy output for `latest`, `time_range`, and `exact_time`; assert the exact four-field Clean Room output.

- [ ] **Step 2: Export and reuse the three mappers**

Rename/export existing private `toWire` functions and add a validated Clean Room mapper. Submit functions stringify those exported results.

- [ ] **Step 3: Add failing table JSON tests**

For each of the three tables, assert that View opens the correct dialog and shows backend keys rather than frontend camelCase keys.

- [ ] **Step 4: Add JSON columns and shared modals**

Use the same `jsonViewId`, `stopPropagation`, shared modal, skeleton count, and minimum-width pattern as the provider tables.

- [ ] **Step 5: Run all six Recovery Policy test files**

Run the three API and three table suites; expect all to pass.

### Task 4: Policy Set payload and table

**Files:**
- Modify: `src/features/recovery-plans/policy-sets/api/policySetsApi.ts`
- Modify: `src/features/recovery-plans/policy-sets/api/policySetsApi.test.ts`
- Modify: `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- Modify: `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Interfaces:**
- Produces: `toPolicySetSubmitPayload(policySet: PolicySetSubmitData): PolicySetWire`
- Consumes: shared `JsonViewerModal`

- [ ] **Step 1: Add failing mapper and table tests**

Assert the exact six-field snake_case payload and that the table modal includes `clean_room_policy_id` without opening the drawer.

- [ ] **Step 2: Export/reuse the mapper and integrate the modal**

Rename/export the existing private `toWire`, use it in submit, and add the JSON table state, column, and modal.

- [ ] **Step 3: Run Policy Set API and table suites**

Run both affected files; expect all to pass.

### Task 5: Localization and final verification

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`
- Modify: `src/locales/cs.json`
- Test: all affected tests from Tasks 1–4

**Interfaces:**
- Produces localized common JSON column/action labels and feature-specific modal titles.

- [ ] **Step 1: Add translations**

Add one shared JSON column label, one shared View label, and modal titles for Providers, Platform Providers, Snapshot Policies, Application Recovery Policies, Clean Room Policies, and Policy Sets in all three locales. Reuse existing Recovery Application and Recovery Group title keys.

- [ ] **Step 2: Run all affected tests**

Run every test file modified or created by this plan; expect zero failures.

- [ ] **Step 3: Run repository quality gates**

Run `npm run lint`, `npm run typecheck`, and `npx vite build`; each must exit with code 0. Record any non-failing build warnings.

- [ ] **Step 4: Review scope and staged content**

Run `git diff --check` and inspect `git diff --stat`. Preserve unrelated dirty-worktree changes and do not stage or commit them unless explicitly requested.
