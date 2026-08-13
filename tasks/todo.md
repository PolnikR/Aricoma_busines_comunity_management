# Task Checklist: Code Review Follow-up Fixes

## Implemented

- [x] Infrastructure and platform provider URL fields flow through create/edit; infrastructure `port` remains omitted from POST.
- [x] Provider View JSON now uses the validated GET records, including URL, port, and credential status where present.
- [x] Recovery Group builder preserves orchestration selection and performs automatic volume hydration without render-phase state updates or false dirty state.
- [x] Recovery Application edit preserves backend environment values outside the standard select options.
- [x] Recovery Groups with unavailable providers remain visible, preserve their IDs/resources/raw JSON, and expose an explicit unresolved state with Edit disabled.
- [x] Recovery Group submit response is matched by normalized group ID.
- [x] VMware HTTP 400 responses now surface as errors instead of being converted to empty inventory.
- [x] Recovery App Policy View JSON preserves nullable GET fields; remaining JSON consumers were audited and found to have no lossy field mapping.
- [x] Regression tests added or updated for all changed behavior.

## Verification

- [x] Focused provider, platform-provider, Recovery Group, Recovery Application, inventory, and policy tests: 17 files, 161 tests passed.
- [x] Full unit suite: 54 files, 278 tests passed.
- [x] `npm run lint` passed with zero errors.
- [x] `npm run typecheck` passed.
- [x] `npm exec vite build` passed; Vite reported only existing chunk-size warnings.
- [x] `git diff --check` returned no diff errors.
- [ ] Full UI suite/manual browser smoke test: Vitest UI process does not terminate in this environment despite the changed-flow suites passing; investigate separately before release.
- [x] X-User handling, development-only screens, pagination, ports, and hard-coded recovery connection defaults were not changed outside the approved scope.
