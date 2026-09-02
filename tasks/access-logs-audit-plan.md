# Implementation Plan: Platform Administration Audit Access Logs

## Overview

Replace the existing Platform Administration → Audit placeholder with a real Access Logs page backed by `GET /get_access_logs`. The page must preserve the existing Resources visual language and data lifecycle: contained viewport layout, shared page header, inventory-style card shell, shared data table primitives, TanStack Query caching, generated Orval client usage, generated Zod response validation, retry/background-refresh states, row density, client-side pagination, and the shared right-hand detail drawer.

The Access Logs table will show only compact request metadata (`method`, `path`, `status`, `duration_ms`). The endpoint query inputs (`lines`, `status`, `method`, `path_contains`) will live in an Audit-owned collapsible query configuration header integrated into the table card. Draft values do not fetch. `Apply` atomically updates the applied filter state and therefore the TanStack query key/request. `X-User` remains owned by the shared API/auth layer and is not exposed as a user-editable Audit filter.

The backend endpoint already exists and already implements the required filtering. The only backend change required by this feature is to publish the existing response shape through a FastAPI `response_model`, because the current OpenAPI response is `{}` and the generated frontend client therefore returns `Promise<unknown>`.

## Confirmed Existing State

- The navigation item already exists under Platform Administration as `Audit`.
- The canonical route already exists as `/platform-administration/audit-retention` (`routes.platformAuditRetention`).
- That route currently falls through `renderModulePageRoutes(...)` and renders `ModuleWorkQueuePage`; no second Audit route should be added.
- Resources uses a contained viewport, `TableToolbar`, shared `InventoryShell`, a bordered/rounded table panel, `DataTable`, `DataTableRequestState`, `DataTablePagination`, density controls, and shared detail drawers.
- The application-wide TanStack policy is `staleTime=15 min`, `gcTime=60 min`, `retry=1`, and stale refetch on focus/mount/reconnect. Normal queries do not poll.
- `GET /get_access_logs` accepts:
  - `lines`: integer, default `200`, min `1`, max `5000`;
  - `status`: optional integer;
  - `method`: optional string, compared server-side after uppercasing the supplied value;
  - `path_contains`: optional string substring filter.
- The endpoint requires `VIEW_LOGS` and is protected by the existing shared auth flow.
- A normal log entry currently contains `method`, `path`, `status`, `duration_ms`, `request_body`, and `response_body`; malformed log-file lines are returned as `{ "raw": "..." }`.
- The backend does not currently provide a timestamp or persistent log-entry ID.
- `request_body` and `response_body` may be large nested JSON values, strings, or `null`.
- Access logging is populated only when backend request logging is enabled. This feature reads existing logs; it does not change the logging enablement mechanism.

## Architecture Decisions

### 1. Keep the existing Audit navigation and route identity

Do not add a duplicate sidebar item or a new competing path. Convert the existing `/platform-administration/audit-retention` placeholder into a lazy-loaded real `AuditPage`. Add `handle={{ contentScroll: 'contained' }}` so its viewport behavior matches Resources.

### 2. Fix the OpenAPI contract before frontend integration

Add `AccessLogRecord` and `AccessLogsResponse` in backend `api/schemas.py`, then attach `response_model=AccessLogsResponse` to `GET /get_access_logs`. The record remains permissive enough to represent both normal JSON-line entries and the existing `{ raw }` fallback. Request/response bodies remain arbitrary JSON-compatible values.

The frontend must then regenerate Orval output from the updated backend OpenAPI. Generated files are never hand-edited. The feature API boundary must consume the generated client and generated Zod schema through the same `parseGeneratedResponse(...)` + `toOrvalRequestError(...)` pattern already used by Identity Access and Discovery Settings.

### 3. Keep wire names at the API seam and domain names in camelCase

Feature state uses a small domain filter model:

```text
lines
status
method
pathContains
```

The API mapper converts only at the boundary:

```text
pathContains -> path_contains
```

Likewise, `duration_ms`, `request_body`, and `response_body` are mapped into feature-owned camelCase fields. Generated OpenAPI types remain untouched.

### 4. Separate draft configuration from applied query state

The collapsible query header owns draft form values. Opening/expanding the configuration copies the currently applied filters into draft state. Editing `lines`, `status`, `method`, or `pathContains` does not issue requests.

