# Scrollable Provider Tabs Design

## Goal

Display every configured VMware provider as a source tab above the virtual-machine inventory. The tab strip must remain one line when ten or more providers exist and must be reusable by other inventory tables.

## Shared component

Extend the existing `src/shared/components/tabs/Tabs.tsx` component instead of creating a second tab implementation. Add an opt-in `scrollControls` property containing localized labels for the previous and next buttons.

When enabled, the component:

- keeps tabs on one line inside a horizontally scrollable viewport;
- shows previous and next arrow buttons only when the tabs overflow;
- disables an arrow at the corresponding scroll boundary;
- scrolls by most of the visible width when an arrow is pressed;
- automatically reveals the active tab;
- preserves the existing ArrowLeft, ArrowRight, Home, and End keyboard behavior;
- exposes complete tab names with a native tooltip when labels are truncated.

Existing consumers remain unchanged unless they opt into `scrollControls`.

## VMware inventory integration

The VMware inventory renders one tab for each configured VMware provider. The selected value is stored in the existing `providerId` URL search parameter. Selecting a tab resets pagination and causes the existing provider-scoped discovery query to load that provider's inventory.

When the URL has no valid VMware provider, the first configured VMware provider becomes the effective selection and the URL is canonicalized. The inventory therefore does not perform an aggregate all-provider request while provider tabs are present.

The provider dropdown is removed from the filter dialog because provider selection is now persistent source navigation. Search, tag, power, connection, and cluster filters remain unchanged.

## Placement and responsive behavior

Provider tabs appear inside the inventory panel, directly above the search and filter toolbar. This associates the selected provider with the table it controls and lets the same shared component be placed above FlashSystem, IBM Power, or other tables later.

Desktop uses arrow buttons when content overflows. Touch and trackpad horizontal scrolling continue to work. The tab strip never wraps, so table content does not move vertically when provider count or viewport width changes.

## Accessibility

- The container retains `role="tablist"` and each source retains `role="tab"`.
- Only the active tab participates in the normal tab order.
- Arrow controls are native buttons with translated accessible names.
- Keyboard tab navigation and focus movement continue to use the WAI-ARIA tabs interaction pattern.
- Disabled scroll controls expose their boundary state to assistive technology.

## Verification

- Shared component tests cover overflow controls, boundary states, scrolling, active-tab visibility, and keyboard navigation.
- VMware inventory tests cover ten rendered providers and provider changes updating the URL-backed query.
- Browser checks cover 320, 768, 1024, and 1440 pixel widths.
- Focused tests, typecheck, lint, and production build must pass.
