# Todo: Provider Dialog Overflow and Platform Layout

Design: `docs/superpowers/specs/2026-08-20-provider-dialog-overflow-layout-design.md`

## Phase 1: Overflow ownership

- [x] Task 1: Add responsive modal content overflow and lock dropdown scrolling.
- [x] Task 2: Opt both provider dialogs into responsive overflow and widen the platform modal.

## Checkpoint: Overflow ownership

- [x] Run shared modal, multiselect, and both provider-modal tests together.
- [x] Run typecheck and focused lint.
- [x] Confirm unrelated modals retain default auto overflow.

## Phase 2: Platform layout

- [x] Task 3: Reorganize the platform-provider form into compact responsive rows.

## Phase 3: Integrated verification

- [x] Task 4: Run all focused tests together.
- [x] Run `npm run typecheck`.
- [x] Run focused lint for every changed TypeScript file.
- [x] Run `git diff --check`.
- [ ] Browser-check 320, 768, 1024, and 1440 widths when tooling is available.
- [ ] Report browser/full-suite/build status explicitly.
- [ ] Commit only in-scope files atomically.