`Apply` performs validation/normalization and atomically updates the applied URL state. Only that applied state feeds `useAccessLogs(...)` and the TanStack query key. This preserves focus, avoids request-per-keystroke behavior, and matches the existing solution's draft-versus-applied filter pattern.

`Clear all` resets the applied server filters to the backend defaults (`lines=200`, all optional filters unset), resets the draft, and returns the client table to page 1.

### 5. Applied server filters are URL state

Create an Audit-specific URL-state hook. The URL represents the applied query, not temporary form edits. It must:

- omit default `lines=200` from the URL;
- omit unset optional values;
- normalize `method` to uppercase when applied;
- validate `lines` to `1..5000` and `status` as an integer before committing;
- preserve unrelated query parameters;
- update all four filters in one `setSearchParams` transaction.

This makes Audit deep links reproducible without making draft input changes network-active.

### 6. Every server filter participates in the TanStack cache identity

Use a dedicated key factory:

```text
['access-logs', 'list', lines, status|null, method|null, pathContains|null]
```

`useAccessLogs(appliedFilters)` uses the standard global query policy. Do not add `refetchInterval`. The page-level Refresh action calls `refetch()` for the current applied query. Returning to a still-fresh filter combination reuses its isolated cache entry.

### 7. Match Resources visually without importing Resources-owned components across features

Reuse shared primitives (`TableToolbar`, `InventoryShell`, `DataTable`, `DataTableRequestState`, `DataTablePagination`, form controls, `DetailDrawer`) but do not import feature-owned wrappers such as `ResourceInventoryPanel` or `ResourceViewportFrame` into Platform Administration.

The Audit feature will recreate the same lightweight composition with shared primitives/classes:

```text
Page header / Refresh
  -> InventoryShell
      -> Access Logs table panel
          -> compact toolbar row
          -> collapsible query configuration header
          -> DataTable
          -> DataTablePagination
```

This keeps visual parity while preserving feature boundaries.

### 8. The query configuration is inline/collapsible, not the existing filter modal

Do not change shared `DataTableToolbar` from modal behavior for every caller. Build an Audit-owned `AccessLogsQueryToolbar` using the same spacing, border, buttons, density control, and form primitives, but render its configuration panel inline beneath the toolbar row.

Fields map directly to the backend contract:

```text
Lines | Status | Method | Path contains | Clear all | Apply
```

`X-User` is deliberately absent.

### 9. Keep large bodies out of the table and show them in the shared detail drawer

Table columns:

```text
Method | Path | Status | Duration
```

A row click opens the shared resizable `DetailDrawer` with request metadata plus pretty-printed `requestBody` and `responseBody`. The drawer must handle `null`, strings, objects, arrays, and raw malformed-line entries without assuming one fixed body shape.

Because the backend has no log-entry ID, the table may use the `DataTable` index-aware `rowKey(row, index)` to create a client-only key for the current fetched snapshot. Selection is cleared when the applied server query changes or a manual refresh replaces the snapshot.

### 10. Keep `lines` and table pagination as different concepts

`lines` controls how many matching entries the backend loads into the current snapshot. `DataTablePagination` paginates that already-fetched snapshot client-side so selecting `lines=5000` does not render 5000 DOM rows at once.

Use the existing table pagination behavior and page-size choices (`10`, `25`, `50`), with a sensible Audit default of `25`. Changing table page/page size does not refetch the backend. Applying new server filters resets the table to page 1.

### 11. Preserve cached data during background refresh errors

If a current filter combination has cached rows and a focus/manual refresh fails, keep the table visible and show the shared compact retry/error state. Only an initial request with no cached data should replace the table body with the full request error state.

### 12. No timestamp is invented

Do not render a Time column because the current backend access-log record has no timestamp. Adding timestamps is a separate backend contract change and is out of scope for this feature.

## Fetch and State Flow

