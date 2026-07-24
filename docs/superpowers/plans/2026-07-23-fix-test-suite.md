# Fix Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 32 failing test files by moving vitest hooks inside describe blocks and fixing module-level setup code.

**Architecture:** Test files currently have `afterEach()`, `beforeEach()`, or module-level setup code at the module level before `describe()` blocks, causing vitest to fail with "Vitest failed to find the current suite" errors. Strategy: (1) Move all hooks inside the nearest describe block, (2) Move module-level context access into beforeEach, (3) Wrap bare test functions in describe blocks.

**Tech Stack:** Vitest, TypeScript, React Testing Library

## Global Constraints

- All hooks (afterEach, beforeEach, etc.) must be inside describe() blocks
- Module-level code must not access vitest context (renderHook, config, etc.)
- All test files must have at least one describe() block
- Exact file paths used verbatim; no patterns or placeholders
- Commit after each task group

---

## Task 1: Fix API Test Files (Category A - Hook Placement)

**Files:**
- Modify: `src/features/api/discoveryInventoryApi.test.ts`
- Modify: `src/features/api/providersApi.test.ts`
- Modify: `src/features/api/vdisksApi.test.ts`
- Modify: `src/features/discovery-inventory/api/tagsApi.test.ts`

**Interfaces:**
- Consumes: Existing test structure with afterEach at module level
- Produces: Tests with afterEach moved inside describe blocks

---

- [ ] **Step 1: Fix discoveryInventoryApi.test.ts**

Read the file and identify the afterEach hook at module level (around line 40). The current structure is:
```
const validPayload = { ... }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDiscoveryInventory', () => {
  // tests
})
```

Change to:
```
const validPayload = { ... }

describe('fetchDiscoveryInventory', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // tests
})
```

Use the Edit tool to move the `afterEach` block from after `validPayload` into the `describe` block as the first statement.

- [ ] **Step 2: Run tests for discoveryInventoryApi.test.ts**

```bash
npm test -- discoveryInventoryApi.test.ts
```

Expected: Tests load (no "Vitest failed to find the current suite" error). Tests may fail on assertions, but the suite loads.

- [ ] **Step 3: Fix providersApi.test.ts**

Same pattern: move `afterEach()` from module level (around line 29-31) into each `describe()` block:
```
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchProviders', () => {
```

becomes:
```
describe('fetchProviders', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
```

There are 3 describe blocks in this file. Add the afterEach at the start of each one.

- [ ] **Step 4: Run tests for providersApi.test.ts**

```bash
npm test -- providersApi.test.ts
```

Expected: Suite loads, no context errors.

- [ ] **Step 5: Fix vdisksApi.test.ts**

Same pattern: move module-level `afterEach()` (around line 41) inside the first `describe()` block.

- [ ] **Step 6: Run tests for vdisksApi.test.ts**

```bash
npm test -- vdisksApi.test.ts
```

Expected: Suite loads.

- [ ] **Step 7: Fix tagsApi.test.ts**

Check for afterEach at module level and move inside describe block.

- [ ] **Step 8: Run tests for tagsApi.test.ts**

```bash
npm test -- tagsApi.test.ts
```

Expected: Suite loads.

- [ ] **Step 9: Commit**

```bash
git add src/features/api/discoveryInventoryApi.test.ts src/features/api/providersApi.test.ts src/features/api/vdisksApi.test.ts src/features/discovery-inventory/api/tagsApi.test.ts
git commit -m "fix: move vitest afterEach hooks inside describe blocks (API tests)"
```

---

## Task 2: Fix Discovery Infrastructure Tests (Category A - 7 files)

**Files:**
- Modify: `src/features/discovery-inventory/infrastructure/helpers/mapInventoryToTopology.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/helpers/infrastructureTopologyApi.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/layout/applyNodePositionOverrides.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/model/filterInfrastructureTopology.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/components/topologyFlowModel.test.ts`
- Modify: `src/features/discovery-inventory/infrastructure/hooks/useTopologyNodePositionOverrides.test.ts`

**Pattern:** Same as Task 1 — move afterEach/beforeEach from module level into describe blocks.

---

- [ ] **Step 1: For each of the 7 files, move hooks inside describe**

For each file:
1. Read file to find module-level afterEach/beforeEach hooks
2. Move them inside the first describe() block
3. If multiple describe blocks exist, add hooks to each as needed

Files to process in order:
1. mapInventoryToTopology.test.ts
2. infrastructureTopologyApi.test.ts
3. layoutInfrastructureTopology.test.ts
4. applyNodePositionOverrides.test.ts
5. filterInfrastructureTopology.test.ts
6. topologyFlowModel.test.ts
7. useTopologyNodePositionOverrides.test.ts

- [ ] **Step 2: Test all 7 files**

```bash
npm test -- "infrastructure.*test.ts"
```

