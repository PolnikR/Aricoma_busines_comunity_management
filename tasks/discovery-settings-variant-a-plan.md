# Implementation Plan: Discovery Settings — Variant A

## Overview

Implement the approved **Variant A** redesign for `/providers-connectors/discovery-settings` with exactly three top-level tabs:

```text
Discovery Settings
├── Configuration
│   ├── Discovery schedule          # existing frontend-only/mock domain
│   └── Cache configuration         # real backend Discovery Cache config
├── History                         # real backend Discovery Cache history
└── Notifications                   # existing frontend-only/mock domain
```

The implementation must use the existing design system and shared primitives rather than introducing a parallel UI layer. The real Discovery Cache UI must be wired only through the already implemented feature-owned API/model/TanStack layer:

```text
UI
 ↓
useDiscoveryCacheConfig()
useUpdateDiscoveryCacheConfig()
useDiscoveryCacheHistory(filters)
 ↓
discoveryCacheApi.ts
 ↓
generated Orval client
 ↓
backend
```

Schedule and Notifications remain explicitly local/frontend-only until a backend contract exists for them. Cache configuration and History are real backend-backed functionality and must not be presented as part of the same persistence transaction as the local mock settings.

This plan changes frontend production UI only. It does **not** change the backend, OpenAPI, generated client, Discovery Cache service semantics, Resources force-refresh flow, or provider-specific `cacheRefreshSeconds` behavior.

---

## Verified Current State

### Frontend

The repository already contains:

- `PageHeader`
- `Tabs`
- `SettingsSectionCard`
- `Card`
- `Field`, `Input`, `Select`
- `Toggle`
- `Button`
- `Alert`
- `FetchErrorAlert`
- `DataTable`
- `DataTableRequestState`
- `DataTableSkeleton` / `SkeletonBlock`
- `Badge`
- `StateCell`
- `EmptyState`
- backend error helpers (`extractBackendErrorDetail`, `resolveUserFacingErrorMessage`)

The existing Discovery Settings feature already has three React components that will be **modified/reused**, not replaced by new feature components:

```text
DiscoveryScheduleCard.tsx
DiscoveryHistoryCard.tsx
DiscoveryNotificationsCard.tsx
```

The real Discovery Cache API layer is already implemented:

```text
GET /discovery/cache/config
PUT /discovery/cache/config
GET /discovery/cache/history
```

with:

```ts
useDiscoveryCacheConfig()
useUpdateDiscoveryCacheConfig()
useDiscoveryCacheHistory(filters)
```

and frontend models:

```ts
DiscoveryCacheConfig
DiscoveryCacheConfigPatch
DiscoveryCacheHistoryFilters
DiscoveryCacheRun
DiscoveryCacheHistory
```

### Backend

The backend repository was verified directly.

#### Cache config

`GET /discovery/cache/config`

- requires `VIEW_DIAGNOSTICS`;
- returns `defaults: Record<string, number>`;
- returns `history_retention.retention_days` and `max_records`.

`PUT /discovery/cache/config`

- requires `MANAGE_PLATFORM_CONFIGURATION`;
- supports partial updates;
- validates values as positive integers;
- updating a provider-type default invalidates matching backend cache entries that do not have a provider-specific override;
- invalidation is lazy — it does not immediately refetch inventory and does not itself create a History run.

Built-in defaults currently include:

```text
VMWARE      300 s
FLASHCOPY   300 s
IBM_POWER   300 s
```

but the frontend contract deliberately remains `Record<string, number>` so future/unknown backend keys must be preserved rather than dropped.

Provider-level `cacheRefreshSeconds` remains a separate override on the concrete infrastructure Provider. It is not moved into Discovery Settings.

#### Cache history

`GET /discovery/cache/history` supports only these server query parameters:

```text
provider_id?: string
limit?: number
```

The backend performs both operations itself:

1. orders records **most recent first**;
2. filters by `provider_id` when supplied;
3. applies `limit` after filtering.

The UI therefore must render the returned `runs` directly. No client-side filtering, sorting, search, pagination, or post-processing may change which rows are visible.

A history record contains:

```text
provider_id
provider_type
triggered_by: stale | forced | param_change
started_at
duration_ms
success
record_count?
error?
```

`record_count` is the count of the raw fetched snapshot, not a filtered resource-table count.

History logs actual live fetch attempts. Cache hits are not logged.

`error` may contain technical text and must **not** be exposed directly to end users in the History table.

#### Permission consequence for the Provider filter

A critical RBAC detail:

```text
PLATFORM_ADMIN
├── VIEW_DIAGNOSTICS
└── MANAGE_PLATFORM_CONFIGURATION
```