```text
/platform-administration/audit-retention
        |
        v
AuditPage
        |
        +--> useAuditSearchParams()
        |       -> normalized APPLIED filters
        |
        +--> AccessLogsQueryToolbar
        |       -> local DRAFT filters
        |       -> Apply -> one atomic URL update
        |
        +--> useAccessLogs(appliedFilters)
                |
                +--> accessLogKeys.list(appliedFilters)
                |
                +--> fetchAccessLogs(appliedFilters)
                        |
                        +--> toAccessLogParams()
                        +--> generated getAccessLogsGetAccessLogsGet(...)
                        +--> shared orvalMutator/auth
                        +--> generated AccessLogsResponse Zod schema
                        +--> parseGeneratedResponse(...)
                        +--> domain mapper
                                |
                                v
                         TanStack cache
                                |
                                v
                      DataTable + DetailDrawer
```

## Dependency Graph

```text
Task 1 Backend typed response contract
        |
        v
Task 2 Regenerate frontend OpenAPI client
        |
        v
Task 3 Frontend API/domain boundary
        |
        v
Task 4 Applied filter URL state + TanStack query
        |                         \
        v                          \
Task 5 Inline query toolbar         Task 6 Table + detail drawer
        \                          /
         +------------------------+
                    |
                    +------------------> Task 7 Audit localization
                    |                         |
                    +-------------------------+
                              |
                              v
Task 8 Audit page + existing route integration
                              |
                              v
Task 9 Integrated verification
```

Tasks 5 and 6 are safe to implement in parallel after Task 4. Task 7 may proceed in parallel with Tasks 5-6 once the final UI labels are known. Task 8 is the integration gate. All contract-dependent frontend work is blocked by Tasks 1-2.

## Task Details

## Task 1: Publish a typed backend access-log response

**Description:** Add a FastAPI response contract for the already-existing `GET /get_access_logs` behavior without changing filtering, authorization, file scanning, log persistence, or response contents.

**Acceptance criteria:**
- [ ] OpenAPI `200` for `/get_access_logs` references `AccessLogsResponse` instead of `{}`.
- [ ] Normal entries preserve method/path/status/duration/body fields and malformed lines still support the existing `raw` fallback.
- [ ] `lines`, `status`, `method`, `path_contains`, `VIEW_LOGS`, and `{"entries": []}` behavior remain unchanged.

**Verification:**
- [ ] Add/run a focused assert-based router self-check, e.g. `python -m api.routers._test_logs`.
- [ ] Inspect `app.openapi()` and verify the `/get_access_logs` 200 schema references the new response model.
- [ ] Run `python -m flake8` only on the touched backend files if repository tooling supports path-scoped invocation.

**Dependencies:** None.

**Files likely touched:**
- `abco-be/api/schemas.py`
- `abco-be/api/routers/logs.py`
- `abco-be/api/routers/_test_logs.py`

**Estimated scope:** Medium: 3 files.

## Task 2: Regenerate the frontend OpenAPI contract

**Description:** Pull the backend OpenAPI after Task 1 and regenerate the Orval client/models/Zod output. This task is mechanical and must not include handwritten fixes inside generated files.

**Acceptance criteria:**
- [ ] `getAccessLogsGetAccessLogsGet(...)` no longer returns `Promise<unknown>`.
- [ ] `GetAccessLogsGetAccessLogsGetResponse` is backed by the generated access-log response schema rather than `zod.unknown()`.
- [ ] Query parameter generation still exposes the existing `lines/status/method/path_contains` contract and bounds.

**Verification:**
- [ ] `npm run api:update` completes against the updated backend contract.
- [ ] `npm run api:check` passes.
- [ ] Inspect generated diff; no generated source is manually authored.

**Dependencies:** Task 1.

**Files likely touched:**
- `openapi/abco-api.json`
- `src/generated/api/client.gen.ts`
- `src/generated/api/zod.gen.ts`
- `src/generated/api/models/*accessLog*.gen.ts`
- `src/generated/api/models/index.ts`

**Estimated scope:** Medium mechanically generated contract update; generated file count may exceed five but remains one atomic generation step.

## Checkpoint: Backend and generated contract

- [ ] Backend focused access-log self-check passes.
- [ ] Live OpenAPI exposes `AccessLogsResponse` for the endpoint.
- [ ] Generated Orval client no longer returns `unknown` for Access Logs.
- [ ] Generated Zod response is typed and `npm run api:check` passes.

## Task 3: Add the Audit access-log API/domain boundary

**Description:** Create a Platform Administration Audit feature boundary that consumes only the generated API contract, validates it with generated Zod, maps wire names to camelCase domain records, and wraps request failures through the existing shared Orval error adapter.

