# Implementation Plan: Recovery Actions UI — Variant A

## Overview

Add a new top-level **Recovery Actions** workspace beside **Recovery Plans**.
The workspace is UI-only and uses deterministic mock data; it does not add API
endpoints, React Query hooks, persistence, or backend mutations.

The selected design is Variant A: a bordered **Recovery workspace** card with a
horizontal row of four rich action tabs:

```text
Recovery workspace
Operational controls and test evidence

Validate | Execute | Schedule | History
```

Each action tab has an icon, label, short description, and optional status.
Unlike inventory tabs, the selected item uses a filled action-card treatment
instead of an underline attached to a table.

## Scope

### In scope

- A new top-level App Sidebar item named **Recovery Actions**, positioned beside
  **Recovery Plans**.
- Canonical URL-backed sections:
  - `/recovery-actions/validate`
  - `/recovery-actions/execute`
  - `/recovery-actions/schedule`
  - `/recovery-actions/history`
- A reusable shared `WorkspaceTabs` component implementing Variant A.
- UI-only Validate, Execute, Schedule, and History pages.
- Deterministic typed mock data and local component state.
- English, Slovak, and Czech translations.
- Responsive and keyboard-accessible behavior.
- A compatibility redirect from the old Recovery Runs placeholder route to
  Recovery Actions History.

### Out of scope

- Backend endpoints, API schemas, React Query hooks, mutations, polling, or
  persistence.
- Starting a real recovery or recovery test.
- Resolving real point-in-time VM configurations or snapshots.
- Sending email notifications.
- Provider-specific execution adapters.
- Changes to Recovery Groups, Recovery Applications, Recovery Policies, or
  Policy Sets contracts.

## Architecture Decisions

### Navigation hierarchy

- `Recovery Actions` is a top-level sibling of `Recovery Plans`, not one of
  its children.
- `Recovery Actions` navigates directly to
  `/recovery-actions/validate`.
- Validate, Execute, Schedule, and History are route-backed tabs inside one
  workspace shell.
- The existing `/recovery-plans/recovery-runs` placeholder becomes a legacy
  redirect to `/recovery-actions/history`; its sidebar child is removed to
  avoid two competing history destinations.

### Shared tab component

- Add `src/shared/components/tabs/WorkspaceTabs.tsx` rather than adding a
  visual variant to the existing table-oriented `Tabs` component.
- `WorkspaceTabs<T>` is controlled and generic. Each item exposes:
  `value`, `label`, `description`, optional `icon`, optional `meta`,
  and optional `disabled`.
- The component owns only interaction, accessibility, responsive layout, and
  shared styling. It does not know about Recovery Actions or React Router.
- It uses `role="tablist"`, `role="tab"`, `aria-selected`, roving
  `tabIndex`, and Left/Right/Home/End keyboard navigation.
- Desktop uses four equal action cards. Narrow screens use a two-column layout,
  then a horizontally scrollable fallback only when content cannot fit.
- Existing `Tabs` stays unchanged for inventory and policy tables.

### Feature boundaries

```text
src/features/recovery-actions/
├── components/
│   ├── RecoveryActionsPageShell.tsx
│   └── RecoveryPointSummary.tsx
├── execute/
│   ├── components/
│   └── pages/
├── history/
│   ├── components/
│   └── pages/
├── mocks/
│   └── recoveryActionsMocks.ts
├── model/
│   ├── recoveryActionNavigation.ts
│   └── recoveryActionTypes.ts
├── schedule/
│   ├── components/
│   └── pages/
└── validate/
    ├── components/
    └── pages/
```

- Cross-section models and mock records live at the feature root.
- Components reused by Validate and Execute stay in
  `recovery-actions/components`.
- Components used by only one section remain within that section.
- Reuse existing shared `PageHeader`, `Card`, `FilterTabs`,
  `SettingsSectionCard`, `Toggle`, form controls, `Badge`, `DataTable`,
  and confirmation/modal components.
- Do not move a component to global `shared` unless it is genuinely
  domain-independent. The only new global shared component required by this
  scope is `WorkspaceTabs`.

### UI-only state

- Mock application groups, recovery points, validation checks, schedules,
  recipients, and history rows are stored in one typed mock module.
- Forms use local React state and reset on refresh.
- No `localStorage` is added.
- Execute may show a confirmation and deterministic mock queued/running state,
  but the UI must not call a network client or claim that a real recovery ran.