but `PLATFORM_ADMIN` does **not** have `VIEW_PROVIDERS`.

`GET /get_providers` requires `VIEW_PROVIDERS`.

Therefore the History filter must **not** depend on `useProviders()` merely to populate a dropdown. The approved implementation will use a **Provider ID input with Apply/Clear** and send the applied value as backend `provider_id`.

If a future product requirement mandates a provider dropdown, the backend permission/data contract must first be changed explicitly. That is out of scope here.

---

## Non-Negotiable Constraints

1. Exactly three top-level tabs: `Configuration`, `History`, `Notifications`.
2. No nested/second-level tabs.
3. Use shared UI primitives wherever an equivalent already exists.
4. **Do not create a new feature-local React component.** Reuse the three existing Discovery Settings components and compose shared primitives directly in the page.
5. If implementation reveals a genuinely missing reusable React primitive, it must be added under `src/shared/components/...`, have a focused unit test, and be consumed from there. Do not add one unless necessary.
6. History uses backend filtering only. No `Array.filter`, client search, client sorting, `useTableState`, or client pagination over `runs`.
7. Do not use `DataTableToolbar` for History because it always owns a client search input. Compose the server query controls from shared `Field`, `Input`, `Select`, and `Button` instead.
8. Do not use `DataTablePagination`; the backend does not expose `page`, `offset`, or total-count semantics.
9. Do not use `useProviders()` for History filtering.
10. Do not poll History. Manual Refresh uses the existing query `refetch()` with the same server criteria.
11. Do not display raw `DiscoveryCacheRun.error` text.
12. Do not parse `startedAt` with `new Date()` or otherwise invent timezone semantics. The backend/OpenAPI currently exposes it as a plain string. Presentation may normalize the separator/precision only when the expected string pattern matches.
13. Do not hard-code the cache-default UI to only three keys. Known types receive friendly labels; unknown keys remain visible and editable with their raw backend key.
14. Do not merge mock `DiscoverySettings` state with `DiscoveryCacheConfig`.
15. Do not make one Save action imply that local Schedule and real Cache config are one backend transaction.
16. Do not invalidate frontend inventory queries after changing backend cache config. Backend and TanStack caches remain separate layers.
17. Do not invalidate History after config Save. A config change itself is not a discovery run.
18. No manual edits to generated Orval files.
19. No backend/OpenAPI changes in this plan.
20. EN/SK/CS localization, accessibility, loading/error/empty states, and responsive behavior are part of the implementation, not follow-up polish.

---

## Target UX

### Page shell

```text
PageHeader
Tabs: [ Configuration ] [ History ] [ Notifications ]
Active tab panel
```

Use the existing shared `Tabs` component. The active tab is URL state so reload, Back/Forward, and deep links preserve navigation.

Canonical URL state:

```text
?tab=history
?tab=notifications
```

`Configuration` is the default and omits `tab`.

History server criteria also live in the URL:

```text
?tab=history&providerId=vmware-vcenter-01&limit=100
```

Default `limit` is `50` and may be omitted from the URL. Supported UI choices are:

```text
25 | 50 | 100
```

These are UX choices only; they do not claim a backend maximum.

### Configuration

Desktop Variant A layout:

```text
┌─────────────────────────┐  ┌──────────────────────────────────┐
│ Discovery schedule      │  │ Cache configuration              │
│ local/frontend-only     │  │ real backend                     │
│                         │  │                                  │
│ Enabled                 │  │ Cache defaults                   │
│ Frequency               │  │ VMWARE / FLASHCOPY / IBM_POWER  │
│ Timezone                │  │ + unknown future keys           │
│                         │  │                                  │
│ local Save / Cancel     │  │ History retention               │
│                         │  │ retentionDays / maxRecords       │
│                         │  │ backend Save / Cancel            │
└─────────────────────────┘  └──────────────────────────────────┘
```

Below the desktop breakpoint the cards stack vertically.

The two cards have independent persistence domains:

- Schedule Save/Cancel modifies only its local snapshot and clearly reports local-only persistence.
- Cache Save/Cancel modifies only the backend cache config.
- A failed backend Save leaves the cache draft dirty and leaves the last successful TanStack cache value unchanged.
- A successful backend Save adopts the returned response as the new baseline without issuing a redundant GET.

Cache form values are edited as strings locally so blank/in-progress numeric input is possible. Before Save they are validated and converted to positive integers.

Cache Save sends a **minimal partial patch**, not the complete current object:

```text
changed defaults only
changed retentionDays only
changed maxRecords only
```

This uses the backend partial-update contract and avoids unnecessarily overwriting unrelated settings.

### History

