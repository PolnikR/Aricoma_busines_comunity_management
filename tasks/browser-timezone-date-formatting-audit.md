# Audit: časové údaje vo FE (`src/`)

Stav: read-only audit pre [spec](browser-timezone-date-formatting-spec.md). Stĺpec **Action** je plán, nie hotová zmena.

Rozsah: celý `src/` okrem Orval výstupu v `src/generated/` (tam sa iba overovalo, či sa pole používa).
Hľadané vzory:
- `new Date(`, `Date.parse`, `Date.now`, `Intl.DateTimeFormat`, `toLocale*String`, `toISOString`, `getTimezoneOffset`;
- `timeZone`, `Europe/`, `[+-]0X:00`;
- `datetime-local`, `type="time"`;
- regex a `replace('T', …)` nad timestampmi;
- všetky date-like polia v `openapi/abco-api.json`.

BE serializácia bola overená read-only v susednom repe `abco-be`.

Kategórie: **A** SAFE absolute instant · **B** AMBIGUOUS · **C** LOCAL USER INPUT · **D** WALL-CLOCK / SCHEDULE · **E** DATE-ONLY · **F** DURATION · **N/A** nie je server timestamp.

## Klasifikácia

| File | Field/source | Current behavior | Category | Action |
|------|--------------|------------------|----------|--------|
| `platform-administration/audit/components/AccessLogsTable.tsx` | `timestamp` (`+00:00`) | `Intl` `sk-SK` s natvrdo `timeZone: 'Europe/Bratislava'`, výstup `03.09.2026 10:25:29` | A | **migrate**: `formatDateTime(…, { language: 'sk', …rovnaké fields })`, zachovať bodkový layout |
| `platform-administration/identity-access/components/UsersSection.tsx` | `createdAt`, `activeSessionStart` (`+00:00`) | lokálne `dateLocale` + `formatUserTimestamp`, browser tz, app locale | A | **centralize**: `formatDateTime(…, { language })` |
| `recovery-plans/recovery-runs/helpers/formatRecoveryRun.ts` | Airflow `start_date` / `logical_date` (`Z`) | `toLocaleString(undefined, …)`, browser tz, browser default locale | A | **centralize**: `formatRunTimestamp` deleguje na `formatDateTime` (bez `language`); signatúra sa nemení |
| └ callery: `RecoveryRunsTable`, `RecoveryRunHistoryDrawer`, `RecoveryGroupsTable`, `RecoveryApplicationsTable`, (WIP) `dashboard-preview/RecoveryBlocks` | `startedAt` | cez `formatRunTimestamp` | A | bez zmeny, zlepšia sa automaticky |
| `recovery-actions/pages/RecoveryActionsHistoryPage.tsx` | `startedAt` (mock, `+02:00`) | lokálna `formatDate`, `en-GB` natvrdo, browser tz | A | **centralize**: `formatDateTime(…, { language: 'en' })` |
| `recovery-actions/pages/RecoveryActionsValidatePage.tsx` | `latestAutomatedRun.startedAt` (mock) | lokálna `formatDate` (duplicita), `en-GB` | A | **centralize**: rovnako ako vyššie |
| `recovery-actions/components/RecoveryActionsPageShell.tsx` | detail `date` (= `startedAt`) | inline locale mapping + `Intl` (`day`, `month: 'short'`, `hour`, `minute`) | A | **centralize**: `formatDateTime(…, { language, …rovnaké fields })` |
| `recovery-actions/components/RecoveryPointSummary.tsx` | `configurationAt`, `snapshotAt` (mock, `+02:00`) | surový string `replace('T', ' ')`, zobrazuje wall-clock `+02:00` | A | **migrate**: `formatDateTime(…, { language })` (nutné aj pre C) |
| `recovery-actions/pages/RecoveryActionsExecutePage.tsx` | `datetime-local` `recoveryDate` | `` `${recoveryDate}:00+02:00` `` | C | **fix**: `localDateTimeInputToUtcIso`; žiadne API, iba preview |
| `recovery-actions/pages/RecoveryActionsValidatePage.tsx` | `datetime-local` `validationDate` | `` `${validationDate}:00+02:00` `` | C | **fix**: rovnako |
| `recovery-actions/pages/RecoveryActionsExecutePage.tsx` | confirm dialóg `recoveryDate.replace('T', ' ')` | echo zadaného wall-clocku | C | bez zmeny (správne) |
| `discovery-inventory/discovery-settings/config/discoveryCacheHistoryColumns.tsx` | `CacheRunRecord.started_at` (`2026-08-30T10:20:30.167838`) | regex → `30. 8. 2026 10:20:30`, wall-clock ako prišiel | **B** | **bez zmeny**: BE clarification (nižšie) |
| `shared/utils/dateFormat.ts` `formatStartTime` ← `resources/components/BackingStorageInfo.tsx`, `resources/helpers/mapVmStorageVolumes.ts` | FlashCopy `start_time` (`260806161641`) | regex → `Aug 6, 2026 16:16` | **B** | **bez zmeny**: overiť IBM semantiku (nižšie) |
| `discovery-inventory/infrastructure/model/flashSystemVolumeTreeTypes.ts`, `helpers/parseVolumeTreeNodes.ts` | FlashCopy `start_time`, `start_time_iso` (naive); CG `start_time` | iba parsované, nezobrazujú sa | B | bez zmeny |
| `generated/query/zod/metroMirrorConsistencyGroup.gen.ts` (untracked, iná session) | `freeze_time` | v `src/` sa nepoužíva | B | bez zmeny |
| `generated/query/zod` `VmRecord` | `boot_time` | v `src/` sa nepoužíva | B (formát neznámy) | bez zmeny |
| `recovery-plans/recovery-policies/application-recovery/*`, `shared/components/policy-set-picker/PolicySetPickerDetails.tsx` | `snapshot_target_time` (`HH:MM`, `<input type="time">`) | zobrazí sa a odošle as-is | D | bez zmeny (otvorená otázka 3) |
| `recovery-actions/pages/RecoveryActionsSchedulePage.tsx`, `recovery-actions/mocks` | schedule `time` + `timezone` `Europe/Bratislava (UTC+02:00)` | explicitná business zóna (mock) | D | bez zmeny zámerne |
| `discovery-inventory/discovery-settings/components/DiscoveryScheduleCard.tsx`, `discovery-settings/mocks` | schedule `timezone` | explicitná business zóna (mock) | D | bez zmeny zámerne |
| `platform-administration/identity-access/services/mockIdentityAdminGateway.ts` | `lastLoginLabel` (`'23 Aug 2026'`) | predformátovaný mock label | E | bez zmeny |
| `recovery-plans/recovery-runs/helpers/formatRecoveryRun.ts` `formatRunDuration` | `durationSeconds` | `Xm Ys` | F | bez zmeny (samostatne) |
| `platform-administration/audit/components/AccessLogsTable.tsx` `formatDuration` | `durationMs` | ms / s | F | bez zmeny |
| `discovery-settings/config/discoveryCacheHistoryColumns.tsx` | `duration_ms` | `N ms` | F | bez zmeny |
| `recovery-actions/mocks/recoveryActionsMocks.ts` | `duration` (`'11m 46s'`) | mock string | F | bez zmeny |
| `recovery-actions/mocks/recoveryActionsMocks.ts`, `dashboard-preview/model/mockDashboardData.ts` | mock timestampy s `+02:00` | fixture dáta s explicitným offsetom | A (mock) | bez zmeny (dáta, nie logika) |
| `platform-administration/identity-access/services/mockIdentityService.ts` | `Date` objekty relatívne k `now` | mock fixtures | N/A | bez zmeny |
| `platform-administration/audit/components/AccessLogsTable.tsx` | React Query `dataUpdatedAt` | iba kľúč selekcie | N/A | bez zmeny |
| `SourceInventoryMetrics`, `VirtualMachineMetrics`, `DatastoreNode`, `powerColumns`, `parseCapacity` | `number.toLocaleString()` | formátovanie čísel | N/A | bez zmeny |

