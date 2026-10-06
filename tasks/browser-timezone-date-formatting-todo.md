# Todo: zobrazovanie časov v timezone browser session

Spec: [browser-timezone-date-formatting-spec.md](browser-timezone-date-formatting-spec.md) ·
Plan: [browser-timezone-date-formatting-plan.md](browser-timezone-date-formatting-plan.md) ·
Audit: [browser-timezone-date-formatting-audit.md](browser-timezone-date-formatting-audit.md)

Stav: **čaká na schválenie, implementácia nezačala.**

## Phase 1: Foundation

### T1: Shared `dateTime.ts`
**Description:** Pridať modul s API zo specu (§5) a unit testy, zatiaľ bez akéhokoľvek callera.

**Acceptance criteria:**
- [ ] **Formatter:**
  - `Z` aj `±HH:MM` dávajú správny instant;
  - naive (aj Airflow-like `2026-08-18T09:46:40`), date-only, invalid, `''`, `null` a `undefined` dávajú `—`;
  - s explicitným `timeZone`: `2026-10-06T07:41:00Z` je v `Europe/Bratislava` 09:41 a v `Europe/London` 08:41; decembrový instant v Bratislave dá 08:41 (DST);
  - `toDateLocale` mapuje sk/cs/en;
  - zdroj modulu neobsahuje `Europe/` ani `±0X:00`.
- [ ] **`localDateTimeInputToUtcIso`** robí DST-safe round-trip (spec §6). S injektovaným `LocalCalendar` pre `Europe/Bratislava`:
  - leto `2026-08-11T04:15` vráti `2026-08-11T02:15:00.000Z`;
  - zima `2026-12-11T04:15` vráti `2026-12-11T03:15:00.000Z`;
  - DST gap `2026-03-29T02:30` vráti `null`;
  - `''`, `2026-08-11`, `…Z`, `2026-02-30T10:00` vrátia `null`.
- [ ] **Invariantné testy s default kalendárom:**
  - prejdú pri ľubovoľnej host TZ;
  - žiadny test nečíta OS/CI timezone ako očakávanú hodnotu a žiadny sa nespúšťa s `TZ=…`.

**Verification:**
- [ ] `npm exec vitest run src/shared/utils/dateTime.test.ts`
- [ ] `npx eslint --max-warnings 0 src/shared/utils/dateTime.ts src/shared/utils/dateTime.test.ts`
- [ ] `npx tsc -b`

**Dependencies:** none · **Files:** `src/shared/utils/dateTime.ts`, `dateTime.test.ts` · **Scope:** S

### Checkpoint 1
- [ ] T1 zelený a API odsúhlasené človekom

## Phase 2: SAFE migrácie

### T2: Access Logs
**Description:** Odstrániť `timeZone: 'Europe/Bratislava'` a formátovať cez `formatDateTime` so zachovaným `sk-SK` bodkovým layoutom.

**Acceptance criteria:**
- [ ] Žiadny `timeZone` ani `Europe/` v súbore. Výstup má tvar `DD.MM.YYYY HH:mm:ss`.
- [ ] Test overuje iba wiring invariantnou assertion (hodina z `new Date(ts).getHours()`, platí pri ľubovoľnej host TZ), nie natvrdo `10`. Samotnú konverziu pokrýva T1.

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
- [ ] Airflow nemá výnimku zo strict parse. ABCO BE hodnoty nenormalizuje, preto naive `start_date` vráti `—` a nesmie sa brať ako UTC ani ako lokálny čas.
- [ ] Nový test:
  - `Z` aj `+00:00` vráti rovnaký výstup ako `formatDateTime` (invariant);
  - `null`, invalid a naive `2026-08-18T09:46:40` vrátia `—`;
  - duration `252` dá `4m 12s`.

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
- [ ] Žiadne `+02:00` v page súboroch. Nevalidný alebo neexistujúci (DST gap) vstup zobrazí v preview `—`, nie posunutý čas.
- [ ] Page test overuje iba wiring: zimný vstup `2026-12-11T04:15` sa v preview zobrazí ako `11 Dec 2026, 04:15` na oboch stránkach (round-trip invariant pre ľubovoľnú host TZ).
- [ ] DST korektnosť (zima `+01:00`, gap → `null`) je dokázaná v T1 cez injektovaný kalendár, nie cez timezone stroja.

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
