# Fix Test Suite: Vitest Suite Context Errors

## Overview

The test suite has 32 failing test files caused by vitest hooks (afterEach, beforeEach) and module-level setup code being executed before describe() blocks. When vitest tries to register hooks before a suite is defined, it fails with "Vitest failed to find the current suite."

## Root Causes

1. **Hook Placement Error** (26 files): `afterEach()`, `beforeEach()`, `describe()` are in wrong order
   - Pattern: module-level setup code, then `afterEach()`, then `describe()`
   - Fix: Move hooks inside the `describe()` block

2. **Module-Level Context Access** (2-3 files): Code accesses config/context at module level before it's defined
   - Pattern: `useRenderHook()` or `.config` accessed before test setup
   - Fix: Move to `beforeEach()` block inside `describe()`

3. **Missing Describe Block** (3-5 files): Some tests have no describe block at all
   - Pattern: Direct `it()` statements at module level
   - Fix: Wrap all tests in a `describe()` block

## Error Categories

**Category A: Hook Before Describe** (Most common)
```
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('...', () => {
  // tests here
})
```

→ Fix: Move `afterEach()` inside `describe()` block

Files affected (26):
- src/features/api/discoveryInventoryApi.test.ts
- src/features/api/providersApi.test.ts
- src/features/api/vdisksApi.test.ts
- src/features/discovery-inventory/api/tagsApi.test.ts
- (and 22 more)

**Category B: Module-Level Config Access** (2-3 files)
```
const config = useHookConfig()  // ← Error: undefined at module level

describe('...', () => {
  // tests here
})
```

→ Fix: Move setup to `beforeEach()` inside `describe()`

Files affected:
- src/features/hooks/useVirtualMachinesUnified.test.ts
- src/shared/hooks/useResizablePanel.test.ts

**Category C: No Describe Block** (Several React component tests)
```
it('renders something', () => {
  // test directly at module level
})
```

→ Fix: Wrap all `it()` statements in a `describe()` block

Files affected (estimated 3-5):
- React component tests

## Implementation Plan

### Phase 1: Fix Category A (Hook Placement)

Create a script to automatically move hooks into describe blocks.

**Task 1: Fix API test files** (discoveryInventoryApi, providersApi, vdisksApi, tagsApi)
- Read each file
- Find `afterEach` at module level
- Move inside first `describe()` block
- Verify test structure is valid

**Task 2: Fix discovery-inventory test files** (14 files)
- Same pattern: move hooks inside describe

**Task 3: Fix remaining test files** (8 files)
- Shared components, infrastructure tests
- Same pattern: move hooks inside describe

### Phase 2: Fix Category B (Module-Level Context)

**Task 4: Fix hook-based tests**
- useVirtualMachinesUnified.test.ts
- useResizablePanel.test.ts
- Move setup code from module level to `beforeEach()`

### Phase 3: Fix Category C (No Describe Block)

**Task 5: Fix component render tests**
- Find files with direct `it()` at module level
- Wrap in `describe()` block

### Checkpoint: Verify All Tests

After all fixes:
- [ ] `npm test` shows 0 "Vitest failed to find the current suite" errors
- [ ] All 32 test files load (even if some assertions fail)
- [ ] Build succeeds: `npm run build`

## Fix Strategy

**Automated approach** (preferred):
1. Use a script or agent to programmatically fix all files by moving hooks

**Manual approach** (fallback):
1. Fix files one by one, grouping by error type
2. Test after each group

## Files to Fix (32 total)

### Category A: Hook Placement (26 files)
1. src/features/api/discoveryInventoryApi.test.ts
2. src/features/api/providersApi.test.ts
3. src/features/api/vdisksApi.test.ts
4. src/features/discovery-inventory/api/tagsApi.test.ts
5. src/features/discovery-inventory/infrastructure/helpers/mapInventoryToTopology.test.ts
6. src/features/discovery-inventory/infrastructure/helpers/infrastructureTopologyApi.test.ts
7. src/features/discovery-inventory/infrastructure/layout/layoutInfrastructureTopology.test.ts
8. src/features/discovery-inventory/infrastructure/layout/applyNodePositionOverrides.test.ts
9. src/features/discovery-inventory/infrastructure/model/filterInfrastructureTopology.test.ts
10. src/features/discovery-inventory/infrastructure/components/topologyFlowModel.test.ts
11. src/features/discovery-inventory/virtual-machines/helpers/virtualMachinesApi.test.ts
12. src/features/recovery-plans/recovery-applications/utils/tierUtils.test.ts
13. (+ 13 more component/render tests)

### Category B: Module-Level Context (2 files)
1. src/features/hooks/useVirtualMachinesUnified.test.ts
2. src/shared/hooks/useResizablePanel.test.ts

### Category C: No Describe Block (4+ files)
- Component render tests and modal tests

## Success Criteria

- [ ] All 32 test files load without suite context errors
- [ ] `npm test` output shows test file count, not "failed suites"
- [ ] At least some tests can run (assertions may still fail, but hook registration succeeds)
- [ ] No new linting errors introduced
