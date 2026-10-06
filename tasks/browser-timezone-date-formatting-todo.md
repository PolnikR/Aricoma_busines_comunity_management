# Todo: zobrazovanie časov v timezone browser session

Spec: [browser-timezone-date-formatting-spec.md](browser-timezone-date-formatting-spec.md) ·
Plan: [browser-timezone-date-formatting-plan.md](browser-timezone-date-formatting-plan.md) ·
Audit: [browser-timezone-date-formatting-audit.md](browser-timezone-date-formatting-audit.md)

Stav: **T1–T6 dokončené** (commity `ba618ba1`, `fd09ce87` + `33cddc58`, `7b93426c`, `3a482edb`, `989766af`). Deferred follow-up zostáva otvorený.
Scope: iba SAFE (A) display timestamps a centralizovaný formatter. `datetime-local` je deferred follow-up (spec §6).

## Phase 1: Foundation

### T1: Shared `dateTime.ts`
**Description:** Pridať display-only modul s API zo specu (§5) a unit testy, zatiaľ bez akéhokoľvek callera. Žiadny helper na konverziu lokálneho vstupu.

**Acceptance criteria:**
- [x] **Parse:**
  - UTC `Z` aj explicitný offset (`+00:00`, `+02:00`) reprezentujú správny instant;
  - naive `2026-08-18T09:46:40`, date-only `2026-10-06`, invalid, `''`, `null` a `undefined` vrátia `—`.
- [x] **Formát:**
  - `toDateLocale` mapuje sk/cs/en;
  - s explicitným `timeZone`: `2026-10-06T07:41:00Z` je v `Europe/Bratislava` 09:41 a v `Europe/London` 08:41; decembrový instant v Bratislave dá 08:41 (DST);
  - browser default: `formatDateTime(v)` sa rovná `formatDateTime(v, { timeZone: getBrowserTimeZone() })` (invariant).
- [x] **Zdroj modulu** neobsahuje `Europe/` ani fixný offset `±0X:00`. Žiadny test nečíta OS/CI timezone ako očakávanú hodnotu a žiadny sa nespúšťa s `TZ=…`.

**Verification:**
- [x] `npm exec vitest run src/shared/utils/dateTime.test.ts`
- [x] `npx eslint --max-warnings 0 src/shared/utils/dateTime.ts src/shared/utils/dateTime.test.ts`
- [x] `npx tsc -b`

**Dependencies:** none · **Files:** `src/shared/utils/dateTime.ts`, `dateTime.test.ts` · **Scope:** S

### Checkpoint 1
- [x] T1 zelený a API odsúhlasené človekom

## Phase 2: SAFE migrácie

### T2: Access Logs
**Description:** Odstrániť `timeZone: 'Europe/Bratislava'` a formátovať cez `formatDateTime` so zachovaným `sk-SK` bodkovým layoutom. BE audit timestamp je UTC-aware.

**Acceptance criteria:**
- [x] Žiadny `timeZone` ani `Europe/` v súbore. Výstup má tvar `DD.MM.YYYY HH:mm:ss`.
- [x] Test overuje iba wiring invariantnou assertion: celý očakávaný `DD.MM.YYYY HH:mm:ss` sa skladá z lokálnych getterov `new Date(ts)`, takže platí pri ľubovoľnej host TZ vrátane záporných offsetov (`33cddc58`). Samotnú konverziu pokrýva T1.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/audit/components/AccessLogsTable.test.tsx`
- [x] eslint na zmenených súboroch

**Dependencies:** T1 · **Files:** `AccessLogsTable.tsx`, `AccessLogsTable.test.tsx` · **Scope:** S

### T3: UsersSection
**Description:** Odstrániť `dateLocale` a `formatUserTimestamp` a použiť `formatDateTime(value, { language })` pre `createdAt` aj `activeSessionStart`.

**Acceptance criteria:**
- [x] Žiadna lokálna date logika v súbore.
- [x] Existujúce testy (`Created at`, `Active session start`) prechádzajú bez úpravy.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/identity-access/components/UsersSection.test.tsx`
- [x] eslint

**Dependencies:** T1 · **Files:** `UsersSection.tsx` · **Scope:** XS

