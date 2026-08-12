# Implementation Plan: Clean Room Policies

## Overview

Add Clean Room Policies as the third Recovery Policies tab and connect the
GET, POST, and DELETE backend contracts. Extend Policy Sets so every set reads,
selects, submits, and displays its required `clean_room_policy_id`.

## Architecture Decisions

- Route: `/recovery-plans/recovery-policies/clean-room`.
- UI: reuse `RecoveryPolicyPageShell`, shared tables, drawer, modal, form
  controls, badges, request states, and pagination.
- API responses are validated with Zod at the boundary. Extra
  `recovery_app_policies` returned by submit/delete are ignored by this feature.
- `apiFetch` remains responsible for the non-overridable `X-User` header; its
  current default user is `admin`.
- Policy Sets require one Clean Room Policy because the updated backend submit
  contract requires `clean_room_policy_id`.

## Task List

### Phase 1: Clean Room API foundation

- [ ] Add failing API and query-hook tests for list, submit, delete, validation,
  cache updates, and `X-User`.
- [ ] Add endpoint constants, wire schemas, domain types, API functions, query
  keys, and hooks.

### Phase 2: Clean Room Policies UI

- [ ] Add failing navigation and component tests.
- [ ] Add the third policy tab and route.
- [ ] Add page, table/detail drawer, create/edit modal, delete confirmation,
  loading/error/empty states, and EN/SK/CS translations.

### Checkpoint: Clean Room feature

- [ ] Focused API, hook, navigation, page, table, and modal tests pass.
- [ ] Keyboard and accessible labels remain available through shared controls.

### Phase 3: Policy Sets integration

- [ ] Add failing tests for `clean_room_policy_id` GET/POST mapping.
- [ ] Extend Policy Set types, Zod schemas, and API mapping.
- [ ] Add a required Clean Room Policy selector to create/edit, including
  loading, retry, unavailable-reference, and validation states.
- [ ] Resolve and display the selected Clean Room Policy in the detail drawer.

### Checkpoint: Complete

- [ ] Focused tests pass.
- [ ] Typecheck, lint, and build pass.
- [ ] Diff contains only Clean Room Policies and Policy Sets integration work.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| POST/DELETE responses contain unrelated collections | Parse only `clean_room_policies`; allow Zod to strip unrelated fields. |
| Existing Policy Sets lack the new field | Treat the field as required, matching the confirmed current backend contract. |
| Stale referenced Clean Room Policy | Preserve the ID in edit mode and show an explicit unavailable warning. |
| Dirty worktree includes unrelated work | Edit and later stage only explicitly scoped files. |

## Open Questions

None. Location and updated Policy Set contract are approved.
