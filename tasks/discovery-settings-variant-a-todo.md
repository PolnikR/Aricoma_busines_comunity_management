# Todo: Discovery Settings — Variant A

## Global constraints

- [ ] Use exactly three top-level tabs: Configuration / History / Notifications.
- [ ] Do not add nested tabs.
- [ ] Reuse shared UI primitives; do not create a new feature-local React component.
- [ ] If a genuinely missing reusable React primitive is discovered, add it under `src/shared/components/...` with a focused test before using it.
- [ ] Keep Schedule and Notifications frontend-only/local.
- [ ] Keep Cache config and History backend-backed.
- [ ] Never combine mock Schedule/Notifications persistence with Cache PUT as one transaction.
- [ ] Do not edit generated Orval files manually.
- [ ] Do not change backend/OpenAPI in this task.

## Phase 1 — Shared shell and navigation

### Task 1 — Shared settings footer

- [ ] Add optional `footer?: ReactNode` to shared `SettingsSectionCard`.
- [ ] Render footer behind a semantic border after body content.
- [ ] Preserve output for callers without a footer.
- [ ] Extend `SettingsSectionCard.test.tsx`.
- [ ] Run focused test/lint/diff check.

### Task 2 — URL-backed tabs and History server criteria

- [ ] Add `useDiscoverySettingsSearchParams.ts`.
- [ ] Support only `configuration | history | notifications`.
- [ ] Default Configuration omits `tab`.
- [ ] Preserve History `providerId` and `limit` across tab switching.
- [ ] Trim/remove empty provider IDs.
- [ ] Support UI limits `25 | 50 | 100`, default `50`.
- [ ] Do not add page/search/status/type filters.
- [ ] Add MemoryRouter tests for valid/invalid/deep-link states.

### Checkpoint A

- [ ] Tasks 1–2 tests pass together.
- [ ] No new feature-local React component exists.
- [ ] Production page is not yet partially wired to real backend state.

## Phase 2 — Separate local and backend state

### Task 3 — Split mock settings domains

- [ ] Create/narrow `DiscoveryScheduleSettings`.
- [ ] Create/narrow `DiscoveryNotificationSettings`.
- [ ] Remove `retention`, `customRetentionDays`, `DiscoveryRetention`, and mock retention options from local mock domain.
- [ ] Split default mock Schedule and Notification snapshots.
- [ ] Adapt existing `DiscoveryScheduleCard` to Schedule-only props + optional footer.
- [ ] Adapt existing `DiscoveryNotificationsCard` to Notification-only props + optional footer.
- [ ] Preserve schedule enable/disable behavior.
- [ ] Preserve selected-recipient preview and Send test behavior.

### Task 4 — Cache config draft and partial patch

- [ ] Add `discoveryCacheConfigDraft.ts` helper.
- [ ] Draft uses strings while canonical server config stays numeric.
- [ ] Preserve all backend `defaults` keys, including unknown future keys.
- [ ] Validate positive whole numbers only.
- [ ] Build minimal partial patch from draft vs baseline.
- [ ] Include only changed default entries.
- [ ] Include only changed retention fields.
- [ ] Return no mutation work for unchanged state.
- [ ] Add `useDiscoveryCacheConfigDraft.ts`.
- [ ] Do not overwrite a dirty draft on incoming query/refetch data.
- [ ] Cancel resets to latest successful server baseline.
- [ ] Successful mutation response can become the new baseline.
- [ ] Add focused helper/hook tests.

### Task 5 — Disable config GET when Configuration is inactive

- [ ] Extend existing `useDiscoveryCacheConfig` with optional enabled behavior while keeping default behavior unchanged.
- [ ] Do not change query key, retry, staleTime, gcTime, or polling semantics.
- [ ] Test `enabled: false` makes no API request.
- [ ] Test enabling later performs the canonical GET.

### Checkpoint B

