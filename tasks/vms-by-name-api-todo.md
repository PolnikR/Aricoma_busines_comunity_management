# Todo: `vms_by_name` API/Query Layer

See `tasks/vms-by-name-api-plan.md` for full detail.

## Task 1: Query key

- [x] Add `vmsByName(prefix?, providerId?)` to `discoveryInventoryKeys` in
      `src/features/discovery-inventory/resources/api/resourceInventoryQueryKeys.ts`

## Task 2: API client wrapper

- [x] Create `src/features/discovery-inventory/resources/api/vmsByNameApi.ts`
      exporting `fetchVmsByName(params?: { prefix?: string; providerId?: string })`
      using the generated `vmsByNameVmsByNameGet` + `VmsResponse` zod schema
- [x] Create matching `vmsByNameApi.test.ts`

## Task 3: Query hook

- [x] Create `src/features/discovery-inventory/resources/hooks/useVmsByName.ts`
      exporting `useVmsByName(prefix?, providerId?, enabled = true)`
- [x] Create matching `useVmsByName.test.tsx`

## Checkpoint

- [x] `npm exec vitest run` on the new test files
- [x] `npm run typecheck` (or scoped `tsc --noEmit`) passes
- [x] `npx eslint` on changed files passes
- [x] Grep confirms no component/page imports `useVmsByName` or `fetchVmsByName`
