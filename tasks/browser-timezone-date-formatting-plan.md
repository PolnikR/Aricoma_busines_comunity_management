# Implementation Plan: zobrazovanie časov v timezone browser session

## Overview
Vytvoriť `src/shared/utils/dateTime.ts` podľa [specu](browser-timezone-date-formatting-spec.md) a postupne naň
prepojiť iba SAFE (A) callery a LOCAL USER INPUT (C) z [auditu](browser-timezone-date-formatting-audit.md).
Kategórie B, D, E a F sa nemenia. Tasky sú v [todo](browser-timezone-date-formatting-todo.md).
GitHub Issues sa nezakladajú: používateľ chce planning v `tasks/`.

## Architecture Decisions
- **Browser timezone implicitne:** `Intl.DateTimeFormat` bez `timeZone`. `timeZone` je iba pass-through pre testy, žiadna zóna sa nehardcoduje.
- **Striktný parse:** prijíma sa iba ISO date-time so `Z` alebo `±HH:MM`. Naive a date-only hodnoty idú na `—`, nie na UTC.
  Tým sa B nikdy omylom nekonvertuje.
- **Locale sa zachováva per caller:**
  - Access Logs: `language: 'sk'` a bodkový layout;
  - Users a PageShell: jazyk aplikácie;
  - History a Validate: `language: 'en'`;
  - Recovery Runs: bez `language`, teda browser default.
- **`datetime-local` → UTC ISO** cez `new Date(local).toISOString()` po validácii tvaru. Je to FE-interné, lebo Recovery Actions nemá API.
- **Malé commity:** jeden commit na task, explicitné cesty v `git add` / `git commit -- <paths>`, pretože working tree zdieľajú iné sessions.

## Dependency graph
```
T1 dateTime.ts + testy
 ├── T2 Access Logs
 ├── T3 UsersSection
 ├── T4 Recovery Runs
 └── T5 Recovery Actions display (History, Validate, PageShell, RecoveryPointSummary)
       └── T6 Recovery Actions datetime-local (Execute, Validate)
T7 audit report: finálne Action/outcome (po T2–T6)
```

## Task List

### Phase 1: Foundation
- [ ] T1: shared `dateTime.ts` + unit testy (S)

### Checkpoint 1
- [ ] unit testy zelené, `eslint` a `tsc -b` čisté, review API s človekom pred migráciami

### Phase 2: SAFE migrácie
- [ ] T2: Access Logs, odstrániť `Europe/Bratislava` (S)
- [ ] T3: UsersSection, odstrániť lokálnu duplicitu (S)
- [ ] T4: Recovery Runs `formatRunTimestamp` (S)

### Checkpoint 2
- [ ] focused testy T2–T4 zelené, výstupný formát ako predtým

### Phase 3: Recovery Actions
- [ ] T5: Recovery Actions display formattery (M)
- [ ] T6: Recovery Actions `datetime-local` (S)

### Checkpoint 3: Complete
- [ ] T7: audit report aktualizovaný na skutočný stav
- [ ] focused testy, `eslint` na zmenených súboroch, `tsc -b`
- [ ] grep diffu: žiadne pridané `Europe/` ani `±0X:00` v produkčnom kóde

## Súbory, ktoré plánujem meniť

| Task | Súbory |
|------|--------|
| T1 | `src/shared/utils/dateTime.ts` (new), `src/shared/utils/dateTime.test.ts` (new) |
| T2 | `src/features/platform-administration/audit/components/AccessLogsTable.tsx`, `AccessLogsTable.test.tsx` |
| T3 | `src/features/platform-administration/identity-access/components/UsersSection.tsx` (existujúci test pokrýva `createdAt` aj `activeSessionStart`) |
| T4 | `src/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun.ts`, `formatRecoveryRun.test.ts` (new) |
| T5 | `src/features/recovery-actions/pages/RecoveryActionsHistoryPage.tsx` (+ `.test.tsx`), `RecoveryActionsValidatePage.tsx`, `components/RecoveryActionsPageShell.tsx`, `components/RecoveryPointSummary.tsx`, `components/RecoveryPointSummary.test.tsx` (new) |
| T6 | `src/features/recovery-actions/pages/RecoveryActionsExecutePage.tsx`, `RecoveryActionsValidatePage.tsx`, `RecoveryActionsDateInput.test.tsx` (new) |
| T7 | `tasks/browser-timezone-date-formatting-audit.md`, `-todo.md` |

Nemenia sa: `src/generated/**`, `src/shared/utils/dateFormat.ts`, `discoveryCacheHistoryColumns.tsx`, mocky, schedule stránky, `src/features/dashboard-preview/**`.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Niektoré A pole v skutočnosti príde naive | Med: zobrazí sa `—` namiesto času | BE serializácia overená pre audit a users; Airflow vracia UTC. Fallback je viditeľný, nie potichu nesprávny |
| Testy závislé od TZ stroja | Med | unit testy s explicitným `timeZone`, komponentové testy cez `getHours()` alebo round-trip |
| Zmena výstupného formátu | Low | každý caller dostane svoje pôvodné Intl options a post-processing |
| Kolízia s inou session v rovnakom working tree | Med | commit iba explicitných ciest; `dashboard-preview` a untracked generated súbory sa nedotýkajú |
| `?raw` import `.ts` v teste | Low | `vite/client` typy sú v `tsconfig.app.json`; overí `tsc -b` v T1 |

## Open Questions (na schválenie)
1. **Recovery Actions `datetime-local`:** opraviť teraz ako FE-interné preview (odporúčam), alebo nechať ako follow-up do vzniku API?
2. **Locale:** zachovať `en-GB` v History a Validate a browser default v Recovery Runs (odporúčam, podľa zadania), alebo zjednotiť na jazyk aplikácie?
3. B a D otázky pre BE: pozri [audit](browser-timezone-date-formatting-audit.md#otvorené-otázky). Neblokujú tento plán.
