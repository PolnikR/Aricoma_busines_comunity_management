# Provider dropdown overlay correction

2026-11-03. The shared MultiSelect rendered its expanded option group in normal form flow, increasing the provider modal height/scroll extent. Options now render in a fixed body portal above the modal, anchored to the trigger, with viewport-clamped width/height and upward placement when needed. Position follows window resize and ancestor scroll. Keyboard traversal bridges the portal into the existing form order; Escape closes only the dropdown and restores trigger focus. Outside pointer/focus dismisses it. All provider MultiSelect usages receive the correction.

Passed validation:

- 63 tests: `npm.cmd exec -- vitest run src/shared/components/form/MultiSelect.test.tsx src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/shared/components/modal/Modal.test.tsx --maxWorkers=2`.
- `npm.cmd exec -- eslint src/shared/components/form/MultiSelect.tsx src/shared/components/form/MultiSelect.test.tsx --max-warnings 0`.
- `npm.cmd run typecheck` (before the final numeric placement adjustment; final component checks rerun afterward).
- `git diff --check`.
- Isolated Chrome/CDP probe against the real Modal and MultiSelect via temporary Vite fixture: 2 and 20 options at 1280x900, 800x500 and 320x640. All six cases asserted identical modal bounds and scroll height before/after opening, body portal, viewport fit, exact 4px trigger gap above/below, working selection, and Escape preserving the modal/restoring trigger focus. Earlier long-list screenshot at 800x500 visually inspected. Temporary fixture removed. No live provider API mutations.

Complete suite and production build not run. Pre-existing routeContract snapshot excluded. Scope is the shared MultiSelect popup, not native HTML selects or provider data loading.
