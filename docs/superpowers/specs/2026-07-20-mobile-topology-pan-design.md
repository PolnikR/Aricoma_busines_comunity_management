# Mobile topology pan design

## Goal

Allow users to pan the Infrastructure React Flow topology in every direction
with one finger on mobile. A two-finger pinch continues to zoom the topology,
and vertical page scrolling remains available when the gesture starts outside
the topology canvas.

## Scope

- Change only mobile topology interaction and mobile canvas sizing.
- Preserve the existing desktop viewport, gestures, controls, MiniMap, layout,
  filtering, and visual styling.
- Do not change topology data, ELK layout, nodes, edges, or API behavior.

## Interaction design

- One-finger drag inside the canvas pans the React Flow viewport.
- Two-finger pinch inside the canvas zooms the viewport.
- Touch gestures that start outside the canvas scroll the page normally.
- Controls and the MiniMap remain operable.
- The canvas fills the width and available dynamic height of the mobile display
  without creating page-level horizontal overflow.

## Responsive sizing

- Do not detect device models or encode fixed mobile canvas heights.
- Remove the current fixed mobile minimum heights from the topology workspace.
- Use responsive flex sizing and dynamic viewport units (`dvh`) so browser
  address-bar changes and different mobile display sizes are handled naturally.
- Keep toolbar and legend content-sized; give the remaining bounded workspace
  height to the React Flow canvas.
- Keep the existing desktop sizing rules active from the `lg` breakpoint.

## Implementation boundary

Prefer React Flow's native interaction properties and responsive flex/container
styles. Apply touch-action, dynamic viewport sizing, and overflow overrides only
below the desktop breakpoint so the currently correct desktop behavior remains
unchanged.

Likely files:

- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyCanvas.tsx`
- `src/features/discovery-inventory/infrastructure/components/InfrastructureTopologyWorkspace.tsx`

## Verification

- Verify one-finger pan and pinch zoom at 320 px and 375 px widths.
- Verify sizing in both portrait and landscape orientation and while the mobile
  browser address bar expands or collapses.
- Verify page scrolling by dragging outside the canvas.
- Verify Controls and MiniMap interaction on mobile.
- Verify the existing desktop topology behavior at 1024 px and 1440 px.
- Run `npm run check`.
