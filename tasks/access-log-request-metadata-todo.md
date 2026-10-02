# Todo: Access Log Request Metadata in the Detail Drawer

Plan: `tasks/access-log-request-metadata-plan.md`

## Task 1: Extend the AccessLogEntry contract

**Description:** Add `query_string`, `user_agent` and `referer` to `AccessLogEntry` in the Orval spec patch data as optional `string | null` properties (not in `required`), then regenerate the Orval/Zod output.

**Acceptance criteria:**
- [x] `accessLogs.json` defines the three properties as `anyOf: [string, null]`, absent from `required`.
- [x] Regenerated `AccessLogEntry` / `AccessLogsResponse` Zod objects include the three fields as optional nullable strings.
- [x] An entry without the three fields still validates.

**Verification:**
- [x] `npm run api:generate`
- [x] `npm run api:check`
- [x] `git diff --check`

**Dependencies:** None

**Files likely touched:**
- `scripts/orval/specPatches/data/accessLogs.json`
- `src/generated/query/zod/accessLogEntry.gen.ts` (generated)
- `src/generated/query/zod/accessLogsResponse.gen.ts` (generated)
- other generated files only if the generator touches them (inspect diff)

**Estimated scope:** XS

## Task 2: Map the new fields into the domain record

**Description:** Add optional `queryString`, `userAgent`, `referer` to `AccessLogRequestRecord`; map them in `selectAccessLogs` (omit when `null`, like `user`); extend `toWireEntry` in the test fetch stub so tests can send them over the wire.

**Acceptance criteria:**
- [x] A wire entry with the three fields yields a record with `queryString`, `userAgent`, `referer`.
- [x] A wire entry with `null` or missing fields yields a record without those keys.
- [x] `toWireEntry` emits `query_string`, `user_agent`, `referer` when the record has them.

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/platform-administration/audit/pages/AuditPage.test.tsx src/features/platform-administration/audit/hooks/accessLogHooks.test.tsx`
- [x] Focused lint: `npm exec eslint src/features/platform-administration/audit`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/audit/model/accessLogTypes.ts`
- `src/features/platform-administration/audit/model/selectAccessLogs.ts`
- `src/features/platform-administration/audit/test/accessLogsFetch.ts`

**Estimated scope:** S

## Task 3: Show the fields in the drawer Request section

**Description:** In `AccessLogDetailDrawer`, add Query string (after Path), User agent and Referer (after Duration) rows. Missing, `null` or empty values render `—`. Add `audit.accessLogs.detail.queryString`, `.userAgent`, `.referer` labels in en/cs/sk. Table stays unchanged.

**Acceptance criteria:**
- [x] Drawer shows the three values for a request that has them (Query string and Referer monospace, User agent wraps).
- [x] Drawer shows `—` for each field the request lacks.
- [x] Access Logs table columns and cells are unchanged (existing table tests pass without modification).
- [x] Labels exist in en, cs and sk.

**Verification:**
- [x] Tests pass: `npm exec vitest run src/features/platform-administration/audit/components/AccessLogsTable.test.tsx src/features/platform-administration/audit/pages/AuditPage.test.tsx`
- [x] Focused lint: `npm exec eslint src/features/platform-administration/audit`
- [x] Locale JSON parses (`node -e "for (const l of ['en','cs','sk']) JSON.parse(require('fs').readFileSync('src/locales/'+l+'.json','utf8'))"`)
- [ ] Manual check: open Platform Administration → Audit, open a request with a query string and one without; confirm values and `—`; confirm table unchanged.

**Dependencies:** Task 2

**Files likely touched:**
- `src/features/platform-administration/audit/components/AccessLogDetailDrawer.tsx`
- `src/features/platform-administration/audit/components/AccessLogsTable.test.tsx` (new drawer test cases)
- `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json` (stage only the new keys — files have unrelated uncommitted changes)

**Estimated scope:** M

## Checkpoint: Complete

- [x] All focused audit tests pass.
- [ ] Browser check done.
- [x] Each task committed atomically; `git diff --cached` reviewed before every commit so unrelated locale changes stay unstaged.
