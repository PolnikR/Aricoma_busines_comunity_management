# Tasks: Access Logs newest first

Plan: `tasks/access-logs-newest-first-plan.md`

## Task 1: Reverse access-log entries in `selectAccessLogs`

**Description:** Map the BE entries in reverse order so the newest entry is the first record, and
update the pagination tests that run through the real selector (via `test/accessLogsFetch.ts`) to
expect newest first. `test/accessLogsFetch.ts` stays unchanged.

**Acceptance criteria:**
- [ ] Selector: BE entries `10:00, 11:00, 12:00` produce records `12:00, 11:00, 10:00`; raw fallback
      entries keep their relative position; the response's `entries` array is not mutated
- [ ] `AccessLogsTable.test.tsx` pagination test expects `/api/entries/26` on page 1, `/api/entries/1`
      on page 2, and `DELETE /api/reloaded/26` on page 1 after the new applied query
- [ ] Both `AuditPage.test.tsx` pagination tests expect `/api/entry/26` on page 1 and `/api/entry/1`
      on page 2 (and `/api/entry/26` on page 1 after Clear all)

**Verification:**
- [ ] Tests pass: `npm exec vitest run src/features/platform-administration/audit/model/selectAccessLogs.test.ts src/features/platform-administration/audit/hooks/accessLogHooks.test.tsx src/features/platform-administration/audit/components/AccessLogsTable.test.tsx src/features/platform-administration/audit/pages/AuditPage.test.tsx`
- [ ] Lint: `npm exec eslint` on the four changed source files

**Dependencies:** None

**Files likely touched:**
- `src/features/platform-administration/audit/model/selectAccessLogs.ts`
- `src/features/platform-administration/audit/model/selectAccessLogs.test.ts`
- `src/features/platform-administration/audit/components/AccessLogsTable.test.tsx`
- `src/features/platform-administration/audit/pages/AuditPage.test.tsx`

**Estimated scope:** Small (1 source file + 3 test files)

## Checkpoint: Complete
- [ ] Focused tests pass
- [ ] Atomic commit with explicit paths only
