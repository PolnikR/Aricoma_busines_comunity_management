# Responsive Sidebar Width Design

## Goal

Ensure the desktop application sidebar displays complete translated navigation
labels while preserving as much space as possible for the main content.

## Behavior

- On desktop, the sidebar uses content-aware sizing rather than the current
  fixed 216–224 px width.
- Its preferred width follows the longest visible navigation label.
- The desktop width is constrained to a minimum of 272 px and a maximum of
  352 px, with an additional viewport-relative cap so the main content remains
  usable on smaller desktop screens.
- Navigation labels are not truncated with an ellipsis.
- Labels normally remain on one line. If a translation exceeds the maximum
  allowed width, it may wrap to at most two lines.
- The main content remains a flexible layout item and receives all remaining
  horizontal space.
- Mobile behavior remains unchanged: the sidebar is a fixed overlay and does
  not reduce the width of the page content.

## Implementation Scope

- Update the responsive width classes or styles on `AppSidebar`.
- Remove truncation from desktop navigation labels and provide a bounded
  wrapping fallback.
- Preserve the current icons, spacing, colors, expanded-menu behavior,
  navigation behavior, and mobile transition.
- Do not introduce JavaScript text measurement or resize listeners; CSS
  intrinsic sizing and responsive constraints are sufficient.

## Accessibility

- Wrapped labels must remain fully readable and must not obscure icons or
  expansion controls.
- Existing semantic navigation, links, buttons, focus behavior, and accessible
  labels remain unchanged.

## Verification

- Verify the sidebar at viewport widths 320, 768, 1024, and 1440 px.
- Confirm full labels in each supported application language.
- Confirm long labels wrap within two lines only when the maximum width is
  reached.
- Confirm the main content shrinks without horizontal overflow.
- Run lint, typecheck, tests, and the production build.
