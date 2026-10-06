# Todo: zobrazovanie časov v timezone browser session

Spec: [browser-timezone-date-formatting-spec.md](browser-timezone-date-formatting-spec.md) ·
Plan: [browser-timezone-date-formatting-plan.md](browser-timezone-date-formatting-plan.md) ·
Audit: [browser-timezone-date-formatting-audit.md](browser-timezone-date-formatting-audit.md)

Stav: **čaká na schválenie, implementácia nezačala.**

## Phase 1: Foundation

### T1: Shared `dateTime.ts`
**Description:** Pridať modul s API zo specu (§5) a unit testy, zatiaľ bez akéhokoľvek callera.

**Acceptance criteria:**
- [ ] `Z` aj `±HH:MM` dávajú správny instant. Naive, date-only, invalid, `''`, `null` a `undefined` dávajú `—`.
- [ ] S `timeZone` testami: `2026-10-06T07:41:00Z` je v `Europe/Bratislava` 09:41 a v `Europe/London` 08:41; decembrový instant v Bratislave dá 08:41 (DST). Default bez `timeZone` sa rovná `getBrowserTimeZone()`.
- [ ] `toDateLocale` mapuje sk/cs/en. `localDateTimeInputToUtcIso` vráti `…Z` s round-tripom na rovnaký wall-clock v lete aj v zime. Zdroj modulu neobsahuje `Europe/` ani `±0X:00`.

**Verification:**
- [ ] `npm exec vitest run src/shared/utils/dateTime.test.ts`
- [ ] `npx eslint --max-warnings 0 src/shared/utils/dateTime.ts src/shared/utils/dateTime.test.ts`
- [ ] `npx tsc -b`
- [ ] tie isté testy aj s `TZ=UTC`

**Dependencies:** none · **Files:** `src/shared/utils/dateTime.ts`, `dateTime.test.ts` · **Scope:** S

### Checkpoint 1
- [ ] T1 zelený a API odsúhlasené človekom

## Phase 2: SAFE migrácie

### T2: Access Logs
**Description:** Odstrániť `timeZone: 'Europe/Bratislava'` a formátovať cez `formatDateTime` so zachovaným `sk-SK` bodkovým layoutom.

**Acceptance criteria:**
- [ ] Žiadny `timeZone` ani `Europe/` v súbore. Výstup má tvar `DD.MM.YYYY HH:mm:ss`.
- [ ] Test očakáva hodinu podľa browser timezone (`new Date(ts).getHours()`), nie natvrdo `10`.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/audit/components/AccessLogsTable.test.tsx`
- [ ] eslint na zmenených súboroch

**Dependencies:** T1 · **Files:** `AccessLogsTable.tsx`, `AccessLogsTable.test.tsx` · **Scope:** S

### T3: UsersSection
**Description:** Odstrániť `dateLocale` a `formatUserTimestamp` a použiť `formatDateTime(value, { language })` pre `createdAt` aj `activeSessionStart`.

**Acceptance criteria:**
- [ ] Žiadna lokálna date logika v súbore.
- [ ] Existujúce testy (`Created at`, `Active session start`) prechádzajú bez úpravy.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/identity-access/components/UsersSection.test.tsx`
- [ ] eslint

**Dependencies:** T1 · **Files:** `UsersSection.tsx` · **Scope:** XS

### T4: Recovery Runs
**Description:** `formatRunTimestamp` bude delegovať na `formatDateTime` bez `language` (browser default locale ako dnes). `formatRunDuration` sa nemení.

**Acceptance criteria:**
- [ ] Signatúra `formatRunTimestamp(value: string | null)` sa nemení, lebo ju volá aj `dashboard-preview`.
- [ ] Nový test: `Z` vráti rovnaký výstup ako `Intl(undefined, medium/short)`; `null`, invalid a naive vrátia `—`; duration `252` dá `4m 12s`.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-runs src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`

**Dependencies:** T1 · **Files:** `formatRecoveryRun.ts`, `formatRecoveryRun.test.ts` · **Scope:** S

### Checkpoint 2
- [ ] T2–T4 focused testy zelené, `tsc -b` čisté

## Phase 3: Recovery Actions

### T5: Recovery Actions display
**Description:** Odstrániť duplicitné `formatDate` (History, Validate) a inline locale mapping (PageShell). `RecoveryPointSummary` prepnúť zo surového stringu na `formatDateTime`.

**Acceptance criteria:**
- [ ] V `recovery-actions` nie je `new Intl.DateTimeFormat` ani lokálna `formatDate`.
- [ ] History a Validate zostávajú `en-GB`. PageShell zachová `day`/`month: 'short'`/`hour`/`minute` a jazyk aplikácie.
- [ ] Testy: riadok v History obsahuje `formatDateTime(startedAt, { language: 'en' })`; `RecoveryPointSummary` nezobrazuje `+02:00`.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-actions`
- [ ] eslint `src/features/recovery-actions`

**Dependencies:** T1 · **Files:** `RecoveryActionsHistoryPage.tsx` (+ test), `RecoveryActionsValidatePage.tsx`, `RecoveryActionsPageShell.tsx`, `RecoveryPointSummary.tsx` (+ new test) · **Scope:** M

### T6: Recovery Actions `datetime-local`
**Description:** Nahradiť `` `${date}:00+02:00` `` za `localDateTimeInputToUtcIso(date) ?? ''` v Execute aj Validate. Platí iba ak je schválená otázka 1 v pláne.

**Acceptance criteria:**
- [ ] Žiadne `+02:00` v page súboroch.
- [ ] Test: zimný vstup `2026-12-11T04:15` sa v preview zobrazí ako `11 Dec 2026, 04:15` na oboch stránkach.
- [ ] Test zlyhá proti starému kódu (overené dočasným revertom).

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-actions`
- [ ] eslint

**Dependencies:** T1, T5 · **Files:** `RecoveryActionsExecutePage.tsx`, `RecoveryActionsValidatePage.tsx`, `RecoveryActionsDateInput.test.tsx` (new) · **Scope:** S

### T7: Audit report a uzavretie
**Acceptance criteria:**
- [ ] Stĺpec Action v audite zodpovedá realite (migrated / unchanged).
- [ ] Todo checkboxy sú odškrtnuté.

**Verification:**
- [ ] `git diff --check`

**Dependencies:** T2–T6 · **Scope:** XS

### Checkpoint 3: Complete
- [ ] Všetky focused testy z T1–T6, eslint na zmenených súboroch a `tsc -b` sú zelené (full suite ani build sa nespúšťajú)
- [ ] `git diff 89423dac..HEAD -- src | grep '^+' | grep -E "Europe/|[+-]0[0-9]:00"` je prázdne