**Acceptance criteria:**
- [ ] `fetchAccessLogs(filters)` calls the generated `GET /get_access_logs` operation with only normalized server parameters.
- [ ] Successful payloads are validated before mapping; malformed API payloads fail at the API boundary.
- [ ] Domain records retain arbitrary request/response bodies and the `raw` fallback without losing server data.

**Verification:**
- [ ] Focused API tests cover param mapping, normal response mapping, raw entries, and malformed-response rejection.
- [ ] Focused ESLint passes for the new API/model files.

**Dependencies:** Task 2.

**Files likely touched:**
- `src/features/platform-administration/audit/model/accessLogTypes.ts`
- `src/features/platform-administration/audit/api/schemas/accessLogSchema.ts`
- `src/features/platform-administration/audit/api/accessLogsApi.ts`
- `src/features/platform-administration/audit/api/accessLogsApi.test.ts`

**Estimated scope:** Medium: 4 files.

## Task 4: Add applied URL filters and isolated TanStack queries

**Description:** Implement the server-query state and cache identity. Applied filters live in URL search parameters; TanStack caches every normalized combination independently and inherits the application's standard query policy.

**Acceptance criteria:**
- [ ] Query key contains normalized `lines`, `status`, `method`, and `pathContains`; changing any applied criterion selects a different cache entry.
- [ ] Default `lines=200` and unset filters are canonicalized, invalid URL values fall back safely, and all four criteria can be applied atomically while unrelated URL parameters survive.
- [ ] `useAccessLogs` performs no polling, reuses fresh cached combinations, and exposes manual `refetch`/background fetch state from TanStack.

**Verification:**
- [ ] Hook tests prove cache isolation, fresh-cache reuse, default normalization, URL deep links, atomic filter updates, and no request from draft-only edits.
- [ ] Tests use `STANDARD_QUERY_OPTIONS` with retry disabled only for deterministic test execution.

**Dependencies:** Task 3.

**Files likely touched:**
- `src/features/platform-administration/audit/api/accessLogQueryKeys.ts`
- `src/features/platform-administration/audit/hooks/useAccessLogs.ts`
- `src/features/platform-administration/audit/hooks/useAuditSearchParams.ts`
- `src/features/platform-administration/audit/hooks/accessLogHooks.test.tsx`

**Estimated scope:** Medium: 4 files.

## Checkpoint: Frontend data lifecycle

- [ ] API boundary validates generated schemas and uses shared Orval error conversion.
- [ ] Every applied server-filter combination has a deterministic isolated TanStack key.
- [ ] Fresh cache reuse follows the standard 15-minute application policy.
- [ ] No Audit-specific polling exists.
- [ ] Draft form edits cause zero network requests until Apply.

## Task 5: Build the inline collapsible access-log query toolbar

**Description:** Build an Audit-owned toolbar that visually matches the Resources table controls but expands an inline query configuration header instead of opening the shared filter modal. Keep draft state separate from applied state.

**Acceptance criteria:**
- [ ] Collapsed state keeps a compact Resources-style table header with query/filter trigger and density control; expanded state renders `Lines`, `Status`, `Method`, and `Path contains` plus `Clear all` and `Apply`.
- [ ] `lines` enforces `1..5000`, status accepts an optional integer, method is normalized on apply without inventing a backend enum, and `X-User` is not rendered.
- [ ] Apply submits one complete normalized draft; Clear all resets to backend defaults; Cancel/collapse does not mutate applied filters.

**Verification:**
- [ ] Component tests prove expand/collapse, draft isolation, validation, Apply, Clear all, keyboard labels, and density behavior.
- [ ] No shared `DataTableToolbar` caller changes behavior.

**Dependencies:** Task 4.

**Files likely touched:**
- `src/features/platform-administration/audit/components/AccessLogsQueryToolbar.tsx`
- `src/features/platform-administration/audit/components/AccessLogsQueryToolbar.test.tsx`

**Estimated scope:** Small: 2 files.

## Task 6: Build the access-log table and detail drawer

**Description:** Render the fetched snapshot using the existing shared data-table conventions. Keep large bodies out of cells and expose them only after selecting a row.