Expected: All 7 files load without suite context errors.

- [ ] **Step 3: Commit**

```bash
git add \
  src/features/discovery-inventory/infrastructure/helpers/mapInventoryToTopology.test.ts \
  src/features/discovery-inventory/infrastructure/helpers/infrastructureTopologyApi.test.ts \
  src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.test.ts \
  src/features/discovery-inventory/infrastructure/layout/applyNodePositionOverrides.test.ts \
  src/features/discovery-inventory/infrastructure/model/filterInfrastructureTopology.test.ts \
  src/features/discovery-inventory/infrastructure/components/topologyFlowModel.test.ts \
  src/features/discovery-inventory/infrastructure/hooks/useTopologyNodePositionOverrides.test.ts

git commit -m "fix: move vitest hooks inside describe blocks (infrastructure tests)"
```

---

## Task 3: Fix Virtual Machines Tests (Category A - 3 files)

**Files:**
- Modify: `src/features/discovery-inventory/virtual-machines/helpers/virtualMachinesApi.test.ts`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.test.tsx`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.test.tsx`

**Pattern:** Same as Tasks 1-2 — move hooks inside describe blocks.

---

- [ ] **Step 1: Fix all 3 virtual machines test files**

For each file, find module-level hooks and move inside describe blocks.

- [ ] **Step 2: Test all 3 files**

```bash
npm test -- "virtual-machines.*test"
```

Expected: All load without suite context errors.

- [ ] **Step 3: Commit**

```bash
git add \
  src/features/discovery-inventory/virtual-machines/helpers/virtualMachinesApi.test.ts \
  src/features/discovery-inventory/virtual-machines/components/VirtualMachinesTable.test.tsx \
  src/features/discovery-inventory/virtual-machines/components/VirtualMachineDetailPanel.test.tsx

git commit -m "fix: move vitest hooks inside describe blocks (virtual machines tests)"
```

---

## Task 4: Fix Remaining Category A Files (9 files)

**Files:**
- Modify: `src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts`
- Modify: `src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx`
- Modify: `src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx`
- Modify: `src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx`
- Modify: `src/features/providers-connectors/providers/api/useUpsertProvider.test.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx`
- Modify: `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
- Modify: `src/shared/components/data-table/DetailDrawer.test.tsx`
- Modify: `src/shared/components/fetch-error-alert/FetchErrorAlert.test.tsx`

**Pattern:** Same as previous tasks — move hooks inside describe blocks.

---

- [ ] **Step 1: Fix all 9 files**

For each file, find module-level afterEach/beforeEach and move inside describe blocks.

- [ ] **Step 2: Test all files**

```bash
npm test 2>&1 | grep -E "FAIL|Test Files"
```

Expected: "FAIL" count for suite context errors should drop to 0 or near-0.

- [ ] **Step 3: Commit**

```bash
git add \
  src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts \
  src/features/recovery-plans/recovery-applications/components/TierCard.test.tsx \
  src/features/recovery-plans/recovery-applications/components/AddTierCard.test.tsx \
  src/features/recovery-plans/recovery-applications/components/TierCanvas.test.tsx \
  src/features/providers-connectors/providers/api/useUpsertProvider.test.tsx \
  src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx \
  src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx \
  src/shared/components/data-table/DetailDrawer.test.tsx \
  src/shared/components/fetch-error-alert/FetchErrorAlert.test.tsx

git commit -m "fix: move vitest hooks inside describe blocks (recovery, providers, shared components)"
```

---

## Task 5: Fix Category B Files (Module-Level Context Access - 2 files)

**Files:**
- Modify: `src/features/hooks/useVirtualMachinesUnified.test.ts`
- Modify: `src/shared/hooks/useResizablePanel.test.ts`

**Issue:** These files access renderHook or config at module level. The error is "Cannot read properties of undefined (reading 'config')".

**Pattern:** Move setup from module level into beforeEach inside describe block.

---

- [ ] **Step 1: Fix useVirtualMachinesUnified.test.ts**

Read file to find where config/renderHook is accessed at module level (around line 10). The pattern is:

```typescript
import { renderHook } from '@testing-library/react'

// These lines access setup before describe:
const { result } = renderHook(() => useVirtualMachinesUnified())