- [ ] Mock types contain no real Cache/History state.
- [ ] Unknown backend cache keys round-trip through draft/patch helpers.
- [ ] Invalid/decimal/non-positive cache form values cannot be saved.
- [ ] Minimal-patch tests pass.
- [ ] Hidden Configuration does not fetch cache config.

## Phase 3 — Variant A tabs

### Task 6 — Page shell + Configuration

- [ ] Replace current three-card simultaneous layout with shared top-level `Tabs`.
- [ ] Only active tab panel is mounted.
- [ ] Configuration renders existing Schedule card + inline shared Cache settings card.
- [ ] Use Variant A two-column desktop layout; stack responsively.
- [ ] Do not create `DiscoveryCacheConfigurationCard` or another new feature React component.
- [ ] Schedule gets independent local Save/Cancel/status.
- [ ] Clearly mark Schedule persistence as local-only.
- [ ] Cache query runs only on active Configuration.
- [ ] Render every backend cache-default key.
- [ ] Use friendly known provider-type label and raw fallback for unknown key.
- [ ] Keep TTL units in seconds.
- [ ] Render backend `retentionDays` + `maxRecords`.
- [ ] Use shared skeletons for loading.
- [ ] Use shared fetch error + Retry for config GET failure.
- [ ] Use shared error Alert for config PUT failure.
- [ ] Use safe backend error resolver only.
- [ ] Cache Save disabled unless valid + dirty.
- [ ] Cache Save sends Task 4 minimal patch through existing mutation hook.
- [ ] Cache mutation success adopts returned config without redundant GET.
- [ ] Cache Save does not invalidate History or inventory queries.
- [ ] Cache Cancel restores latest server baseline.
- [ ] Page tests cover local Schedule vs backend Cache persistence separation.

### Task 7 — Real server-backed History

- [ ] Rewrite existing `DiscoveryHistoryCard`; remove old mock-retention UI.
- [ ] Provider filter is a shared `Select` populated from existing `useProviders('all')`.
- [ ] Use Infrastructure Providers only (`VMWARE`, `FLASHCOPY`, `IBM_POWER`) from the existing provider model/API.
- [ ] Add `All infrastructure providers` as the first option.
- [ ] Use provider name/type as the visible label and provider `id` as the option value.
- [ ] Selecting a provider immediately sets backend `provider_id`; selecting All removes it.
- [ ] Do not use provider-list data to filter History rows locally.
- [ ] Provider-list loading/error must not replace successful History data.
- [ ] Preserve a deep-linked `providerId` even if it is temporarily absent from the provider list.
- [ ] Limit choices: 25 / 50 / 100.
- [ ] Use `useDiscoveryCacheHistory({ providerId, limit })`.
- [ ] Pass `history.runs` directly to shared `DataTable`.
- [ ] Preserve backend row order exactly.
- [ ] No `runs.filter()`.
- [ ] No client sort.
- [ ] No client search.
- [ ] No `useTableState`.
- [ ] No `DataTableToolbar`.
- [ ] No `DataTablePagination`.
- [ ] Columns: Started / Provider / Provider type / Triggered by / Status / Duration / Records.
- [ ] Use shared badges/state presentation.
- [ ] Render null records as em dash.
- [ ] Do not parse `startedAt` into `Date`; do not invent timezone conversion.
- [ ] Never render raw `run.error`.
- [ ] Use shared loading/error/cached-error/empty states.
- [ ] Refresh calls query `refetch()` with same criteria.
- [ ] Component tests prove provider selection/All/limit become server query criteria.
- [ ] Test provider selection never filters already returned History rows on the client.
- [ ] Test response order is unchanged.
- [ ] Test raw error is absent from DOM.

### Task 8 — Notifications top-level tab

- [ ] Render existing Notifications card only in Notifications tab.
- [ ] Keep Notification draft/saved state independent from Schedule/Cache.
- [ ] Add local Save/Cancel/status footer.
- [ ] Clearly mark persistence as local-only.
- [ ] Preserve recipient preview.
- [ ] Preserve Send test local status behavior.
- [ ] Ensure Notifications never call Cache config/history hooks.
- [ ] Compose optional Variant A explanation from existing shared `Card`; no new React component.
- [ ] Add page tests for notification Save/Cancel and no backend calls.

