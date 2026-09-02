# Todo: Platform Administration Audit Access Logs

## Phase 1: Backend and generated contract

- [ ] Task 1: Publish `AccessLogsResponse`/`AccessLogRecord` from `GET /get_access_logs` without changing endpoint semantics.
- [ ] Task 2: Pull the updated OpenAPI and regenerate Orval/Zod so Access Logs no longer returns `unknown`.

## Checkpoint: Contract

- [ ] Backend focused access-log self-check passes.
- [ ] `/get_access_logs` OpenAPI 200 response references the typed schema.
- [ ] `npm run api:check` passes.
- [ ] Generated files contain no handwritten edits.

## Phase 2: Frontend data lifecycle

- [ ] Task 3: Add Audit domain models, generated-response validation, wire/domain mapping, and `fetchAccessLogs`.
- [ ] Task 4: Add applied Audit URL filters, full-filter query keys, and `useAccessLogs` TanStack query.

## Checkpoint: Fetch semantics

- [ ] Default request uses `lines=200` semantics.
- [ ] `lines`, `status`, `method`, and `pathContains` each participate in cache identity.
- [ ] Draft edits issue no network request.
- [ ] Apply updates all four filters atomically.
- [ ] Fresh cached filter combinations are reused under the standard 15-minute policy.
- [ ] No Audit polling interval exists.

## Phase 3: Resources-style Audit UI

- [ ] Task 5: Build the inline collapsible query configuration toolbar.
- [ ] Task 6: Build metadata table, local pagination/density, and resizable request/response detail drawer.

## Checkpoint: Table behavior

- [ ] Collapsed/expanded configuration preserves the Resources visual language.
- [ ] Config exposes only `lines`, `status`, `method`, `path_contains`; `X-User` is not editable.
- [ ] Table columns are Method, Path, Status, Duration.
- [ ] Request/response bodies stay out of table cells.
- [ ] Page/page-size changes do not refetch the backend.
- [ ] Applying server filters resets local pagination to page 1.
- [ ] Raw malformed entries and JSON/string/null bodies render safely in detail.

## Phase 4: Localization and page integration

- [ ] Task 7: Add the complete EN/SK/CS Audit access-log localization contract.
- [ ] Task 8: Replace the existing Audit placeholder with lazy `AuditPage` on `/platform-administration/audit-retention`.
- [ ] Preserve the existing Platform Administration → Audit sidebar item; add no duplicate route.
- [ ] Use contained page scrolling and shared `TableToolbar`/`InventoryShell`/DataTable primitives like Resources.
- [ ] Remove the old Audit placeholder ownership from `modulePageConfigs`.

## Checkpoint: Page integration

- [ ] Existing Audit navigation opens the real page on the existing route.
- [ ] EN/SK/CS render without raw translation keys.
- [ ] Refresh, Apply, local pagination, density, error states, and drawer work together.

## Phase 5: Final verification

- [ ] Task 9: Run the focused backend/frontend integration verification.
- [ ] Run focused Audit API, hook, toolbar, table/drawer, and page Vitest files together.
- [ ] Run changed-file ESLint.
- [ ] Run `npm run api:check`.
- [ ] Run `npm run typecheck`.
- [ ] Parse EN/SK/CS locale JSON.
- [ ] Browser/network verify 320, 768, 1024, and 1440 px.
- [ ] Verify Apply sends exactly the normalized backend filters.
- [ ] Verify Refresh refetches only the current TanStack query.
- [ ] Verify cached rows survive a refresh error with compact retry state.
- [ ] Run `git diff --check` and inspect repository status before commits.

## Explicit non-goals

- [ ] Do not wire `loggingEnabled` to `settings.log_requests` in this task.
- [ ] Do not invent a timestamp/time column.
- [ ] Do not add a new detail endpoint or change log persistence/rotation.
- [ ] Do not change `VIEW_LOGS` RBAC mappings.
- [ ] Do not redesign shared Resources/table behavior globally.