describe('useVirtualMachinesUnified', () => {
  it('...', () => {
    // uses result
  })
})
```

Change to:

```typescript
describe('useVirtualMachinesUnified', () => {
  let result: any

  beforeEach(() => {
    result = renderHook(() => useVirtualMachinesUnified()).result
  })

  it('...', () => {
    // uses result
  })
})
```

Move all module-level setup into a beforeEach block inside describe.

- [ ] **Step 2: Run tests for useVirtualMachinesUnified.test.ts**

```bash
npm test -- useVirtualMachinesUnified.test.ts
```

Expected: Suite loads, no "Cannot read properties" error.

- [ ] **Step 3: Fix useResizablePanel.test.ts**

Same pattern: move module-level setup (renderHook, config access) into beforeEach inside describe.

- [ ] **Step 4: Run tests for useResizablePanel.test.ts**

```bash
npm test -- useResizablePanel.test.ts
```

Expected: Suite loads.

- [ ] **Step 5: Commit**

```bash
git add \
  src/features/hooks/useVirtualMachinesUnified.test.ts \
  src/shared/hooks/useResizablePanel.test.ts

git commit -m "fix: move module-level setup into beforeEach (hook tests)"
```

---

## Task 6: Fix Category C Files (Missing Describe Blocks - 3 files)

**Files:**
- Modify: `src/shared/components/modal/Modal.test.tsx`
- Modify: `src/shared/components/modal/ConfirmDialog.test.tsx`
- Modify: `src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx`

**Issue:** These files have `it()` statements directly at module level without a describe block.

**Pattern:** Wrap all `it()` statements in a describe block.

---

- [ ] **Step 1: Fix Modal.test.tsx**

Read file. Current pattern:

```typescript
it('renders without crashing', () => {
  // test
})

it('shows content', () => {
  // test
})
```

Change to:

```typescript
describe('Modal', () => {
  it('renders without crashing', () => {
    // test
  })

  it('shows content', () => {
    // test
  })
})
```

Wrap all tests in a describe block with an appropriate name.

- [ ] **Step 2: Test Modal.test.tsx**

```bash
npm test -- Modal.test.tsx
```

Expected: Suite loads.

- [ ] **Step 3: Fix ConfirmDialog.test.tsx**

Same pattern: wrap all `it()` in describe block.

- [ ] **Step 4: Test ConfirmDialog.test.tsx**

```bash
npm test -- ConfirmDialog.test.tsx
```

Expected: Suite loads.

- [ ] **Step 5: Fix VMNodeTooltip.test.tsx**

Same pattern: wrap all `it()` in describe block.

- [ ] **Step 6: Test VMNodeTooltip.test.tsx**

```bash
npm test -- VMNodeTooltip.test.tsx
```

Expected: Suite loads.

- [ ] **Step 7: Commit**

```bash
git add \
  src/shared/components/modal/Modal.test.tsx \
  src/shared/components/modal/ConfirmDialog.test.tsx \
  src/features/discovery-inventory/infrastructure/components/nodes/VMNodeTooltip.test.tsx

git commit -m "fix: wrap bare test functions in describe blocks (modal, tooltip tests)"
```

---

## Task 7: Fix Remaining Component Tests (Category C - 2 files)

**Files:**
- Modify: `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.test.tsx`
- Modify: `src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.test.tsx`

**Pattern:** Same as Task 6 — wrap any bare `it()` in describe blocks.

---

- [ ] **Step 1: Check both files for bare it() statements**

Read both files:
- InfrastructureTopologyCanvas.test.tsx
- VirtualMachinesToolbar.test.tsx

If they have `it()` at module level (not in a describe), wrap in describe block.

- [ ] **Step 2: Test both files**

```bash
npm test -- "InfrastructureTopologyCanvas|VirtualMachinesToolbar"
```

Expected: Both load without errors.

- [ ] **Step 3: Commit**

```bash
git add \
  src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.test.tsx \
  src/features/discovery-inventory/virtual-machines/components/VirtualMachinesToolbar.test.tsx

git commit -m "fix: wrap bare test functions in describe blocks (topology, toolbar tests)"
```

---

## Checkpoint: Verify All Tests Load

After all 7 tasks:

- [ ] Run full test suite

```bash
npm test 2>&1 | tee /tmp/test_output.txt
```

Check output:
- No "Vitest failed to find the current suite" errors
- No "Cannot read properties of undefined" errors
- All 32 test files should show as "0 test" or with passing/failing tests (not as FAIL suites)

Expected output pattern:
```
 ❯ src/features/api/discoveryInventoryApi.test.ts (X tests)
   ✓ test name (Xs)
```

NOT:
```
 FAIL  src/features/api/discoveryInventoryApi.test.ts [ Error: Vitest failed to find... ]
```

- [ ] Linting clean

```bash
npm run lint
```

Expected: No new errors in modified test files.

- [ ] Build succeeds

```bash
npm run build
```

Expected: TypeScript compilation succeeds.

---

## Summary

**Total commits:** 7 (one per task)

**Files modified:** 32 test files

**Changes:** Move hooks inside describe blocks, move module-level setup into beforeEach, wrap bare tests in describe blocks

**Success criteria:**
- All 32 test files load without suite context errors
- No "Vitest failed to find the current suite" errors
- No "Cannot read properties of undefined" errors
- Linting clean
- Build succeeds