```text
Provider ID [________________] [Apply] [Clear]
Latest runs [50 ▼]                            [Refresh]

DataTable
┌──────────┬──────────┬──────┬─────────┬────────┬──────────┬─────────┐
│ Started  │ Provider │ Type │ Trigger │ Status │ Duration │ Records │
└──────────┴──────────┴──────┴─────────┴────────┴──────────┴─────────┘
```

Server flow:

```text
pending Provider ID input
        ↓ Apply
URL providerId
        ↓
useDiscoveryCacheHistory({ providerId, limit })
        ↓
GET /discovery/cache/history?provider_id=...&limit=...
        ↓
backend filter + backend ordering + backend limit
        ↓
DataTable rows = response.runs
```

Rules:

- typing does not filter already loaded rows;
- Apply changes the server query;
- Clear removes `provider_id` and requests all providers again;
- changing `limit` changes the server query immediately;
- Refresh refetches the same query key/criteria;
- rows are never sorted or filtered on the client;
- no pagination control;
- no raw technical `error` column;
- failed rows use a generic localized failed status only.

### Notifications

Notifications remain a separate top-level tab.

Reuse the existing `DiscoveryNotificationsCard` with local-only Save/Cancel semantics and a clear local-only status. The selected recipient preview and Send test behavior remain frontend-only.

The Variant A supporting explanation may be rendered directly with the existing shared `Card`; do not create a new `NotificationBehaviorCard` component.

---

## State Ownership

```text
URL state
├── active tab
├── applied history providerId
└── history limit

Local mock state
├── schedule draft + saved schedule
└── notification draft + saved notification settings

Server state / TanStack
├── discovery cache config
└── discovery cache history per { providerId, limit }

Local cache-config form state
├── editable string draft
├── server baseline
├── validation
└── dirty state
```

The existing broad mock `DiscoverySettings` type will be split so state from one tab cannot accidentally be saved by another tab:

```ts
DiscoveryScheduleSettings
DiscoveryNotificationSettings
```

Retention is removed from the mock model entirely because it becomes real backend `DiscoveryCacheConfig.historyRetention` state.

---

## Shared-Component Strategy

### Reuse directly

- `PageHeader`
- `Tabs`
- `SettingsSectionCard`
- `Card`
- `Field`
- `Input`
- `Select`
- `Toggle`
- `Button`
- `Alert`
- `FetchErrorAlert`
- `DataTable`
- `DataTableRequestState`
- `SkeletonBlock`
- `Badge`
- `StateCell`
- `EmptyState`

### Shared component change

Extend the existing `SettingsSectionCard` with an optional compositional `footer?: ReactNode` slot. This is preferable to adding feature-specific save-footer markup repeatedly.

The new prop is optional and must preserve every existing caller unchanged.

### Intentionally not used

`DataTableToolbar`

- rejected for History because it always renders a search input and would imply/client-own filtering semantics.

`DataTablePagination`

- rejected because the backend has no page/offset/total-count contract.

`useTableState`

- rejected because History must not do client filtering, sorting, or pagination.

No new React component is required by the approved design.

---

## Error, Loading, and Permission Behavior

### Cache config GET

- Loading: shared skeleton blocks in the Cache configuration card.
- First-load error: `FetchErrorAlert` with Retry.
- Backend detail: only through the existing safe error helper.
- A 403 is rendered as the normal server-authoritative fetch error; do not invent a frontend permission matrix.
- The local Schedule card remains usable because it is a separate local domain.

### Cache config PUT

- Mutation error: shared `Alert variant="error"` inside the Cache configuration card.
- Resolve safe backend detail using the existing error helper.
- Keep the user draft intact for correction/retry.
- Do not update the baseline or query cache on failure.

### History GET

- Loading: `DataTable` loading rows or shared table skeleton pattern.
- Error: `DataTableRequestState` with Retry and safe backend detail.
- If TanStack still has successful cached rows during a failed refetch, show the compact error while preserving those rows (`hasCachedData`).
- Empty success: shared `EmptyState`.
- 403 is handled by the same server-authoritative error state.

### Provider filter

Do not fetch Providers for the filter. This prevents a legitimate `VIEW_DIAGNOSTICS` user from being blocked by an unrelated `VIEW_PROVIDERS` requirement.

---

## Dependency Graph

```text
Task 1 Shared SettingsSectionCard footer ─────┐
                                             ├──> Task 3 Local state split
Task 2 URL/tab + History query state ─────────┤
                                             │
Task 4 Cache draft/partial-patch helpers ─────┤
Task 5 Optional config-query activation ──────┤
                                             └──> Task 6 Configuration integration

Task 2 ─────────────────────────────────────────> Task 7 Server-backed History

Task 1 + Task 3 + Task 6 ──────────────────────> Task 8 Notifications tab

Tasks 6 + 7 + 8 ───────────────────────────────> Task 9 Localization

Tasks 1–9 ─────────────────────────────────────> Task 10 Integration verification
```