**Acceptance criteria:**
- [ ] Table columns are Method, Path, Status, and Duration; request/response bodies never expand table rows or columns.
- [ ] Client-side pagination and density use shared controls; changing page/page size does not call the backend, while changing the applied server query resets page 1.
- [ ] Row activation opens the shared resizable `DetailDrawer` and safely renders normal entries, arbitrary JSON/string/null bodies, and raw malformed entries.

**Verification:**
- [ ] Component tests cover loading skeleton rows, empty data, cached-data refresh error, row keyboard activation, drawer content, selection reset, and local pagination.
- [ ] Test a returned window larger than one page and verify no backend call occurs when paging locally.

**Dependencies:** Task 4.

**Files likely touched:**
- `src/features/platform-administration/audit/components/AccessLogsTable.tsx`
- `src/features/platform-administration/audit/components/AccessLogDetailDrawer.tsx`
- `src/features/platform-administration/audit/components/AccessLogsTable.test.tsx`

**Estimated scope:** Medium: 3 files.

## Checkpoint: Audit table interaction

- [ ] UI visually follows the Resources table/card language without cross-feature imports.
- [ ] Query configuration is inline/collapsible, not a Swagger-style form and not the generic filter modal.
- [ ] Large request/response bodies appear only in the drawer.
- [ ] `lines` controls the backend snapshot while Rows per page controls only the local table view.
- [ ] Empty/loading/error/cached-refresh states use shared patterns.

## Task 7: Add the Audit access-log localization contract

**Description:** Add the user-facing Audit/access-log copy in the same EN/SK/CS locale files used by the rest of the application. This task defines labels consumed by the page, query configuration, table, pagination context, errors, empty state, and detail drawer without changing route behavior.

**Acceptance criteria:**
- [ ] EN/SK/CS contain the same Audit access-log key set for page copy, query fields/actions, table columns, empty/error states, and detail content.
- [ ] Existing `nav.administration.audit` keys remain unchanged and no duplicate navigation label is introduced.
- [ ] Locale values are valid JSON and no Audit UI falls back to raw translation keys once Task 8 is integrated.

**Verification:**
- [ ] Parse all three locale JSON files.
- [ ] Run the repository's focused localization/key consistency check if one exists; otherwise verify the exact key set in a small focused test or content assertion.

**Dependencies:** None for file creation; final key names must stay aligned with Tasks 5, 6, and 8.

**Files likely touched:**
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium: 3 files.

## Task 8: Replace the Audit placeholder with the real contained page

**Description:** Compose the completed toolbar/table/data flow into a lazy-loaded `AuditPage`, connect Refresh to the current TanStack query, and replace only the existing placeholder ownership of `/platform-administration/audit-retention`. Preserve the current sidebar route and navigation identity.

**Acceptance criteria:**
- [ ] `/platform-administration/audit-retention` renders the real Audit page under the existing Platform Administration → Audit sidebar item; no duplicate route/nav item exists.
- [ ] Page uses Resources-equivalent contained viewport, `TableToolbar`, shared `InventoryShell`, table card composition, refresh state, localized copy, and responsive sizing.
- [ ] The Audit entry is removed from placeholder rendering ownership and the explicit route uses lazy `Suspense` plus `handle={{ contentScroll: 'contained' }}`.

**Verification:**
- [ ] Page test covers initial load, Apply-driven request changes, manual Refresh, empty/error/cached-refresh states, local pagination, and drawer opening.
- [ ] Route inspection/test proves the old `ModuleWorkQueuePage` no longer owns Audit and no second sidebar item/path was added.
- [ ] Focused page test passes in EN/SK/CS translation context or through the repository's translation mock conventions.

**Dependencies:** Tasks 5, 6, and 7.

**Files likely touched:**
- `src/features/platform-administration/audit/pages/AuditPage.tsx`
- `src/features/platform-administration/audit/pages/AuditPage.test.tsx`
- `src/app/AppRoutes.tsx`
- `src/app/modulePageConfigs.ts`

**Estimated scope:** Medium: 4 files.

## Checkpoint: Page integration

- [ ] Existing Audit sidebar item opens the real contained page.
- [ ] Old placeholder ownership is gone without changing the canonical route.
- [ ] EN/SK/CS labels render without raw keys.
- [ ] Refresh, query Apply, table pagination, density, errors, and detail selection work together.

