# Implementation Plan: Recovery Actions Tabs Redesign — Variant A

## Overview

Redesign the existing Recovery Actions `WorkspaceTabs` using the approved
**Variant A: Operational status tabs**. The four-column navigation layout and
all current route, click, and keyboard behavior remain unchanged. The redesign
changes the composition of each tab from a standalone mini-card into a compact
operational navigation item containing:

1. a line icon and primary label,
2. a concise status badge based on existing recovery mock data,
3. one useful contextual detail instead of a generic feature description.

This remains a UI-only change. It must not add API calls, persistence, polling,
or backend contracts.

## Approved Visual Contract

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ✓ Validate       ▷ Execute       ◷ Schedule       ≋ History         │
│   1 issue          Ready            Weekly           4 runs          │
│   Last check       3 groups          Sun · 22:00      30-day window   │
└─────────────────────────────────────────────────────────────────────┘
```

- The tab list has one shared surface; tabs are not individually outlined
  cards.
- Adjacent tabs use subtle vertical separators.
- Icons are unboxed line icons aligned with the primary label.
- The active tab uses a three-pixel top accent marker and a very subtle
  surface tint. It must not use a bottom underline that visually merges with
  the content divider.
- Status badges communicate actual UI state and use semantic tones; color is
  accompanied by text.
- The contextual line contains a value derived from the current feature mocks,
  not generic copy such as “Check recovery readiness”.
- Desktop keeps four equal columns. Tablet uses two columns and mobile uses one
  column without horizontal page scrolling.
- Existing ARIA roles, roving `tabIndex`, disabled handling, and
  Arrow/Home/End navigation remain intact.

## Scope

### In scope

- Restyle the shared `WorkspaceTabs` composition and selected state.
- Reuse the existing `meta: ReactNode` slot for the semantic status badge.
- Reuse `description` as the operational detail line; no breaking public API
  rename is required.
- Add a small Recovery Actions presentation mapper that derives tab status and
  detail values from existing deterministic mock records.
- Wire the presentation into `RecoveryActionsPageShell`.
- Add English, Slovak, and Czech labels for the new state and detail text.
- Update focused component, presentation-model, and shell tests.
- Verify responsive layout, light/dark themes, keyboard use, and production
  build.

### Out of scope

- Changes to Validate, Execute, Schedule, or History page content.
- Route or App Sidebar changes.
- New backend endpoints, queries, mutations, polling, or persistence.
- Making the Execute tab reflect unsaved local selections from its page form.
- Adding a generic status model to unrelated table tabs.
- Redesigning the Recovery workspace header or surrounding page card.

## Architecture Decisions

### Shared component boundary

`WorkspaceTabs<T>` remains controlled, generic, and unaware of recovery data.
It accepts the existing `WorkspaceTabItem<T>` fields and only owns layout,
interaction, focus, and shared styling. The `meta` node is positioned by the
shared component but styled by its consumer, allowing Recovery Actions to use
the existing shared `Badge` without embedding recovery status concepts in the
tab component.

### Recovery-specific presentation

Add a feature-local presentation mapper, for example:

`src/features/recovery-actions/model/recoveryActionTabPresentation.ts`

It returns provider-neutral view data for the four tabs. Initial UI-only values
come from the existing mocks:

| Tab | Status | Context detail | Source |
| --- | --- | --- | --- |
| Validate | Number of non-passing checks | Latest automated run timestamp | `latestValidationChecks`, `latestAutomatedRun` |
| Execute | Ready | Number of available application groups | `recoveryApplicationGroups`, `latestRecoveryPoint` |
| Schedule | Weekly/Monthly or Disabled | Configured day and time | `initialRecoverySchedule` |
| History | Number of runs | Configured 30-day evidence window | `recoveryHistory` |

The mapper returns semantic tone identifiers such as `warning`, `success`, and
`info`; the page shell converts them to existing `Badge` variants and localized
labels. This keeps data derivation testable and makes a future backend swap
localized to the feature boundary.

### Responsive and accessible behavior

The current semantic structure remains `tablist` → `tab` → `tabpanel`.
Visual changes must not alter the accessible name or keyboard selection flow.
On narrow layouts, separators change direction so stacked items remain legible.
Focus rings use existing `focus` tokens and remain visible independently of the
active marker.

## Dependency Graph

```text
Task 1: shared visual contract and tests
    │
    ├── Task 2: recovery tab presentation mapper and translations
    │       │
    │       └── Task 3: shell integration
    │               │
    │               └── Task 4: responsive and regression verification