Safe parallelization:

- Tasks 1 and 2 can run in parallel.
- Task 4 can run independently of Tasks 1–3.
- Task 7 can begin after Task 2 while Configuration work proceeds.

Must remain sequential:

- Task 6 waits for Tasks 1, 2, 3, 4, and 5.
- Task 8 waits for the new page shell from Task 6.
- Localization waits until the visible contract from Tasks 6–8 is stable.

---

# Task List

## Phase 1 — Shared shell and navigation state

### Task 1 — Add a shared footer slot to `SettingsSectionCard`

**Description:** Extend the existing shared settings card so Schedule, Cache configuration, and Notifications can use the same accessible card shell with independent action/status footers. Do not create a second settings-card component.

**Acceptance criteria:**

- [ ] `SettingsSectionCard` accepts optional `footer?: ReactNode`.
- [ ] Footer renders after the body behind a `border-t` using existing semantic tokens.
- [ ] Existing callers without `footer` render exactly as before.
- [ ] Footer content remains consumer-owned; the shared card does not learn Discovery-specific concepts.

**Verification:**

- [ ] Focused `SettingsSectionCard.test.tsx` covers no-footer and footer cases.
- [ ] Keyboard/focus behavior is unchanged because footer buttons remain native consumer buttons.
- [ ] Focused ESLint and `git diff --check` pass.

**Dependencies:** None.

**Files likely touched:**

- `src/shared/components/settings/SettingsSectionCard.tsx`
- `src/shared/components/settings/SettingsSectionCard.test.tsx`

**Estimated scope:** Small (2 files).

---

### Task 2 — Add URL-backed Discovery Settings navigation and server criteria

**Description:** Add a feature hook that owns only top-level tab state and applied History request criteria. It must preserve unrelated query params, default to Configuration, validate known History limit choices, and keep the URL deep-linkable.

**Acceptance criteria:**

- [ ] Tabs are `configuration | history | notifications`; Configuration omits the `tab` param.
- [ ] `providerId` is trimmed; empty values remove the param.
- [ ] `limit` accepts only `25 | 50 | 100`, defaults to `50`, and default may be omitted from the URL.
- [ ] Changing tabs preserves applied History criteria so returning to History restores the same server query.
- [ ] No `page`, `search`, status, type, or client-filter state is introduced.

**Verification:**

- [ ] Memory-router tests cover default, valid deep link, invalid tab/limit fallback, provider apply/clear, and param preservation.
- [ ] Back/Forward-compatible state is derived only from `useSearchParams`.

**Dependencies:** None.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/hooks/useDiscoverySettingsSearchParams.ts`
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoverySettingsSearchParams.test.tsx`

**Estimated scope:** Small (2 files).

### Checkpoint A — Shared shell and URL contract

- [ ] Tasks 1–2 focused tests pass together.
- [ ] No production Discovery Settings page behavior has been switched to the backend yet.
- [ ] No new feature-local React component exists.

---

## Phase 2 — Separate local state from real cache state

### Task 3 — Split mock Schedule and Notifications state domains

**Description:** Remove History retention from the mock `DiscoverySettings` model and split the remaining frontend-only state into independent Schedule and Notification settings. Adapt the two existing cards to their narrower props and to the shared footer composition from Task 1.

**Acceptance criteria:**

- [ ] `DiscoveryScheduleSettings` contains only `scheduleEnabled`, `frequency`, `timezone`.
- [ ] `DiscoveryNotificationSettings` contains only `notificationsEnabled`, `recipientId`.
- [ ] Mock retention fields/constants are removed from the mock model/data.
- [ ] `DiscoveryScheduleCard` accepts only Schedule state and optional footer content.
- [ ] `DiscoveryNotificationsCard` accepts only Notification state, recipients, test action, and optional footer content.
- [ ] Existing schedule enable/disable and recipient preview behavior is preserved.

**Verification:**

- [ ] Typecheck proves neither card can receive/cache History retention fields.
- [ ] Existing interaction behavior remains covered by focused component/page tests as they are migrated.
- [ ] No backend request is introduced by either card.

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/model/discoverySettingsTypes.ts`
- `src/features/providers-connectors/discovery-settings/mocks/discoverySettingsMocks.ts`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryScheduleCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryNotificationsCard.tsx`

**Estimated scope:** Medium (4 files).

---

### Task 4 — Add cache-config draft, validation, and minimal-patch helpers