## B: detaily a čo treba potvrdiť

### Discovery Cache History: `started_at`
- **Source:** `GET` cache history → `CacheRunRecord.started_at` (OpenAPI: `string`, bez `format`).
- **Current behavior:** `formatStartedAt` iba regexom preusporiada čísla. Zobrazí sa wall-clock tak, ako prišiel. Ak by prišiel offset, regex ho zahodí.
- **Prečo ambiguous:** BE `discovery_cache/service.py:42` používa naive `datetime.now()`.
  Hodnota je v lokálnom čase **BE hostu alebo kontajnera**, ktorý FE nepozná. Predpoklad UTC by bol nesprávny pri každom kontajneri mimo UTC.
- **Treba od BE:**
  1. V akej TZ beží BE kontajner v prod a test prostredí?
  2. Môže BE posielať `datetime.now(timezone.utc).isoformat()`?
  3. Čo s historickými naive záznamami?
- Potom stačí jednoriadková zmena na `formatDateTime`.

### FlashCopy `start_time`
- **Source:** FlashSystem mapping `start_time` → `mapVmStorageVolumes` → `BackingStorageInfo` (`formatStartTime`).
- **Current behavior:** `260806161641` → `Aug 6, 2026 16:16`. Je to wall-clock poľa, anglické mená mesiacov natvrdo.
- **Prečo ambiguous:** `YYMMDDHHMMSS` nemá zónu. Pole hlási čas podľa svojho systémového času a nastavenej timezone,
  ktorá nemusí byť UTC (overiť napr. `lssystem` → `time_zone`). BE z neho robí naive `start_time_iso`.
- **Treba od BE / storage tímu:** Bežia polia v UTC? Ak nie, vie BE pomocou `time_zone` poľa vrátiť aware ISO?

## Otvorené otázky
1. Discovery Cache `started_at`: TZ BE kontajnera a možnosť prejsť na UTC-aware ISO.
2. FlashCopy `start_time`: timezone FlashSystem polí.
3. `snapshot_target_time` (`HH:MM`): v akej timezone ho orchestrátor vyhodnocuje? Dnes je to holý wall-clock bez zóny.
4. Follow-up k locale (mimo scope, správanie sa zachová): History a Validate majú `en-GB` natvrdo, `formatRunTimestamp` používa browser default locale namiesto jazyka aplikácie.