- Schedule changes remain in memory and clearly behave as a frontend prototype.

### Recovery semantics

- **Validate** performs a read-only readiness/preflight check. It does not
  restore resources.
- **Execute** previews the resolved VM configuration and snapshot timestamps
  before allowing a mock recovery test confirmation.
- **Schedule** configures recurring recovery tests and one selected failure
  notification recipient, following the existing Discovery Settings pattern.
- **History** lists manual and automated recovery tests for a selected period.

## Dependency Graph

```text
WorkspaceTabs
    │
    ├── Recovery action navigation model
    │       │
    │       └── RecoveryActionsPageShell
    │               │
    │               ├── Validate UI
    │               ├── Execute UI
    │               ├── Schedule UI
    │               └── History UI
    │
    └── App routes + sidebar + translations
```

## Tasks

### Task 1: Build the shared WorkspaceTabs component

**Description:** Add the reusable action-card tab component represented by
Variant A without changing the existing `Tabs` API or styling.

**Acceptance criteria:**

- [ ] Generic items support label, description, icon, meta, and disabled state.
- [ ] Mouse and Left/Right/Home/End keyboard navigation call the controlled
  `onChange` callback and move focus correctly.
- [ ] Selected, disabled, focus, hover, and responsive states use existing
  semantic Tailwind tokens.
- [ ] The component contains no Recovery Actions imports, labels, or routing.

**Verification:**

- [ ] `npx vitest run src/shared/components/tabs/WorkspaceTabs.test.tsx`
- [ ] Keyboard and ARIA assertions cover selection and focus movement.
- [ ] Manual check at 320 px, 768 px, 1024 px, and 1440 px.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/tabs/WorkspaceTabs.tsx`
- `src/shared/components/tabs/WorkspaceTabs.test.tsx`

**Estimated scope:** Small

### Task 2: Define Recovery Actions navigation, models, and mock data

**Description:** Create provider-neutral UI contracts for application groups,
recovery points, validation results, schedules, recipients, and history runs.
Define the canonical tab order and path mapping.

**Acceptance criteria:**

- [ ] The canonical tab order is Validate, Execute, Schedule, History.
- [ ] Every mock record has a stable ID and explicit ISO timestamp.
- [ ] Manual and automated history records are represented by one shared type.
- [ ] No API client, query key, or persistence utility is introduced.

**Verification:**

- [ ] Navigation mapping tests cover every canonical path and the default tab.
- [ ] Model tests confirm deterministic recovery-point selection examples.
- [ ] `npm run typecheck`.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-actions/model/recoveryActionNavigation.ts`
- `src/features/recovery-actions/model/recoveryActionNavigation.test.ts`
- `src/features/recovery-actions/model/recoveryActionTypes.ts`
- `src/features/recovery-actions/mocks/recoveryActionsMocks.ts`

**Estimated scope:** Medium

### Task 3: Build the Recovery Actions shell and Validate slice

**Description:** Create the common page header and Recovery workspace card,
wire `WorkspaceTabs` to route changes, and deliver the complete Validate UI
with its two modes.

**Acceptance criteria:**

- [ ] The shell renders the workspace title, description, provider status, and
  four Variant A action tabs.
- [ ] Latest automated mode reports timestamp, recovery point, resource counts,
  duration, overall state, and detailed issues.
- [ ] Manual mode accepts application group and validation date/time and shows
  deterministic VM configuration, dependency, snapshot, and provider checks.
- [ ] Validation remains read-only and performs no network request.

**Verification:**

- [ ] Focused shell and Validate component/page tests pass.
- [ ] Switching Validate modes is keyboard accessible.
- [ ] Manual date changes update the displayed mock recovery point.

**Dependencies:** Tasks 1–2

**Files likely touched:**

- `src/features/recovery-actions/components/RecoveryActionsPageShell.tsx`
- `src/features/recovery-actions/components/RecoveryActionsPageShell.test.tsx`
- `src/features/recovery-actions/components/RecoveryPointSummary.tsx`
- `src/features/recovery-actions/validate/components/RecoveryValidationPanel.tsx`
- `src/features/recovery-actions/validate/pages/RecoveryValidationPage.tsx`

**Estimated scope:** Medium

### Checkpoint 1: Shared navigation and Validate

- [ ] `WorkspaceTabs` is independent of Recovery Actions.
- [ ] Existing inventory and recovery-policy `Tabs` tests remain unchanged and
  pass.