### Checkpoint C

- [ ] Three top-level tabs work through one shared Tabs row.
- [ ] Configuration has separate local Schedule and real Cache persistence.
- [ ] History is server-filtered only.
- [ ] Notifications are local-only.
- [ ] No feature-local React component was added.

## Phase 4 — Localization and final integration

### Task 9 — EN/SK/CS copy

- [ ] Add localized tab labels/aria label.
- [ ] Update page description for Configuration / History / Notifications model.
- [ ] Add Cache config/default/retention/validation labels.
- [ ] Add History Provider / All infrastructure providers / Latest runs / Refresh labels.
- [ ] Add History column labels.
- [ ] Add localized stale / forced / param change labels.
- [ ] Add localized Success / Failed labels.
- [ ] Add History loading/error/empty/retry copy.
- [ ] Add local-only Schedule/Notification copy.
- [ ] Add Cache fetch/save success/error/status copy.
- [ ] Remove obsolete mock retention preset keys only after grep proves no use.
- [ ] Parse EN/SK/CS JSON files.

### Task 10 — Integration and browser/network verification

- [ ] Default route opens Configuration.
- [ ] Deep link `?tab=history` opens History.
- [ ] Deep link `?tab=notifications` opens Notifications.
- [ ] History Provider/limit criteria survive switching away and back.
- [ ] No History request runs before History is mounted.
- [ ] No Cache config GET runs when opening a non-Configuration deep link.
- [ ] UI imports handwritten hooks only, never generated Orval operations.
- [ ] History loads the existing infrastructure provider list for the dropdown through `useProviders('all')`.
- [ ] History requests contain only supported backend `provider_id` and `limit` criteria.
- [ ] Cache PUT payload contains changed fields only.
- [ ] Cache Save triggers no History request and no FE inventory invalidation.
- [ ] Schedule/Notifications trigger no backend persistence request.
- [ ] Tab keyboard navigation works.
- [ ] All inputs/actions have accessible labels/focus behavior.
- [ ] Verify 320 px layout.
- [ ] Verify 768 px layout.
- [ ] Verify 1024 px layout.
- [ ] Verify 1440 px layout.
- [ ] Verify History table horizontal behavior without page overflow.

## Final verification commands/checks

- [ ] Focused Vitest set: shared settings card, navigation hook, cache draft/helper hook, discovery-cache API/query hooks, Discovery Settings page, History component.
- [ ] `npm run typecheck`.
- [ ] Focused ESLint for changed/new TS/TSX with `--max-warnings 0`.
- [ ] Parse all modified locale JSON files.
- [ ] `npm run api:check`.
- [ ] Confirm generated Orval files have no manual diff.
- [ ] `npm run build`.
- [ ] `git diff --check`.
- [ ] Inspect task-owned diff and preserve unrelated worktree state.
- [ ] Create atomic task-scoped commits only after each implementation task's focused verification passes.

## Explicitly out of scope

- [ ] No backend implementation/change.
- [ ] No OpenAPI change.
- [ ] No generated-client manual edit.
- [ ] No backend Schedule API invention.
- [ ] No backend Notification API invention.
- [ ] No provider-RBAC/JWT change; revalidate permissions later when real JWT authentication is implemented.
- [ ] No History status/type/date/text filters.
- [ ] No client History filtering/search/sort/pagination.
- [ ] No History polling.
- [ ] No raw History error display.
- [ ] No provider-specific `cacheRefreshSeconds` redesign.
- [ ] No immediate inventory refresh after Cache config Save.
- [ ] No Resources force-refresh implementation.
- [ ] No BACKEND-platform-provider linkage.
- [ ] No fourth tab.
- [ ] No nested tabs.
