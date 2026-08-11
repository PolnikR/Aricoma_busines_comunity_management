# Task Checklist: Recovery Actions UI — Variant A

## Foundation

- [x] Build generic shared `WorkspaceTabs` with rich action-card items.
- [x] Test click, keyboard, focus, disabled, selected, and responsive behavior.
- [x] Define Recovery Actions route metadata, provider-neutral UI types, and
  deterministic mock records.
- [x] Build the Recovery Actions page shell and shared recovery-point summary.

## Feature slices

- [x] Build Validate with Latest automated and Manual validation modes.
- [x] Build Execute with point-in-time selection, resolved timestamps, preview,
  and local-only confirmation.
- [x] Build Schedule with recurring test settings and failure notifications.
- [x] Build History with period/type/status/application filters and report
  details.

## Application integration

- [x] Add `/recovery-actions/validate`, `/execute`, `/schedule`, and
  `/history` routes.
- [x] Redirect `/recovery-actions` to Validate.
- [x] Redirect legacy `/recovery-plans/recovery-runs` to Recovery Actions
  History.
- [x] Add Recovery Actions beside Recovery Plans in App Sidebar.
- [x] Remove the duplicate Recovery Runs submenu entry.
- [x] Add complete English, Slovak, and Czech translations.

## Verification

- [x] Run focused WorkspaceTabs and Recovery Actions tests.
- [x] Run router tests. Sidebar and language labels are covered by the existing app test surface.
- [x] Run lint and TypeScript typecheck for the changed feature; full lint still reports pre-existing Recovery Policy/Group errors.
- [x] Run production build. The full test suite was started but stopped after it exceeded the focused-test timeout; focused tests pass.
- [ ] Check light/dark themes at 320, 768, 1024, and 1440 px.
- [x] Confirm no backend request or persistence was added.
- [x] Confirm unrelated Recovery Policies work was not modified or staged.
- [x] Obtain user approval before implementation.