- [ ] Validate works with mock data at all supported responsive breakpoints.
- [ ] Lint and typecheck pass.

### Task 4: Build the Execute recovery-test slice

**Description:** Add a UI-only manual recovery-test flow that resolves and
displays the exact mock configuration and snapshot timestamps before
confirmation.

**Acceptance criteria:**

- [ ] Users select application group, requested recovery time, and test target.
- [ ] A preview displays the resolved VM configuration time, snapshot time,
  resources, gaps, and target environment before execution is enabled.
- [ ] Confirmation explicitly says this is an isolated recovery test.
- [ ] Confirming changes only local mock state and performs no network request.

**Verification:**

- [ ] Focused Execute page/component tests pass.
- [ ] Execute remains disabled until all required fields and preview data exist.
- [ ] Confirmation dialog is keyboard accessible and restores focus on close.

**Dependencies:** Tasks 2–3

**Files likely touched:**

- `src/features/recovery-actions/execute/components/RecoveryRequestForm.tsx`
- `src/features/recovery-actions/execute/components/RecoveryPointPreview.tsx`
- `src/features/recovery-actions/execute/pages/RecoveryExecutePage.tsx`
- `src/features/recovery-actions/execute/pages/RecoveryExecutePage.test.tsx`

**Estimated scope:** Medium

### Task 5: Build the Schedule slice with failure notifications

**Description:** Add UI-only recurring recovery-test settings using established
Discovery Settings patterns.

**Acceptance criteria:**

- [ ] Schedule enablement, application group, recurrence, day/time, timezone,
  and test environment are editable in local state.
- [ ] The next scheduled test timestamp updates from the selected mock cadence.
- [ ] Failure notifications are configured in a dedicated card within Schedule.
- [ ] One mock user recipient can be selected and previewed with name and email.

**Verification:**

- [ ] Focused Schedule tests cover enabled/disabled state and next-run preview.
- [ ] Notification controls disable when notifications are off.
- [ ] Labels, switches, and recipient controls are keyboard accessible.

**Dependencies:** Tasks 2–3

**Files likely touched:**

- `src/features/recovery-actions/schedule/components/RecoveryTestScheduleCard.tsx`
- `src/features/recovery-actions/schedule/components/RecoveryFailureNotificationsCard.tsx`
- `src/features/recovery-actions/schedule/pages/RecoverySchedulePage.tsx`
- `src/features/recovery-actions/schedule/pages/RecoverySchedulePage.test.tsx`

**Estimated scope:** Medium

### Task 6: Build the History slice

**Description:** Add a responsive history view for manual and automated
recovery tests over a selected period.

**Acceptance criteria:**

- [ ] Filters cover date range, trigger type, status, and application group.
- [ ] The table shows start time, trigger, application group, recovery point,
  duration, status, failed checks, and notification state.
- [ ] Selecting a row opens an accessible detail drawer with its mock report.
- [ ] Empty filtered results render a meaningful empty state.

**Verification:**

- [ ] Focused History tests cover filters, empty state, and row details.
- [ ] Existing shared DataTable pagination and keyboard behavior are preserved.
- [ ] The table remains usable at supported breakpoints.

**Dependencies:** Tasks 2–3

**Files likely touched:**

- `src/features/recovery-actions/history/components/RecoveryHistoryFilters.tsx`
- `src/features/recovery-actions/history/components/RecoveryHistoryTable.tsx`
- `src/features/recovery-actions/history/pages/RecoveryHistoryPage.tsx`
- `src/features/recovery-actions/history/pages/RecoveryHistoryPage.test.tsx`

**Estimated scope:** Medium

### Checkpoint 2: Four UI slices

- [ ] Validate, Execute, Schedule, and History render inside the same shell.
- [ ] Switching sections preserves canonical URL state.
- [ ] All actions remain local UI demonstrations with no network requests.
- [ ] Focused feature tests, lint, and typecheck pass.

### Task 7: Add canonical routes and legacy Recovery Runs redirect

**Description:** Register the new top-level nested routes and preserve the old
Recovery Runs URL as a redirect to History.

**Acceptance criteria:**

- [ ] `/recovery-actions` redirects to `/recovery-actions/validate`.
- [ ] All four section routes lazy-load their pages.
- [ ] Unknown Recovery Actions children redirect to Validate.
- [ ] `/recovery-plans/recovery-runs` redirects to
  `/recovery-actions/history`.

