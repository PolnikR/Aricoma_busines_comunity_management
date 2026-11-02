# Six-candidate architectural code review – technical acceptance and outstanding gates

**Reviewed:** 2026-10-27  
**Repository:** `C:\Users\polnikr\source\ABCO\Aricoma_busines_comunity_management`  
**Branch:** `spike/ant-design-shell`  
**HEAD checked:** `bbd56c3d7b7aed97b21d4b2415e837e486946312`  
**Status:** All six candidate implementations are present. **Technical code review and isolated frontend browser smoke complete; final release sign-off is still conditional** on the explicit open gates below.

## Candidate status

| Candidate | Implementation and review | Remaining acceptance |
| --- | --- | --- |
| 1. Policy Catalog | Implemented; dedicated checklist completed | No candidate-owned action |
| 2. Provider-aware VMware Live Refresh / cache race | Implemented; revision/race tests including delete/update | No candidate-owned action |
| 3. Recovery Group draft lifecycle | Implemented, regression-tested and partially Playwright-tested | Full manual/new Managed/rollback/prefetch scenarios remain open |
| 4. Recovery Application Save completion | Implemented, integration-tested and partially Playwright-tested | Native Back/refresh in slow Save, complete pushed/manual-only result matrix and live integration remain open |
| 5. Selected orchestration details | Implemented; focused tests, static checks, independent Edge Playwright smoke and page-limited fan-out confirmed | No candidate-owned mock-browser action; live API remains overall release gate |
| 6. Recovery Application draft domain | Implemented; 13-suite/403-test evidence from earlier review and independent browser checks | Explicit human final acceptance is still unchecked |

## Independent verification on the current branch

- **Microsoft Edge + Playwright:** **11/11 isolated frontend browser cases PASS**, with real React UI and intercepted HTTP on locally served Vite `http://127.0.0.1:5173/`. Includes Recovery Group Create Local gates/VM inventory, browser-dispatched HTML5 drop/selected VM, published Group read-only, editable Group dirty Back-cancel, legacy provider Edit disabled, Managed warning, Existing Metro Mirror Edit, Application Create/Edit and provider lock, pending Save single-flight and blocked UI Back, deliberate HTTP 500 followed by successful retry, application dirty guard, selected Group details/Recovery Runs route.
- Browser test uses a **synthetic browser `DragEvent`**, not a verified physical pointer `dragTo`. It demonstrates drop handler and rendered selection, but must not be reported as native gesture E2E.
- HTTP failure is **intentional**: the test returns status 500 for the first mocked Application Save, confirms it stays on Edit, retains the draft and unlocks retry, then returns success and confirms navigation. The resulting browser resource error is expected and not a production finding.
- **Vitest candidate regression pack:** 20 explicit test files spanning all six candidates: **exit 0**. Full test count was not captured from the background command; do not invent one.
- **`npm.cmd run typecheck`: PASS** separately.
- **`npm.cmd run lint`: PASS** separately (ESLint plus feature-layout check).
- **`npm.cmd run api:check`: PASS** separately.
- **`node node_modules/vite/bin/vite.js build`: PASS** separately.
- **`npm.cmd run build`: TIMEOUT** (360s maximum), **not PASS**. This combined script includes lint, typecheck, full Vitest suite, API check and Vite build. The same isolated components above succeeded, but the full Vitest run within the combined pipeline did **not** finish in that bounded run. Do not infer a suite failure or success from timeout.
- Candidate 5 previous independent browser evidence: **11/11 PASS** on both selected details, navigation and request counts; separate **16 applications / 10 visible = 10 latest requests** for the Recovery Runs page. Existing history hook regression tests were checked in the preceding review.
- Candidate 6 preceding Edge-CDP browser acceptance: **14 scenario groups**, Create and Edit payload oracle plus 403 focused Vitest tests, as already recorded in its plan/TODO.

Evidence paths (all on the user's Windows machine, not downloadable sandbox files):

```text
C:\Users\polnikr\AppData\Local\Temp\abco-p1p2-playwright\final-review-acceptance-results.json
C:\Users\polnikr\AppData\Local\Temp\abco-p1p2-playwright\final-review-acceptance.cjs
C:\Users\polnikr\AppData\Local\Temp\abco-p1p2-playwright\candidate5-smoke-results.json
C:\Users\polnikr\AppData\Local\Temp\abco-p1p2-playwright\candidate5-fanout-results.json
```

## Outstanding acceptance / release gates

1. **Recovery Group F4 manual coverage:** New Managed Create, partial/clean Managed rollback against an authorized disposable fixture/backend and rapid navigation during in-flight prefetch were not proven in this browser run. Existing Metro Mirror and Managed Edit screens were inspected but do not constitute these complete flows. Keep the Group final manual checkbox open.
2. **Recovery Application Save F4 browser edges:** Native browser history Back and refresh during unresolved Save and follow-up edits remain untested. Full pushed/manual-only dialog variants, skipped/null/missing responses and full both-page matrix are not all covered by this Playwright smoke. Preserve the remaining unchecked TODO bullets.
3. **Authenticated live integration:** No usable authenticated localhost session was detected at the start. The test frontend was started with `AUTH_ENABLED=false` and all tested API calls were intercepted. No real Keycloak/backend, actual push or backend write was exercised. Authorize a disposable test environment before running destructive create/rollback operations.
4. **Release pipeline and human approval:** The single `npm run build` did not complete due to execution timeout. Run the complete test suite under a suitable CI limit and capture the CI result. Human final acceptance for Candidate 6 remains explicitly open.

## Checklist reconciliation

- `tasks/selected-orchestration-details-todo.md`: the four stale F4 checkboxes now reflect independently verified typecheck/full lint, isolated Playwright table smoke, Recovery Runs fan-out and scoped acceptance. The earlier browser/tooling limitation is historical.
- `tasks/recovery-group-draft-lifecycle-todo.md`: manual checkbox intentionally **unchecked**, with concrete Playwright evidence and remaining gaps appended.
- `tasks/recovery-application-save-completion-todo.md`: slow-Save/browser-history checkbox intentionally **unchecked**, with controlled mocked HTTP 500/retry evidence and exact limitations appended.
- `tasks/recovery-application-draft-todo.md`: human final acceptance intentionally **unchecked**.

## Decision

**Technical implementation review: ACCEPTED for all six candidates, with no confirmed critical or high-severity regression in the executed checks.**

**Unconditional production/release acceptance: NOT YET.** Treat this as an evidence-backed conditional closure, not as proof of the remaining live backend, native browser-history, complex rollback/prefetch, full CI and human approval gates.

No production code, tests, generated API, or backend data changed as part of this final review. No Git commit, push, merge or branch change was executed. Unrelated concurrent untracked planning files are outside scope.