```

## Task 1: Redesign the shared WorkspaceTabs composition

**Description:** Update tests first, then replace the individual card treatment
with the approved shared operational strip while preserving the component API
and all interaction behavior.

**Acceptance criteria:**

- [ ] Each tab renders line icon, label, optional `meta`, and contextual detail
  in the approved hierarchy.
- [ ] Tabs share one surface with separators; active state uses a top accent
  marker and no bottom underline or individual card border.
- [ ] Click, disabled, focus, Arrow, Home, and End behavior remains unchanged.

**Verification:**

- [ ] Run `npm test -- src/shared/components/tabs/WorkspaceTabs.test.tsx`.
- [ ] Inspect the rendered classes for active, inactive, disabled, and focus
  states.
- [ ] Confirm accessible `tablist` and `tab` roles remain present.

**Dependencies:** None

**Files likely touched:**

- `src/shared/components/tabs/WorkspaceTabs.tsx`
- `src/shared/components/tabs/WorkspaceTabs.test.tsx`

**Estimated scope:** Small — 2 files

## Task 2: Define Recovery Actions operational tab presentation

**Description:** Add a pure feature-local mapper that converts the existing
mock recovery data into status, tone, and contextual detail for every tab, then
add localized strings for the presentation.

**Acceptance criteria:**

- [ ] Validate, Execute, Schedule, and History each receive deterministic
  status and detail data from the current mocks.
- [ ] Warning/success/info tones are derived by pure tested logic with no React
  or router dependency.
- [ ] All newly visible labels resolve in English, Slovak, and Czech.

**Verification:**

- [ ] Run the new presentation-mapper unit test.
- [ ] Parse all three locale JSON files successfully.
- [ ] Confirm the mapper adds no fetch, storage, timer, or mutation dependency.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-actions/model/recoveryActionTabPresentation.ts`
- `src/features/recovery-actions/model/recoveryActionTabPresentation.test.ts`
- `src/locales/en.json`
- `src/locales/sk.json`
- `src/locales/cs.json`

**Estimated scope:** Medium — 5 files

## Checkpoint: Shared contract and presentation data

- [ ] WorkspaceTabs focused tests pass.
- [ ] Presentation mapper tests pass for all four actions.
- [ ] TypeScript typecheck passes.
- [ ] No Recovery Actions route or page behavior has changed.

## Task 3: Integrate operational metadata into the Recovery Actions shell

**Description:** Use the presentation mapper in `RecoveryActionsPageShell`,
render semantic status badges through the existing shared `Badge`, and replace
the current generic descriptions with the mapped contextual details.

**Acceptance criteria:**

- [ ] All four route-backed tabs display the approved status and detail values.
- [ ] Switching tabs still navigates to the same canonical URLs and preserves
  the correct selected tab.
- [ ] The shell contains no duplicated presentation calculations or hardcoded
  English UI strings.

**Verification:**

- [ ] Run a focused `RecoveryActionsPageShell` rendering/navigation test.
- [ ] Run the existing recovery navigation tests.
- [ ] Manually switch through Validate, Execute, Schedule, and History.

**Dependencies:** Tasks 1 and 2

**Files likely touched:**

- `src/features/recovery-actions/components/RecoveryActionsPageShell.tsx`
- `src/features/recovery-actions/components/RecoveryActionsPageShell.test.tsx`

**Estimated scope:** Small — 2 files

## Task 4: Responsive, theme, and regression verification

**Description:** Verify that the approved composition remains readable and
interactive across supported widths and themes, then run the repository quality
gates without modifying unrelated Recovery Plans work.

**Acceptance criteria:**

- [ ] Four columns render at 1440 px, two columns at 768/1024 px as defined by
  the final Tailwind breakpoints, and one column at 320 px without page scroll.
- [ ] Light and dark themes preserve label, status, separator, focus, and active
  marker contrast.
- [ ] No console, accessibility, route, or build regression is introduced.

**Verification:**

- [ ] Run focused WorkspaceTabs, presentation, shell, and router tests.
- [ ] Run `npm run typecheck` and focused ESLint for changed files.
- [ ] Run `npm run build` or document unrelated pre-existing failures exactly.
- [ ] Manually test keyboard navigation and widths 320, 768, 1024, and 1440 px.

**Dependencies:** Task 3

**Files likely touched:**

- No production files expected; test adjustments only if verification reveals a
  regression.

**Estimated scope:** Small — verification only

## Checkpoint: Complete

- [ ] Approved Variant A composition matches the browser template.
- [ ] Status values are useful, deterministic, and visibly identified as mock
  UI data through their source, without adding a “UI template” badge.
- [ ] Keyboard, focus, responsive, and theme checks pass.
- [ ] Focused tests, typecheck, lint, and production build pass or unrelated
  failures are documented.
- [ ] Git diff contains only the approved tab-redesign scope.
- [ ] Ready for user visual review before commit.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Status text appears live although data is mocked | Medium | Derive it only from current deterministic mocks and add no timestamps/timers implying live refresh. |
| Long translations crowd four-column tabs | Medium | Keep status labels concise, use truncation only for the detail line, and verify SK/CS at 1024 px. |
| Shared component becomes recovery-specific | High | Keep status tone and data mapping feature-local; `WorkspaceTabs` accepts only generic React nodes. |
| Active marker competes with focus ring | Medium | Use separate top marker and tokenized outer focus ring, then verify keyboard focus manually. |
| Existing dirty Recovery Plans files enter the change | High | Stage and inspect only explicit WorkspaceTabs, Recovery Actions, locale, and plan files. |

## Open Questions

None. Variant A and its operational status composition are approved for
planning. Implementation begins only after explicit user approval of this plan.