**Verification:**

- [ ] Router tests cover canonical routes, index redirect, fallback, and legacy
  redirect.
- [ ] Direct browser navigation and refresh work on every canonical URL.

**Dependencies:** Tasks 3–6

**Files likely touched:**

- `src/app/routes.ts`
- `src/app/AppRoutes.tsx`
- `src/app/router.test.tsx`

**Estimated scope:** Medium

### Task 8: Integrate App Sidebar and translations

**Description:** Add Recovery Actions beside Recovery Plans, remove the
duplicate Recovery Runs child, and translate all new UI content.

**Acceptance criteria:**

- [ ] Recovery Actions is a top-level sibling of Recovery Plans.
- [ ] It is active for all `/recovery-actions/*` routes.
- [ ] Recovery Runs is absent from the Recovery Plans submenu.
- [ ] English, Slovak, and Czech contain complete navigation, tab, form, status,
  empty-state, confirmation, and accessibility labels.

**Verification:**

- [ ] App Sidebar tests cover position, active state, and removed duplicate.
- [ ] Language-switching tests show translated Recovery Actions content.
- [ ] No hard-coded user-facing text remains in the feature.

**Dependencies:** Task 7

**Files likely touched:**

- `src/layouts/app-shell/AppSidebar.tsx`
- `src/layouts/app-shell/AppSidebar.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium

### Checkpoint 3: Integrated navigation

- [ ] Recovery Actions and Recovery Plans are visually equal top-level items.
- [ ] Variant A tabs are visually distinct from table/inventory tabs.
- [ ] Legacy Recovery Runs links land on History.
- [ ] Route, sidebar, and translation tests pass.

### Task 9: Accessibility, responsive, and regression verification

**Description:** Complete the quality pass without expanding backend scope.

**Acceptance criteria:**

- [ ] All interactive elements are reachable and usable by keyboard.
- [ ] Focus indicators, selected states, warnings, and failures do not rely on
  color alone.
- [ ] The workspace fits at 1024 px and 1440 px without page-level horizontal
  scrolling; 320 px and 768 px use the documented responsive tab layout.
- [ ] Existing Recovery Plans, Discovery Settings, and shared Tabs behavior
  remain unchanged.

**Verification:**

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] Focused Vitest suites for WorkspaceTabs, Recovery Actions, routing,
  sidebar, and translations.
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Manual browser check in light and dark themes at 320, 768, 1024, and
  1440 px.
- [ ] Browser console contains no errors or accessibility warnings.

**Dependencies:** Tasks 1–8

**Files likely touched:** Tests only if verification finds a missing regression.

**Estimated scope:** Small

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| New navigation looks like inventory tabs | High | Keep `WorkspaceTabs` separate from `Tabs`; use filled action cards with icons, descriptions, and meta status. |
| Recovery Actions and Recovery Runs duplicate each other | High | Remove the Recovery Runs sidebar child and redirect its legacy URL to History. |
| Mock actions are mistaken for backend operations | High | Keep all state local, add no API client, and make confirmation language explicitly describe a recovery test preview. |
| Shared component becomes Recovery-specific | Medium | Use generic item descriptors and keep route mapping/status semantics inside the feature. |
| Four cards overflow narrow layouts | Medium | Use responsive two-column layout and a last-resort horizontal scroll behavior with visible focus. |
| Recovery point timestamps are ambiguous | Medium | Store ISO timestamps and display timezone next to every resolved point-in-time value. |
| Existing dirty Recovery Policies work is overwritten | High | Restrict implementation and staging to Recovery Actions, shared WorkspaceTabs, app integration, translations, tests, and these plan files. |
| Full test suite is slow | Medium | Run focused suites at every checkpoint, then one complete suite before completion. |

## Definition of Done

- Recovery Actions is a separate top-level navigation area.
- Variant A horizontal action-card tabs are implemented once as a reusable
  shared component.
- Validate, Execute, Schedule, and History are complete UI-only sections backed
  by deterministic mock data.
- The old Recovery Runs placeholder redirects to History.
- All user-facing text is translated into EN, SK, and CS.
- Accessibility, responsive checks, focused tests, lint, typecheck, full tests,
  and production build pass.
- No backend contract or unrelated Recovery Plans implementation is changed.

## Open Questions

None required for the UI-only implementation. Backend contracts, provider
adapter behavior, recovery-point resolution rules, and real notification
delivery remain deferred.