**Description:** Add feature-owned, non-React data helpers plus a small hook for editable cache config state. The server model stays numeric; the form draft uses strings so users can temporarily clear/edit number inputs without corrupting the canonical server model.

**Acceptance criteria:**

- [ ] Draft conversion preserves every `defaults` key returned by the backend, including unknown future keys.
- [ ] Validation accepts only positive whole numbers for all TTLs, `retentionDays`, and `maxRecords`.
- [ ] Known provider types can be ordered/presented consistently while unknown keys remain intact.
- [ ] Minimal patch generation includes only changed default entries and changed retention fields.
- [ ] No-change draft produces no mutation payload/action.
- [ ] Incoming query data synchronizes the draft only when the form is not dirty; unsaved edits are never silently overwritten by a refetch.
- [ ] Cancel restores the latest successful server baseline.
- [ ] Successful Save can adopt the returned config as the new baseline.

**Verification:**

- [ ] Pure helper tests cover known + unknown defaults, blank/zero/negative/decimal invalid values, unchanged state, one-default change, retention-only change, and mixed partial change.
- [ ] Hook tests cover initial seed, dirty protection from incoming query data, cancel, and adopt-success-result behavior.

**Dependencies:** None.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/helpers/discoveryCacheConfigDraft.ts`
- `src/features/providers-connectors/discovery-settings/helpers/discoveryCacheConfigDraft.test.ts`
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoveryCacheConfigDraft.ts`
- `src/features/providers-connectors/discovery-settings/hooks/useDiscoveryCacheConfigDraft.test.tsx`

**Estimated scope:** Medium (4 files).

---

### Task 5 — Make the existing config query optionally inactive off-tab

**Description:** Preserve the existing hook API by default while allowing the page to avoid a real cache-config GET when the user opens History or Notifications directly.

**Acceptance criteria:**

- [ ] `useDiscoveryCacheConfig()` still fetches by default for existing callers.
- [ ] An optional `enabled: false` path suppresses the request without changing query keys, stale policy, retry policy, or mutation behavior.
- [ ] No polling or new `staleTime`/`gcTime` is introduced.

**Verification:**

- [ ] Existing config hook test remains green.
- [ ] New test proves `enabled: false` makes no API call and enabling later performs the canonical GET.

**Dependencies:** None.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/hooks/useDiscoveryCacheConfig.ts`
- `src/features/providers-connectors/discovery-settings/hooks/discoveryCacheHooks.test.tsx`

**Estimated scope:** Small (2 files).

### Checkpoint B — State boundaries

- [ ] Mock Schedule/Notifications contain no retention/cache fields.
- [ ] Cache draft round-trips all backend keys without data loss.
- [ ] Minimal patch tests prove partial PUT semantics are respected.
- [ ] Hidden Configuration does not trigger an unnecessary config GET.

---

## Phase 3 — Implement the three Variant A tab views

### Task 6 — Build the page shell and real Configuration tab

**Description:** Redesign `DiscoverySettingsPage` around shared `PageHeader` + `Tabs` and implement the approved two-column Configuration layout. Reuse `DiscoveryScheduleCard` on the left and compose the real Cache configuration card directly from `SettingsSectionCard` + shared form/error/loading primitives on the right. Do not add `DiscoveryCacheConfigurationCard.tsx`.

**Acceptance criteria:**

- [ ] The page has exactly three top-level shared tabs and no nested tabs.
- [ ] Active tab comes from Task 2 URL state.
- [ ] Only the active tab panel is mounted/rendered.
- [ ] Configuration uses the Variant A two-column desktop layout and stacks responsively.
- [ ] Schedule has its own local Save/Cancel/status footer and is explicitly local-only.
- [ ] Cache config is loaded with `useDiscoveryCacheConfig({ enabled: tab === 'configuration' })`.
- [ ] Cache defaults render every backend key; known types use the existing `providerTypeLabel()` fallback behavior, unknown keys remain visible.
- [ ] TTL values are shown in backend units (seconds); retention uses days and max-record count.
- [ ] Cache Save is enabled only for a valid dirty draft and calls `useUpdateDiscoveryCacheConfig()` with Task 4's minimal patch.
- [ ] Cache and Schedule never share one Save handler or one success state.
- [ ] Cache mutation success adopts the returned config; no redundant GET and no inventory/history invalidation are added.
- [ ] Cache fetch error uses shared retry UI; mutation error uses shared `Alert` and safe backend error resolution.
- [ ] Cache Cancel restores latest successful server data.

**Verification:**

- [ ] Page test proves Schedule Save performs no cache mutation.
- [ ] Page test proves changing one TTL sends only that default in the patch.
- [ ] Page test proves retention-only change sends only changed retention fields.
- [ ] Page test covers config loading, GET error + Retry, PUT error preserving dirty draft, successful Save, and Cancel.
- [ ] Page test proves unknown backend default keys are rendered and preserved.

**Dependencies:** Tasks 1, 2, 3, 4, 5.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`

