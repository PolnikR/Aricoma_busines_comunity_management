# Audit: časové údaje vo FE (`src/`)

Stav: audit pre [spec](browser-timezone-date-formatting-spec.md). Aktuálny task (T1–T6) je dokončený: stĺpec **Action** uvádza skutočný výsledok s commitom. Deferred follow-up (C) zostáva otvorený.

Rozsah: celý `src/` okrem Orval výstupu v `src/generated/` (tam sa iba overovalo, či sa pole používa).
Hľadané vzory:
- `new Date(`, `Date.parse`, `Date.now`, `Intl.DateTimeFormat`, `toLocale*String`, `toISOString`, `getTimezoneOffset`;
- `timeZone`, `Europe/`, `[+-]0X:00`;
- `datetime-local`, `type="time"`;
- regex a `replace('T', …)` nad timestampmi;
- všetky date-like polia v `openapi/abco-api.json`.

BE serializácia bola overená read-only v susednom repe `abco-be`.

| Kategória | Význam | Aktuálny task |
|-----------|--------|---------------|
| **A** SAFE ABSOLUTE INSTANT | hodnota má `Z` alebo `±HH:MM` | **implementovať teraz** |
| **B** AMBIGUOUS | timestamp bez timezone | bez zmeny |
| **C** LOCAL USER INPUT | wall-clock z inputu (`datetime-local`) | **DEFERRED FOLLOW-UP** |
| **D** WALL-CLOCK / SCHEDULE | business čas + explicitná zóna | bez zmeny |
| **E** DATE-ONLY | dátum bez času | bez zmeny |
| **F** DURATION | trvanie | bez zmeny |
| **N/A** | nie je server timestamp | bez zmeny |

**A znamená iba timestamp s explicitným `Z` alebo `±HH:MM` v samotnej hodnote.** Zaradenie zdroja do A je očakávanie
podľa dôkazov v stĺpci Field/source. Shared formatter ho overuje pri každej hodnote. Naive hodnota z ľubovoľného zdroja,
aj z Airflow, sa zobrazí ako `—` a nikdy sa nepovažuje za UTC.

## Klasifikácia

| File | Field/source | Baseline behavior (pred T1–T6) | Category | Action |
|------|--------------|------------------|----------|--------|
| `platform-administration/audit/components/AccessLogsTable.tsx` | `timestamp` (`+00:00`) | `Intl` `sk-SK` s natvrdo `timeZone: 'Europe/Bratislava'`, výstup `03.09.2026 10:25:29` | A | **migrated** (`fd09ce87`, test fix `33cddc58`): `formatDateTime(…, { language: 'sk', …rovnaké fields })`, zachovať bodkový layout |
| `platform-administration/identity-access/components/UsersSection.tsx` | `createdAt`, `activeSessionStart` (`+00:00`) | lokálne `dateLocale` + `formatUserTimestamp`, browser tz, app locale | A | **migrated** (`7b93426c`): `formatDateTime(…, { language })` |
| `recovery-plans/recovery-runs/helpers/formatRecoveryRun.ts` | Airflow `start_date` / `logical_date`: FE fixtures aj očakávaný Airflow REST kontrakt sú UTC-aware (`Z`). ABCO BE ich iba proxyuje bez normalizácie (`operations.py:27`). | `toLocaleString(undefined, …)`, browser tz, browser default locale. Naive hodnotu by dnes potichu brala ako lokálny čas. | A (podmienene, strict parse) | **migrated** (`3a482edb`): `formatRunTimestamp` deleguje na `formatDateTime` (bez `language`); signatúra sa nemení; naive vráti `—` |
| └ callery: `RecoveryRunsTable`, `RecoveryRunHistoryDrawer`, `RecoveryGroupsTable`, `RecoveryApplicationsTable`, (WIP) `dashboard-preview/RecoveryBlocks` | `startedAt` | cez `formatRunTimestamp` | A | bez zmeny v kóde; formátujú cez `formatRunTimestamp` (`3a482edb`) |
| `recovery-actions/pages/RecoveryActionsHistoryPage.tsx` | `startedAt` (mock, `+02:00`) | lokálna `formatDate`, `en-GB` natvrdo, browser tz | A | **migrated** (`989766af`): `formatDateTime(…, { language: 'en' })` |
| `recovery-actions/pages/RecoveryActionsValidatePage.tsx` | `latestAutomatedRun.startedAt` (mock, `+02:00`) | lokálna `formatDate` (duplicita), `en-GB` | A | **migrated** (`989766af`): rovnako ako vyššie; iba tento display, `datetime-local` v tom istom súbore sa nemení |
| `recovery-actions/components/RecoveryActionsPageShell.tsx` | detail `date` (= `startedAt`) | inline locale mapping + `Intl` (`day`, `month: 'short'`, `hour`, `minute`) | A | **migrated** (`989766af`): `formatDateTime(…, { language, …rovnaké fields })` |
| `recovery-actions/components/RecoveryPointSummary.tsx` | `snapshotAt` (mock, `+02:00`); `configurationAt` vždy z `datetime-local` + `+02:00` (renderuje sa iba v Execute a Validate) | surový string `replace('T', ' ')`, echo zadaného wall-clocku | C (preview lokálneho vstupu) | **DEFERRED FOLLOW-UP**: centralizácia by zmenila zobrazený čas preview (v zime 04:15 → 03:15), čo je zmena C |
| `recovery-actions/pages/RecoveryActionsExecutePage.tsx` | `datetime-local` `recoveryDate` | `` `${recoveryDate}:00+02:00` `` | C | **DEFERRED FOLLOW-UP**: known technical debt, bez zmeny |
| `recovery-actions/pages/RecoveryActionsValidatePage.tsx` | `datetime-local` `validationDate` | `` `${validationDate}:00+02:00` `` | C | **DEFERRED FOLLOW-UP**: known technical debt, bez zmeny |
| `recovery-actions/pages/RecoveryActionsExecutePage.tsx` | confirm dialóg `recoveryDate.replace('T', ' ')` | echo zadaného wall-clocku | C | bez zmeny |
| `discovery-inventory/discovery-settings/config/discoveryCacheHistoryColumns.tsx` | `CacheRunRecord.started_at` (`2026-08-30T10:20:30.167838`) | regex → `30. 8. 2026 10:20:30`, wall-clock ako prišiel | **B** | **bez zmeny**: BE clarification (nižšie) |
| `shared/utils/dateFormat.ts` `formatStartTime` ← `resources/components/BackingStorageInfo.tsx`, `resources/helpers/mapVmStorageVolumes.ts` | FlashCopy `start_time` (`260806161641`, timezone semantika neoverená) | regex → `Aug 6, 2026 16:16`, bez timezone konverzie | **B** | **bez zmeny**: overiť IBM semantiku (nižšie) |
| `discovery-inventory/infrastructure/model/flashSystemVolumeTreeTypes.ts`, `helpers/parseVolumeTreeNodes.ts` | FlashCopy `start_time`, `start_time_iso` (naive); CG `start_time` | iba parsované, nezobrazujú sa | B | bez zmeny |
| `generated/query/zod/metroMirrorConsistencyGroup.gen.ts` (untracked, iná session) | `freeze_time` | v `src/` sa nepoužíva | B | bez zmeny |
| `generated/query/zod` `VmRecord` | `boot_time` | v `src/` sa nepoužíva | B (formát neznámy) | bez zmeny |
| `recovery-plans/recovery-policies/application-recovery/*`, `shared/components/policy-set-picker/PolicySetPickerDetails.tsx` | `snapshot_target_time` (`HH:MM`, `<input type="time">`) | zobrazí sa a odošle as-is | D | bez zmeny (otvorená otázka 4) |
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
- **Current behavior:** `260806161641` → `Aug 6, 2026 16:16`. Číslice sa zobrazia tak, ako prišli, bez timezone konverzie; mená mesiacov sú natvrdo anglické.
- **Prečo ambiguous:** `start_time` je `YYMMDDHHMMSS` **bez timezone**. BE z neho robí naive `start_time_iso` (`topology.py:146`).
  Timezone semantika je **momentálne neoverená**. Nevieme bezpečne povedať, či ide o:
  - UTC,
  - lokálny čas poľa (array),
  - alebo inú storage semantiku.
