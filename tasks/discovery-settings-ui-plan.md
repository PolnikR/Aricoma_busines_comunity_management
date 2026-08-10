# Implementation Plan: Discovery Settings UI Template

## Overview

Replace the placeholder at `/providers-connectors/discovery-settings` with an interactive frontend-only settings page for discovery scheduling, history retention, and failure email notifications. The page uses local mock state only and makes no backend requests.

## Architecture Decisions

- Add a feature-owned `discovery-settings` folder for page state, section components, mock users, and tests.
- Add a shared `SettingsSectionCard` because the same titled card shell is used by all three settings sections.
- Reuse existing shared `PageHeader`, `Card`, `Toggle`, `Field`, `Select`, and `Button` components.
- Render the three settings cards in a compact three-column desktop grid; collapse to one column below the desktop breakpoint so all three cards remain visible at the target desktop viewport without a page-level scrollbar.
- Keep all interactions local: Save updates the saved snapshot, Cancel restores it, and notification testing only changes an accessible status message.

## Task List

### Phase 1: Shared foundation

#### Task 1: Add the shared settings section card

**Description:** Create a composable shared card shell with icon, title, description, optional action, and content areas matching the existing Card styling.

**Acceptance criteria:**
- [x] All three discovery settings sections use the same component.
- [x] Heading hierarchy and icon semantics are accessible.
- [x] Component follows existing semantic Tailwind tokens and Card radii/shadows.

**Verification:**
- [x] Focused component test passes.
- [x] Typecheck and lint pass.

**Dependencies:** None

**Files likely touched:**
- `src/shared/components/settings/SettingsSectionCard.tsx`
- `src/shared/components/settings/SettingsSectionCard.test.tsx`

**Estimated scope:** Small

### Checkpoint: Shared foundation

- [x] Shared card renders title, description, action, and children correctly.

### Phase 2: Feature UI

#### Task 2: Build the three interactive settings sections

**Description:** Add schedule, retention, and failure-notification components using local state passed from the page.

**Acceptance criteria:**
- [x] Schedule supports enable/disable, frequency, and timezone.
- [x] History supports predefined retention periods.
- [x] Notifications support enable/disable, a mock user selection, email preview, and simulated test action.

**Verification:**
- [x] Page component tests exercise all controls.
- [x] Keyboard-accessible labels and status announcements are present.

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/components/DiscoveryScheduleCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryHistoryCard.tsx`
- `src/features/providers-connectors/discovery-settings/components/DiscoveryNotificationsCard.tsx`
- `src/features/providers-connectors/discovery-settings/model/discoverySettingsTypes.ts`
- `src/features/providers-connectors/discovery-settings/mocks/discoverySettingsMocks.ts`

**Estimated scope:** Medium

#### Task 3: Compose the page and route

**Description:** Build the page container, responsive auto-fit grid, local save/cancel behavior, and replace the placeholder route.

**Acceptance criteria:**
- [x] Route renders the new page instead of `ModuleWorkQueuePage`.
- [x] Three cards fit side-by-side at the target desktop viewport and collapse responsively below it.
- [x] Desktop layout uses the available app-shell height without a page-level scrollbar.
- [x] No API request is made.

**Verification:**
- [x] Focused page and route tests pass.
- [x] Manual browser check at desktop and responsive sizes.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.tsx`
- `src/features/providers-connectors/discovery-settings/pages/DiscoverySettingsPage.test.tsx`
- `src/app/AppRoutes.tsx`

**Estimated scope:** Medium

### Checkpoint: Feature complete

- [x] Save and Cancel work against local mock state.
- [x] Test notification produces an accessible local-only status message.
- [x] Focused tests, provider/connectors tests, typecheck, lint, and build pass.
- [x] Browser shows no unexpected page scrollbar at the desktop target size.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Three cards overflow shorter desktop viewports | Medium | Use compact spacing, `auto-fit` grid, `min-h-0`, and available-height layout; verify representative viewport sizes. |
| UI prototype is mistaken for persisted configuration | Medium | Show clear local-template status copy and avoid API hooks entirely. |
| Shared card becomes overly specific | Low | Keep it compositional: icon, heading, optional action, children. |

## Open Questions

None. The implementation is explicitly frontend-only and follows the approved template.