**Estimated scope:** Medium (2 files, behavior-rich but bounded by extracted hooks/helpers).

---

### Task 7 — Rewrite the existing History card as a server-backed History workspace

**Description:** Replace the old mock-retention implementation of the existing `DiscoveryHistoryCard` with the real History table. It owns the server query while it is mounted in the History tab, but receives the applied URL criteria/setters from the page/navigation hook. Use shared table and form primitives only.

**Acceptance criteria:**

- [ ] Provider filter is a free-text Provider ID input with explicit Apply and Clear actions.
- [ ] Pending typed text does not modify the currently displayed rows.
- [ ] Apply updates URL/server `providerId`; Clear removes it.
- [ ] Limit choices are `25`, `50`, `100`; changing limit updates the server query immediately.
- [ ] `useDiscoveryCacheHistory({ providerId, limit })` is the only source of rows.
- [ ] `rows` passed to `DataTable` are the returned `history.runs` in the backend-provided order.
- [ ] No client `filter`, `sort`, search, `useTableState`, or pagination is present.
- [ ] `DataTableToolbar` and `DataTablePagination` are not imported/used.
- [ ] Columns are Started, Provider, Provider type, Triggered by, Status, Duration, Records.
- [ ] Provider type uses existing friendly-label fallback behavior.
- [ ] Trigger/status presentation uses shared `Badge`/`StateCell` with localized text.
- [ ] `recordCount == null` renders an em dash.
- [ ] `startedAt` is formatted only as a string presentation; no timezone conversion/`Date` parsing.
- [ ] Raw `run.error` is never rendered.
- [ ] Loading, cached-refetch error, first-load error, empty success, and manual Refresh use shared request-state patterns.
- [ ] A failed query exposes safe backend detail only through the shared error helper.

**Verification:**

- [ ] Component test verifies initial `{ providerId: undefined, limit: 50 }` request.
- [ ] Apply/Clear tests verify new hook criteria/server query identity; loaded rows are not filtered locally while typing.
- [ ] Limit test verifies the hook receives the selected new limit.
- [ ] Row-order test proves response order is preserved.
- [ ] Test proves raw backend `error` text is absent from the DOM.
- [ ] Retry/Refresh test calls query `refetch()` and retains the same criteria.
- [ ] Empty and error-state tests use accessible shared states.

**Dependencies:** Task 2.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.test.tsx`
- `src/features/providers-connectors/discovery-settings/config/discoveryCacheHistoryColumns.tsx`

**Estimated scope:** Medium (3 files).

---

### Task 8 — Complete the Notifications tab with independent local persistence

**Description:** Render the existing Notifications component only in the Notifications top-level tab. Preserve recipient preview and Send test behavior, add an independent local Save/Cancel footer, and optionally compose the Variant A explanatory side card directly from the existing shared `Card`.

**Acceptance criteria:**

- [ ] Notifications is a top-level tab, not a nested Configuration section.
- [ ] Its state and saved baseline are independent from Schedule and Cache config.
- [ ] Notification Save/Cancel performs no backend request.
- [ ] UI clearly communicates local-only persistence while no backend notification contract exists.
- [ ] Send test remains a local accessible status action and does not mutate Cache config.
- [ ] No new notification-specific React component is created.

**Verification:**

- [ ] Page test proves notification edits survive only through the Notifications local Save and are restored by Cancel.
- [ ] Page test proves notification actions never call Cache config mutation/history hooks.
- [ ] Existing recipient email preview and disabled-state behavior remain green.

**Dependencies:** Tasks 1, 2, 3, 6.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`

**Estimated scope:** Small/Medium (2 files).

### Checkpoint C — Core Variant A flow

- [ ] Configuration, History, and Notifications switch through one shared top-level `Tabs` row.
- [ ] Configuration has independent local Schedule and real backend Cache save domains.
- [ ] History network criteria are server-owned only.
- [ ] Notifications remain local-only.
- [ ] No new feature-local React component exists.

---

## Phase 4 — Localization and integration hardening

### Task 9 — Replace obsolete copy and localize the new contract in EN/SK/CS

**Description:** Update the three locale files for the new tabs, Cache configuration, server History controls/table, statuses/triggers, validation, local-only notices, error/loading/empty states, and Variant A supporting copy. Remove old mock retention-preset keys once no production code references them.

**Acceptance criteria:**