- **Treba potvrdiť** (BE / storage tím), jedným z dvoch zdrojov:
  - IBM dokumentácia k FlashCopy mapping `start_time`;
  - live konfigurácia alebo response konkrétneho poľa, napr. porovnať `start_time` známeho mappingu s reálnym UTC časom jeho spustenia.
- **Kým to nie je potvrdené:** FE správanie ostáva bez timezone konverzie a bez akéhokoľvek UTC predpokladu.

## C: deferred follow-up `datetime-local`

Detailný popis je v [spec §6](browser-timezone-date-formatting-spec.md#6-deferred-follow-up-datetime-local-kategória-c).

- **Problem:** `datetime-local` je lokálny wall-clock bez timezone. `` `${…}:00+02:00` `` je kvôli DST nesprávne.
- **Spring-forward:** `2026-03-29T02:30 Europe/Bratislava` neexistuje.
- **Fall-back:** `2026-10-25T02:30 Europe/Bratislava` existuje dvakrát (`00:30Z` aj `01:30Z`).
- **Required future decision:** výber timezone používateľom, vyžiadanie offsetu pri ambiguous čase, explicitná business timezone,
  alebo API s local datetime + IANA zónou, či s resolved UTC instantom.
- **Do rozhodnutia:** Execute, Validate (input) a `RecoveryPointSummary` zostávajú bez zmeny. Fixed `+02:00` je known technical debt.

## Otvorené otázky
1. Discovery Cache `started_at`: TZ BE kontajnera a možnosť prejsť na UTC-aware ISO.
2. FlashCopy `start_time`: neoverená timezone semantika (UTC, čas poľa, alebo iné). Potvrdiť z IBM dokumentácie alebo z live poľa.
3. Airflow `start_date` / `logical_date`: ABCO BE ich nenormalizuje. Má sa BE zaviazať k UTC-aware výstupu, alebo zostáva FE strict parse jedinou poistkou?
4. `snapshot_target_time` (`HH:MM`): v akej timezone ho orchestrátor vyhodnocuje? Dnes je to holý wall-clock bez zóny.
5. Follow-up k locale (mimo scope, správanie sa zachová): History a Validate majú `en-GB` natvrdo, `formatRunTimestamp` používa browser default locale namiesto jazyka aplikácie.
6. `datetime-local` (C): UX/API rozhodnutie zo sekcie vyššie. Blokuje deferred follow-up, nie aktuálny task.