## Task 9: Run focused integration and browser verification

**Description:** Verify the complete backend-contract → generated-client → TanStack → Audit UI path without broad unrelated refactoring.

**Acceptance criteria:**
- [ ] Network requests exactly reflect the applied four backend query parameters and never include `X-User` as user-entered form state.
- [ ] Cached filter combinations, manual refresh, background refresh errors, local pagination, density, and drawer behavior remain stable across navigation away/back.
- [ ] Audit layout remains contained and usable at 320, 768, 1024, and 1440 px without horizontal page overflow.

**Verification:**
- [ ] Backend focused log self-check passes.
- [ ] Frontend focused API/hook/component/page Vitest files pass together.
- [ ] Changed TypeScript/TSX files pass focused ESLint.
- [ ] `npm run api:check` passes.
- [ ] `npm run typecheck` passes because the generated contract and feature boundary are cross-cutting.
- [ ] `git diff --check` passes in each repository; inspect status/diff before task-scoped commits.
- [ ] Full `npm test` / production build is run only if focused verification exposes cross-cutting failures or the reviewer explicitly requests it.

**Dependencies:** Task 8.

**Files likely touched:** None unless verification finds an in-scope defect.

**Estimated scope:** Small verification task.

## Final Checkpoint

- [ ] Existing Platform Administration → Audit navigation resolves to the real page.
- [ ] Backend OpenAPI publishes a typed access-log response.
- [ ] Generated Orval/Zod output is current and unmodified by hand.
- [ ] Audit fetch uses generated client → generated schema validation → domain mapper → TanStack Query.
- [ ] Draft configuration does not fetch; Apply updates one normalized query state.
- [ ] Standard TanStack cache policy is preserved and Audit has no timer polling.
- [ ] Table/drawer/error/loading/pagination/density behavior uses existing shared solution patterns.
- [ ] EN/SK/CS copy is complete.
- [ ] Focused verification, typecheck, API generated checks, and diff checks pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Frontend starts from `Promise<unknown>` and hand-types the response | High | Task 1 publishes the backend response model; Task 2 regenerates before handwritten FE integration |
| Draft field changes trigger repeated network requests | High | Separate local draft state from applied URL state; only Apply changes the TanStack key |
| Cache collisions between different filters | High | Include all four normalized server parameters in the access-log query key |
| Shared Resources toolbar behavior is changed for every feature | High | Keep the inline collapsible toolbar Audit-owned and reuse only shared primitives |
| `lines=5000` renders thousands of rows | Medium | Treat `lines` as server window and paginate the returned snapshot client-side |
| Large response bodies make rows unreadable | High | Metadata-only table; bodies only in resizable detail drawer |
| Large bodies still make the network payload heavy | Medium | User-controlled `lines` bounds the snapshot; a metadata/detail split endpoint is a separate optimization |
| No timestamp exists but UI implies chronology | Medium | Do not invent a Time column; document timestamp work as out of scope |
| No persistent ID exists for logs | Medium | Use snapshot-local index-aware row keys and clear selection on snapshot replacement |
| Empty response is incorrectly described as "logging disabled" | Medium | Show a neutral no-records state; the endpoint does not expose logging enablement state |
| Audit placeholder remains reachable alongside real page | Medium | Replace the existing route mapping rather than adding a second route |
| Cross-feature imports couple Platform Administration to Resources | Medium | Reuse shared primitives/classes, not Resources-owned wrapper components |

## Out of Scope

- Changing how request logging is enabled (`settings.log_requests`).
- Wiring BACKEND provider `loggingEnabled` to runtime request logging.
- Adding timestamps to access-log records.
- Adding a persistent log-entry ID.
- Adding log rotation, indexed search, or database persistence.
- Adding a second `GET /get_access_logs/{id}` detail endpoint.
- Removing `request_body`/`response_body` from the current list endpoint.
- Export/SIEM/retention features mentioned by the old placeholder copy.
- Changing RBAC role-to-`VIEW_LOGS` mappings.
- Changing the existing `/platform-administration/audit-retention` route path.
- Redesigning shared Resources components or global table behavior.

## Open Questions

None required to start this scope. If a timestamp or metadata-only backend listing is desired, treat it as a follow-up contract change rather than silently expanding this implementation.