- [ ] EN, SK, and CS expose equivalent keys for all new user-visible text.
- [ ] Top-level tab labels and aria labels are localized.
- [ ] Cache labels distinguish defaults, seconds, retention days, and maximum records.
- [ ] Validation copy states positive whole-number requirements without inventing backend min/max values.
- [ ] History trigger values `stale`, `forced`, `param_change` have localized presentation labels while the raw API enum remains unchanged.
- [ ] History Success/Failed, filters, Refresh, loading/error/empty copy are localized.
- [ ] Local-only Schedule/Notification messaging is explicit.
- [ ] Obsolete old mock retention presets are removed only after grep proves no caller remains.

**Verification:**

- [ ] All three JSON files parse.
- [ ] Grep shows no missing/obsolete Discovery Settings production keys.
- [ ] Focused page/history tests use translation mocks without hardcoded production strings.

**Dependencies:** Tasks 6, 7, 8.

**Files likely touched:**

- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium (3 files).

---

### Task 10 — Integration regression and browser/network verification

**Description:** Harden the page-level tests after all tab implementations are stable, then verify the real runtime layout and network behavior at representative widths. This task should not add new production abstractions merely to simplify tests.

**Acceptance criteria:**

- [ ] Default route opens Configuration; URL deep links open History/Notifications correctly.
- [ ] Tab switching preserves History `providerId`/`limit` URL criteria.
- [ ] Only active-tab remote queries run: no History request before History is mounted; no Cache config request when Configuration is disabled by deep-link state.
- [ ] Configuration Cache calls only the existing handwritten hook layer; no generated client import appears in UI code.
- [ ] History never requests `/get_providers`.
- [ ] History network requests contain only supported backend criteria (`provider_id`, `limit`).
- [ ] No client filter/search/pagination affects History rows.
- [ ] Cache PUT partial payload matches changed fields only.
- [ ] Cache Save does not trigger a History request or frontend inventory invalidation.
- [ ] Schedule and Notifications make no backend persistence requests.
- [ ] Keyboard navigation works for Tabs and all form/action controls.
- [ ] No page-level horizontal overflow at target widths.

**Verification:**

- [ ] Focused Vitest set passes (page, History, navigation, cache draft, cache API/query hooks, shared SettingsSectionCard).
- [ ] `npm run typecheck` passes.
- [ ] Focused ESLint for all changed/new TS/TSX files passes with `--max-warnings 0`.
- [ ] `npm run api:check` passes; generated Orval files have no manual diff.
- [ ] Locale JSON parse check passes.
- [ ] `npm run build` passes because a shared component and a routed multi-view page were changed.
- [ ] `git diff --check` passes.
- [ ] Browser verification at 320, 768, 1024, and 1440 px.
- [ ] Browser network inspection verifies History Apply/Clear/limit/Refresh requests and absence of `/get_providers` from the History flow.
- [ ] Review task-owned diff before commit; unrelated worktree files remain untouched.

**Dependencies:** Tasks 1–9.

**Files likely touched:**

- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.test.tsx`
- existing focused hook/API tests only if a regression assertion is genuinely missing

**Estimated scope:** Small/Medium (verification-oriented).

---

## Target Feature Structure

```text
src/features/providers-connectors/discovery-settings/
├── api/                                      # already exists; transport boundary unchanged
│   ├── discoveryCacheApi.ts
│   ├── discoveryCacheQueryKeys.ts
│   └── schemas/discoveryCacheSchema.ts
├── components/
│   ├── DiscoveryScheduleCard.tsx             # reuse/modify
│   ├── DiscoveryHistoryCard.tsx              # reuse; rewrite to real server History
│   └── DiscoveryNotificationsCard.tsx        # reuse/modify
├── config/
│   └── discoveryCacheHistoryColumns.tsx      # pure DataTable column factory, not a React component
├── helpers/
│   └── discoveryCacheConfigDraft.ts          # form conversion/validation/minimal patch
├── hooks/
│   ├── useDiscoveryCacheConfig.ts            # existing; optional enabled support
│   ├── useDiscoveryCacheHistory.ts           # existing; server filters unchanged
│   ├── useUpdateDiscoveryCacheConfig.ts      # existing; unchanged semantics
│   ├── useDiscoveryCacheConfigDraft.ts       # new feature hook, no UI
│   └── useDiscoverySettingsSearchParams.ts   # new feature hook, no UI
├── model/
│   ├── discoveryCacheTypes.ts                # existing real API-facing UI model
│   └── discoverySettingsTypes.ts             # local Schedule/Notifications only
├── mocks/
│   └── discoverySettingsMocks.ts             # local Schedule/Notifications only
└── pages/
    └── DiscoverySettingsPage.tsx