### T4: Recovery Runs
**Description:** `formatRunTimestamp` bude delegovať na `formatDateTime` bez `language` (browser default locale ako dnes). `formatRunDuration` sa nemení.

**Acceptance criteria:**
- [x] Signatúra `formatRunTimestamp(value: string | null)` sa nemení, lebo ju volá aj `dashboard-preview`.
- [x] Airflow nemá výnimku zo strict parse. ABCO BE hodnoty nenormalizuje, preto naive `start_date` vráti `—` a nesmie sa brať ako UTC ani ako lokálny čas.
- [x] Nový test:
  - `Z` aj `+00:00` vráti rovnaký výstup ako `formatDateTime` (invariant);
  - `null`, invalid a naive `2026-08-18T09:46:40` vrátia `—`;
  - duration `252` dá `4m 12s`.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-runs src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`

**Dependencies:** T1 · **Files:** `formatRecoveryRun.ts`, `formatRecoveryRun.test.ts` · **Scope:** S

### Checkpoint 2
- [x] T2–T4 focused testy zelené. `tsc -b` bol na checkpointe 2 červený kvôli súborom paralelnej Detail View session (nie T1–T4); na checkpointe 3 je zelený.

## Phase 3: Recovery Actions SAFE display

### T5: Recovery Actions SAFE display
**Description:** Odstrániť duplicitné `formatDate` (History, Validate latest run) a inline locale mapping (PageShell).
Migrujú sa iba absolute timestamps s explicitným offsetom. `datetime-local`, `${…}:00+02:00` a `RecoveryPointSummary` sa nemenia.

**Acceptance criteria:**
- [x] V History, Validate a PageShell nie je `new Intl.DateTimeFormat` ani lokálna `formatDate`. History a Validate zostávajú `en-GB`; PageShell zachová `day`/`month: 'short'`/`hour`/`minute` a jazyk aplikácie.
- [x] `RecoveryActionsExecutePage.tsx`, `RecoveryPointSummary.tsx` a `datetime-local` riadky vo `RecoveryActionsValidatePage.tsx` majú nulový diff.
- [x] Testy:
  - riadok v History obsahuje `formatDateTime(startedAt, { language: 'en' })`;
  - PageShell detail obsahuje `formatDateTime(latestAutomatedRun.startedAt, { language, …fields })` pre jazyk aplikácie (v teste default `en`).

**Verification:**
- [x] `npm exec vitest run src/features/recovery-actions`
- [x] eslint na zmenených súboroch
- [x] `git diff -- src/features/recovery-actions/pages/RecoveryActionsExecutePage.tsx src/features/recovery-actions/components/RecoveryPointSummary.tsx` je prázdny

**Dependencies:** T1 · **Files:** `RecoveryActionsHistoryPage.tsx` (+ test), `RecoveryActionsValidatePage.tsx`, `RecoveryActionsPageShell.tsx` (+ test) · **Scope:** M

### T6: Audit report a uzavretie
**Acceptance criteria:**
- [x] Stĺpec Action v audite zodpovedá realite (migrated / unchanged / DEFERRED FOLLOW-UP).
- [x] Todo checkboxy sú odškrtnuté. Deferred follow-up zostáva otvorený a nie je označený ako vyriešený.

**Verification:**
- [x] `git diff --check`

**Dependencies:** T2–T5 · **Scope:** XS

### Checkpoint 3: Complete
- [x] Všetky focused testy z T1–T5, eslint na zmenených súboroch a `tsc -b` sú zelené (full suite ani build sa nespúšťajú)
- [x] V commitoch T1–T5 nie sú v produkčných súboroch pridané `Europe/`, `±0X:00` ani `timeZone:` (výskyty iba v testoch ako vstupy alebo pinnutá zóna). Base `89423dac..HEAD` obsahuje aj cudzie commity, preto sa grep robí per vlastný commit.
- [x] Produkčný kód neobsahuje helper na konverziu lokálneho vstupu na UTC

## Deferred follow-up (nie je súčasťou tohto todo)
- [ ] `datetime-local` v Execute a Validate, `RecoveryPointSummary` preview, fixed `+02:00`. Blokované UX/API rozhodnutím (spec §6, audit otázka 6).
  Testy pre spring-forward a fall-back patria do toho budúceho tasku.
