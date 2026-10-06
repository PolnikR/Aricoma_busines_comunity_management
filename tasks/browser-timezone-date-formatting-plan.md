# Implementation Plan: zobrazovanie časov v timezone browser session

## Overview
Vytvoriť `src/shared/utils/dateTime.ts` podľa [specu](browser-timezone-date-formatting-spec.md). Naň sa prepoja iba
SAFE (A) display callery z [auditu](browser-timezone-date-formatting-audit.md).
Kategórie B, C, D, E a F sa nemenia. LOCAL USER INPUT (`datetime-local`) je **deferred follow-up** ([spec §6](browser-timezone-date-formatting-spec.md#6-deferred-follow-up-datetime-local-kategória-c)).
Tasky sú v [todo](browser-timezone-date-formatting-todo.md). GitHub Issues sa nezakladajú: používateľ chce planning v `tasks/`.

## Architecture Decisions
- **Browser timezone implicitne:** `Intl.DateTimeFormat` bez `timeZone`. `timeZone` je iba pass-through pre testy, žiadna zóna sa nehardcoduje.
- **Striktný parse per hodnota:** prijíma sa iba ISO date-time so `Z` alebo `±HH:MM`. Naive a date-only hodnoty idú na `—`, nie na UTC.
  Tým sa B nikdy omylom nekonvertuje. Žiadny zdroj nemá výnimku. Airflow `start_date` je UTC-aware podľa fixtures a Airflow kontraktu,
  ale ABCO BE ho iba proxyuje bez normalizácie, preto aj preň platí strict parse.
- **Iba display:** shared modul nemá žiadny helper na konverziu lokálneho vstupu na UTC.
  `datetime-local` vyžaduje UX/API rozhodnutie pre spring-forward a fall-back (spec §6), preto je deferred.
- **`RecoveryPointSummary` je deferred spolu s C:** renderuje sa iba v Execute a Validate. Jeho `configurationAt` vždy pochádza
  z `datetime-local` + `+02:00`, takže centralizácia by zmenila zobrazený čas preview.
- **Locale sa zachováva per caller:**
  - Access Logs: `language: 'sk'` a bodkový layout;
  - Users a PageShell: jazyk aplikácie;
  - History a Validate (latest run): `language: 'en'`;
  - Recovery Runs: bez `language`, teda browser default.
- **Testy bez závislosti od OS/CI timezone a `TZ`:**
  - konverziu dokazujú iba unit testy s explicitným `timeZone` v `Intl`;
  - komponentové testy overujú iba wiring cez invariantné assertions;
  - spúšťanie s `TZ=…` sa nepoužíva.
- **Malé commity:** jeden commit na task, explicitné cesty v `git add` / `git commit -- <paths>`, pretože working tree zdieľajú iné sessions.

## Dependency graph
```
T1 dateTime.ts + tests
 ├── T2 Access Logs
 ├── T3 UsersSection
 ├── T4 Recovery Runs
 └── T5 Recovery Actions SAFE display (History, Validate latest run, PageShell)

T6 audit report / closure (po T2–T5)
```
`datetime-local` (a `RecoveryPointSummary`) nie je dependency aktuálneho tasku.

## Task List

### Phase 1: Foundation
- [x] T1: shared `dateTime.ts` + unit testy (S)

### Checkpoint 1
- [x] unit testy zelené, `eslint` a `tsc -b` čisté, review API s človekom pred migráciami

### Phase 2: SAFE migrácie
- [x] T2: Access Logs, odstrániť `Europe/Bratislava` (S)
- [x] T3: UsersSection, odstrániť lokálnu duplicitu (XS)
- [x] T4: Recovery Runs `formatRunTimestamp` (S)

### Checkpoint 2
- [x] focused testy T2–T4 zelené, výstupný formát ako predtým

### Phase 3: Recovery Actions SAFE display
- [x] T5: Recovery Actions SAFE display formattery (M)

### Checkpoint 3: Complete
- [x] T6: audit report a uzavretie
- [x] focused testy, `eslint` na zmenených súboroch, `tsc -b`
- [x] grep diffu: žiadne pridané `Europe/` ani `±0X:00` v produkčnom kóde
- [x] `datetime-local` a `RecoveryPointSummary` sú nezmenené

### Deferred follow-up (mimo aktuálneho tasku)
- `datetime-local` v Execute a Validate, `RecoveryPointSummary` preview a fixed `+02:00`. Čaká na UX/API rozhodnutie (spec §6, audit otázka 6).

## Súbory, ktoré plánujem meniť

| Task | Súbory |
|------|--------|
| T1 | `src/shared/utils/dateTime.ts` (new), `src/shared/utils/dateTime.test.ts` (new) |
| T2 | `src/features/platform-administration/audit/components/AccessLogsTable.tsx`, `AccessLogsTable.test.tsx` |
| T3 | `src/features/platform-administration/identity-access/components/UsersSection.tsx` (existujúci test pokrýva `createdAt` aj `activeSessionStart`) |
| T4 | `src/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun.ts`, `formatRecoveryRun.test.ts` (new) |
| T5 | `src/features/recovery-actions/pages/RecoveryActionsHistoryPage.tsx` (+ `.test.tsx`), `RecoveryActionsValidatePage.tsx` (iba `formatDate` pre `latestAutomatedRun.startedAt`), `components/RecoveryActionsPageShell.tsx` (+ `.test.tsx`) |
| T6 | `tasks/browser-timezone-date-formatting-audit.md`, `-todo.md` |

Nemenia sa:
- `src/generated/**`, `src/shared/utils/dateFormat.ts`, `discoveryCacheHistoryColumns.tsx`, mocky, schedule stránky, `src/features/dashboard-preview/**`;
- `RecoveryActionsExecutePage.tsx`, `datetime-local` časť `RecoveryActionsValidatePage.tsx`, `RecoveryPointSummary.tsx`. Patria do deferred follow-up.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Niektoré A pole v skutočnosti príde naive | Med: zobrazí sa `—` namiesto času | BE serializácia overená v kóde pre audit a users. Airflow overený iba cez fixtures a kontrakt, ABCO BE ho nenormalizuje. Fallback je viditeľný, nie potichu nesprávny (audit, otvorená otázka 3) |
| Testy závislé od TZ stroja | Med | explicitný `timeZone` v `Intl`; žiadne `TZ=…`; komponentové testy iba invariantné |
| Fixed `+02:00` v `datetime-local` zostáva | Med: v zime je preview offset o hodinu zle | vedome mimo scope, zdokumentované ako known technical debt (spec §6); nesmie sa vykazovať ako vyriešené |
| Zmena výstupného formátu | Low | každý caller dostane svoje pôvodné Intl options a post-processing |
| Kolízia s inou session v rovnakom working tree | Med | commit iba explicitných ciest; `dashboard-preview` a untracked generated súbory sa nedotýkajú |
| `?raw` import `.ts` v teste | Low | `vite/client` typy sú v `tsconfig.app.json`; overí `tsc -b` v T1 |

## Open Questions
1. **`RecoveryPointSummary`, rozhodnuté:** zostáva v deferred follow-up a nemení sa.
2. **Locale, rozhodnuté:** bez zmeny. Access Logs `sk`, Users a PageShell jazyk aplikácie, History a Validate `en`, Recovery Runs browser default.
3. **Otvorené:** B a D otázky pre BE, vrátane Airflow normalizácie a neoverenej FlashSystem semantiky, a UX/API rozhodnutie pre `datetime-local`:
   pozri [audit](browser-timezone-date-formatting-audit.md#otvorené-otázky). Neblokujú tento plán.