```

Shared change:

```text
src/shared/components/settings/
└── SettingsSectionCard.tsx                   # optional generic footer slot
```

There is intentionally **no** new feature-local React component in the target structure.

---

## Verification Matrix

| Behavior | Primary proof |
|---|---|
| Shared footer is backward compatible | `SettingsSectionCard.test.tsx` |
| Tab/deep-link state | `useDiscoverySettingsSearchParams.test.tsx` |
| Mock vs backend state isolation | Typecheck + page tests |
| Unknown cache keys preserved | cache draft helper tests + page test |
| Positive integers only | cache draft/helper tests + existing API schema tests |
| Minimal partial PUT | helper tests + page mutation assertion |
| No redundant config GET after PUT | existing mutation hook regression |
| History server provider filter | History component hook/request assertion + browser network |
| History server limit | History component test + browser network |
| No client filtering/sorting/pagination | code boundary + row-order/typing tests |
| No `/get_providers` dependency | imports/network assertion |
| No raw History error display | History component test |
| No timezone invention | presentation helper/row assertion; no `Date` parsing |
| 403/fetch errors | shared request-state component assertions |
| Mutation error keeps draft | page test |
| Schedule local-only | page test: no mutation/API request |
| Notifications local-only | page test: no mutation/API request |
| Responsive Variant A | browser widths 320/768/1024/1440 |
| Generated client untouched | `npm run api:check` + diff inspection |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| History silently becomes client-filtered through a familiar table helper | High | Explicitly ban `DataTableToolbar`, `useTableState`, `DataTablePagination`, `runs.filter`, and client sort for this view |
| Provider dropdown introduces an unauthorized `/get_providers` dependency | High | Provider ID input + backend `provider_id` only; browser network assertion verifies no provider-list request |
| One Save implies mock + backend atomic persistence | High | Separate card-level Schedule and Cache footers/actions/status; Notifications has its own tab-local footer |
| Cache Save overwrites unrelated concurrent defaults | High | Generate minimal partial patch from draft vs baseline |
| Unknown future backend default keys disappear | High | Render and preserve all `Record<string, number>` entries; friendly labels are presentation-only |
| Background config refetch overwrites user edits | High | Draft hook syncs server data only while clean; dirty draft remains user-owned |
| Backend History technical error leaks to user | High | Omit raw `error` column/content; use generic status and safe request-error helper only |
| UI invents timezone conversion for `started_at` | Medium | Treat value as plain contract string; no `Date` construction |
| History appears paginated although backend only has limit | Medium | No shared pagination component; limit is clearly “Latest runs” server criterion |
| Config Save appears to create a History run | Medium | Do not invalidate/refetch History on PUT; explanatory copy notes fetch history records actual discovery fetches |
| Shared card change regresses other screens | Medium | Optional footer with unchanged default output + focused shared test + production build |
| Hidden tabs make unnecessary API requests | Medium | Optional config query `enabled`; History query lives only in mounted History component |
| Old mock retention survives alongside real retention | Medium | Remove retention from mock model/data and delete obsolete locale keys after grep |
| Responsive two-column layout overflows | Medium | Stack below desktop; verify four standard widths and horizontal table scroll |

---

## Out of Scope

- Backend changes.
- OpenAPI changes.
- Generated Orval edits/regeneration unless `api:check` proves the checked-in contract unexpectedly changed.
- Backend Schedule persistence; no such contract currently exists.
- Backend Notification persistence/test delivery; no such contract currently exists.
- Changing provider RBAC to allow a History provider dropdown.
- Adding History filters for status, provider type, trigger, dates, or text search; backend does not expose them.
- Client-side History filtering/search/sort/pagination.
- Automatic History polling.
- Showing raw History `error` content.
- Changing `cacheRefreshSeconds` provider override UX; it remains on the concrete Provider edit flow.
- Refreshing inventory immediately after Cache config Save.
- Resources/Resources ISE force-refresh implementation.
- Linking Discovery Cache configuration to the special BACKEND platform provider.
- Adding a fourth Discovery Settings tab.
- Nested tabs.

---

## Open Questions

None required to start implementation.

The Provider History filter intentionally uses Provider ID text + Apply/Clear because the verified backend RBAC permits diagnostic users who may not have `VIEW_PROVIDERS`. A dropdown is a future backend-contract/RBAC decision, not an unresolved frontend question.

---

## Definition of Ready

Before implementation begins:

- [ ] Human reviewer approves Variant A architecture and the Provider ID server-filter decision.
- [ ] Human reviewer accepts the explicit split between local Schedule/Notifications and real Cache/History persistence.
- [ ] Tasks are executed in dependency order with the checkpoints above.
- [ ] Implementation stays scoped to the files/behaviors identified here unless new repository evidence requires a plan update first.
