# ABCO reference-led application redesign

## Goal

Restyle the existing ABCO frontend as one cohesive light interface based on the first supplied reference image. Preserve current routes, data behavior, filtering, selection, and responsive navigation while changing the application shell and shared visual language.

The result should feel like a centered workspace made from two coordinated surfaces: a pale-blue navigation card and a larger white content card. Desktop pages should fit within the viewport where practical and place overflow inside the relevant content surface instead of forcing the browser document to scroll.

## Scope

The redesign covers:

- the application background and responsive shell;
- desktop and mobile navigation;
- the application header and page headings;
- all four current routes;
- shared cards, buttons, badges, form controls, tables, pagination, empty states, and icons;
- virtual-machine metrics, toolbar, inventory table, detail panel, loading state, and recoverable error state;
- the pagination interaction defect that currently requires a second click.

No new business workflows, routes, backend contracts, or data entities are introduced. The current placeholder pages remain placeholders but adopt the new layout and components.

## Visual direction

The first reference image is the primary source of visual direction, not a literal template. The implementation will translate its characteristics into the existing administration product:

- a very light neutral-to-blue page background with restrained ambient color;
- deep navy primary text and muted blue-gray secondary text;
- white and pale-blue surfaces with subtle blue borders;
- generous but purposeful corner radii, using a consistent radius hierarchy;
- soft, broad shadows reserved for the main navigation and workspace surfaces;
- compact blue uppercase eyebrow labels;
- saturated blue primary actions and understated secondary actions;
- clean, compact controls and content density suitable for an inventory console.

The application will use a single light theme. Existing dark-mode classes and controls can be removed when they no longer serve the final interface.

## Application shell

On desktop, the shell occupies the available viewport below a small outer margin and is centered up to a sensible maximum width. It contains:

1. A pale-blue navigation card with brand identity, section label, primary navigation, nested discovery links, and account context.
2. A white workspace card containing a compact top bar and the current route content.

Both surfaces use matching vertical dimensions and independent overflow rules. The browser body should not scroll during normal desktop use. The workspace content area receives `min-height: 0` and owns overflow so descendants can create reliable internal scroll regions.

At narrower desktop widths, spacing and navigation width contract without reducing legibility. On mobile and tablet, the navigation becomes an accessible off-canvas drawer. Natural document scrolling is allowed on small screens because forcing viewport-locked nested scrolling would harm usability.

## Shared component system

Shared components remain the styling boundary. Pages should compose primitives rather than repeat long utility-class strings.

- `Card` supports the reference surface treatment and appropriate padding variants.
- `PageHeader` becomes a compact content header suited to the workspace card.
- `Button` defines consistent primary, secondary, outline, hover, focus, and disabled states.
- Form controls use a quiet white surface, blue-gray border, clear labels, and an accessible focus ring.
- `Badge` retains semantic status meaning through both text and color.
- `Table` receives a calm header, clear row separation, keyboard-visible selection, and horizontal overflow where required.
- `Pagination` remains keyboard accessible and exposes the current page with `aria-current`.
- Empty, loading, and error states use the same spacing and typography hierarchy as normal content.

Global tokens in `src/index.css` define the shared palette, shadows, typography, radii, and custom scrollbar. Component-level styling consumes those tokens.

## Page behavior

### Virtual machines

The page header and four summary metrics occupy the top of the workspace content. The primary inventory region fills the remaining height and contains the table and selected-VM detail as coordinated inner panels.

On desktop:

- the toolbar and pagination remain visible;
- only the table body scrolls vertically when rows exceed available height;
- the table may scroll horizontally at constrained widths;
- the VM detail panel has its own vertical overflow when necessary;
- selecting a row does not move the page or reset the scroll position.

The responsive layout stacks the detail below the inventory on smaller viewports and returns to natural page scrolling.

Pagination must update the URL and displayed records on the first click. The implementation will remove the race between deferred URL state, cached data, and the effect that writes the previous server page back into the query. Controls should remain clickable during background fetching unless a duplicate request would be harmful; the current page can show a subtle updating indicator instead.

### Placeholder routes

Platform Administration, Providers & Connectors, and Infrastructure keep their existing messages. Each renders inside the common workspace with a polished empty-state card, appropriate iconography, and consistent route heading. They must demonstrate the shared system without inventing unavailable functionality.

## Accessibility and responsiveness

- Maintain semantic heading order and landmarks.
- Use native interactive elements and visible keyboard focus.
- Preserve labels or accessible names for icon-only controls.
- Ensure selected navigation, selected rows, and statuses are conveyed by more than color.
- Maintain readable contrast for normal and muted text.
- Verify layouts at approximately 320, 768, 1024, and 1440 pixels.
- Avoid trapping keyboard or wheel scrolling in nested regions; internal scrolling is a desktop enhancement, not a mobile requirement.
- Respect reduced-motion preferences for shell and drawer transitions.

## Error, loading, and empty states

The initial VM load uses skeleton surfaces matching the final geometry to minimize layout shift. A fatal load error replaces the inventory with a clear retry state. A failed background refresh keeps the last successful data visible and shows a compact inline alert. Empty filtered results retain the filters and offer a clear reset action.

## Verification

Implementation is complete when:

- lint, typecheck, and production build pass;
- all current routes render within the redesigned shell;
- desktop browser scrolling is eliminated for the normal VM view, with overflow contained by the table or detail panel;
- mobile layouts use natural scrolling and an operable navigation drawer;
- pagination changes page on the first click and keeps the URL shareable;
- keyboard users can reach and operate navigation, filters, table selection, pagination, refresh, and retry controls;
- no console errors or obvious overflow defects appear at the target breakpoints;
- the interface consistently reflects the first reference image without copying content or sacrificing inventory usability.

## Non-goals

- Reproducing the reference image's onboarding steps or company form.
- Adding new data, charts, administration workflows, or provider setup.
- Pixel-matching a single screenshot at the expense of responsive behavior.
- Introducing a new component library or external design dependency.
