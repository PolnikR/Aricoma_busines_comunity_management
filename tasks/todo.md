# Task Checklist: Recovery Actions Tabs Redesign — Variant A

## Task 1 — Shared WorkspaceTabs composition (completed)

- [ ] Write failing tests for status metadata and the new active composition.
- [ ] Replace individual card borders with one shared operational strip.
- [ ] Add subtle separators and a top active marker.
- [ ] Remove boxed icon treatment while preserving generic icon support.
- [ ] Preserve click, disabled, focus, Arrow, Home, and End behavior.
- [ ] Run focused WorkspaceTabs tests.

## Task 2 — Operational presentation data (completed)

- [ ] Add a pure Recovery Actions tab-presentation mapper.
- [ ] Derive Validate issue count and latest-check context from validation mocks.
- [ ] Derive Execute readiness and available-group count from recovery mocks.
- [ ] Derive Schedule cadence/day/time from schedule mocks.
- [ ] Derive History run count and evidence-window context.
- [ ] Unit-test all four mapped presentations.
- [ ] Add EN/SK/CS status and detail translations.
- [ ] Validate all locale JSON files.

## Checkpoint — Shared contract and data

- [ ] WorkspaceTabs tests pass.
- [ ] Presentation mapper tests pass.
- [ ] TypeScript typecheck passes.
- [ ] No route or page behavior changed.

## Task 3 — Recovery Actions shell integration (completed)

- [ ] Render the mapped status through the existing shared `Badge`.
- [ ] Replace generic descriptions with operational context details.
- [ ] Keep canonical navigation for all four routes.
- [ ] Add focused shell rendering/navigation coverage.
- [ ] Run recovery navigation tests.

## Task 4 — Responsive and regression verification (completed)

- [x] Verify responsive Tailwind breakpoints in the component contract; manual browser review remains recommended at 320, 768, 1024, and 1440 px.
- [x] Preserve light/dark semantic tokens and focus contrast in the shared component.
- [x] Verify keyboard focus and tab selection.
- [x] Run focused tests for tabs, mapper, shell, and router.
- [x] Run typecheck and focused lint.
- [x] Run the production build.
- [ ] Complete full repository test suite; the command produced no output and was stopped after an extended run, while all focused tests pass.
- [x] Confirm no API, persistence, polling, or backend changes were added.
- [x] Confirm unrelated Recovery Plans changes remain unstaged.
- [x] Present the completed redesign for visual review before commit.
