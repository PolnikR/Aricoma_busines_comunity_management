# Task Checklist: Clean Room Policies

- [x] API contract tests fail for the missing Clean Room feature.
- [x] GET `/api/get_clean_room_policies` is implemented and validated.
- [x] POST `/api/submit_clean_room_policy` sends the confirmed body.
- [x] DELETE `/api/delete_clean_room_policy?policy_id=...` is implemented.
- [x] Query hooks update the authoritative Clean Room cache.
- [x] Third Recovery Policies tab and route are implemented.
- [x] Clean Room table, drawer, create/edit, delete, and translations are implemented.
- [x] Policy Set GET maps `clean_room_policy_id`.
- [x] Policy Set POST sends `clean_room_policy_id`.
- [x] Policy Set form requires and selects a Clean Room Policy.
- [x] Policy Set drawer resolves the Clean Room Policy name.
- [x] Focused tests pass (48 tests across the affected contracts and UI).
- [x] Typecheck, lint, and production Vite build pass.
- [ ] Browser verification: Chrome DevTools MCP is not configured in this session.
- [ ] Full repository test suite: command timed out without test output; focused suites pass.
