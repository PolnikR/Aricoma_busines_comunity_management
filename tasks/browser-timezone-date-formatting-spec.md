# Spec: zobrazovanie časov v timezone browser session

Stav: **návrh na review, nič nie je implementované.** Baseline je `89423dac` na vetve `spike/ant-design-shell`.
Klasifikácia všetkých nálezov je v [browser-timezone-date-formatting-audit.md](browser-timezone-date-formatting-audit.md),
poradie práce v [browser-timezone-date-formatting-plan.md](browser-timezone-date-formatting-plan.md) a
[browser-timezone-date-formatting-todo.md](browser-timezone-date-formatting-todo.md).

## 1. Problém

- Formátovanie timestampov je rozkopírované v 6 súboroch, každý s vlastnou locale/fallback logikou.
- `AccessLogsTable.tsx` má natvrdo `timeZone: 'Europe/Bratislava'`, takže používateľ v inej timezone vidí čas Bratislavy.
- Recovery Actions skladá `datetime-local` hodnotu ako `${date}:00+02:00`. V zime (CET, `+01:00`) je to o hodinu zle.
- `RecoveryPointSummary` zobrazuje surový string (`2026-08-11 04:15:00+02:00`), teda wall-clock offsetu, nie browsera.

## 2. Cieľ

```
server  ──►  `…Z` / `…±HH:MM`  ──►  shared formatter  ──►  Intl.DateTimeFormat bez timeZone  ──►  browser timezone
2026-10-06T07:41:00Z                                                                   Europe/Bratislava → 09:41
                                                                                       Europe/London     → 08:41
```

## 3. Non-goals

- Žiadna zmena BE ani ručná zmena Orval súborov v `src/generated/`.
- Žiadne pravidlo „naive timestamp = UTC“. Naive hodnoty (kategória B) zostávajú bez zmeny, kým BE nepotvrdí semantiku.
- Žiadna zmena business schedule timezone (kategória D).
- Žiadna zmena locale správania: kde dnes je `en-GB` natvrdo alebo browser default locale, zostáva to tak (iba follow-up).
- Žiadny zásah do untracked `src/features/dashboard-preview/` (WIP inej session). Volá `formatRunTimestamp`, takže jeho signatúra zostáva rovnaká.

## 4. Overené predpoklady (read-only)

| # | Fakt | Dôkaz |
|---|------|-------|
| 1 | Audit `timestamp` je UTC-aware (`+00:00`) | BE `api/request_logging.py:96` `datetime.now(timezone.utc).isoformat()` |
| 2 | Users `createdAt`, `activeSessionStart` sú UTC-aware | BE `api/routers/identity.py:74` `fromtimestamp(…, tz=timezone.utc).isoformat()` |
| 3 | Airflow `start_date` / `logical_date`: FE fixtures aj očakávaný Airflow REST kontrakt používajú UTC-aware timestampy. ABCO BE ich iba proxyuje a **nenormalizuje**, takže skutočný tvar hodnoty garantuje iba Airflow, nie ABCO. | FE fixtures `mapOrchestratorRuns.test.ts`; BE `api/routers/operations.py:27` (`client.list_dag_runs`), `api/schemas.py:324` („Airflow's own GET /dagRuns response“) |
| 4 | Discovery Cache `started_at` je **naive, v lokálnom čase BE hostu** | BE `discovery_cache/service.py:42` `datetime.now()` |
| 5 | FlashCopy `start_time` je `YYMMDDHHMMSS` bez zóny; BE z neho robí naive `start_time_iso`. Timezone semantika je **neoverená**. | BE `ibm_flashsystem/topology.py:146` |
| 6 | Recovery Actions nemá API, všetko sú mocky | `recovery-actions/mocks/recoveryActionsMocks.ts`, žiadny mutation hook |
| 7 | OpenAPI nemá pri žiadnom poli `format: date-time` | `openapi/abco-api.json` |
| 8 | Test prostredie nemá fixnú TZ. Premenná `TZ` nie je spoľahlivá stratégia (Windows), preto sa nepoužíva. | `vitest.config.ts` |

**SAFE (A) sa posudzuje per hodnota, nie per zdroj.** Klasifikácia zdroja v audite je iba očakávanie.
`parseTimestamp` pri každej hodnote vynucuje explicitné `Z` alebo `±HH:MM`. Žiadny zdroj vrátane Airflow nemá výnimku:
ak príde naive hodnota, zobrazí sa `—` a nikdy sa nepovažuje za UTC.

## 5. Shared modul `src/shared/utils/dateTime.ts`

```ts
export const DATE_FALLBACK = '—'
export type DateTimeInput = string | Date | null | undefined
export interface DateTimeFormatOptions extends Intl.DateTimeFormatOptions {
  language?: string            // 'sk' | 'cs' | 'en'; vynechané → browser default locale
}

getBrowserTimeZone(): string                         // Intl.DateTimeFormat().resolvedOptions().timeZone
toDateLocale(language?: string): string | undefined  // sk→sk-SK, cs→cs-CZ, inak en-GB, undefined→undefined
hasExplicitTimeZone(value: string): boolean          // ISO date-time s `Z` alebo `±HH:MM`
parseTimestamp(value: DateTimeInput): Date | null    // iba explicitná zóna; naive / date-only / invalid → null
formatDateTime(value, options?): string              // default { dateStyle: 'medium', timeStyle: 'short' }
formatDate(value, options?): string                  // default { dateStyle: 'medium' }
formatTime(value, options?): string                  // default { timeStyle: 'short' }
localDateTimeInputToUtcIso(value: string, calendar?: LocalCalendar): string | null   // datetime-local → `…Z`, inak null (§6)

// interné, exportované kvôli testom (§6)
interface WallClock { year: number; month: number; day: number; hour: number; minute: number; second: number }
interface LocalCalendar {
  toDate(value: string): Date          // default: new Date(value), teda lokálny čas browsera
  wallClock(date: Date): WallClock     // default: getFullYear(), getMonth() + 1, getDate(), getHours(), …
}
```

Pravidlá:
- Formatter **neposiela `timeZone`**, takže Intl použije browser timezone a DST rieši IANA databáza.
  `timeZone` je iba pass-through Intl option a používajú ho len testy.
- Ak caller pošle field options (`day`, `hour`, …), defaultné `dateStyle`/`timeStyle` sa nepridajú, lebo Intl ich nedovolí kombinovať.
- `parseTimestamp` odmieta date-only `YYYY-MM-DD`, pretože `new Date('2026-10-06')` je v JS UTC polnoc (kategória E).
- Pre samotné date-only hodnoty sa nič nepridáva: v `src/` sa žiadne date-only API pole nenašlo.

## 6. `datetime-local` (kategória C)

Správna konverzia:

```
'2026-12-11T04:15'  (wall-clock z inputu, bez zóny)
   │  new Date(value)  ← ECMAScript: date-time bez offsetu = lokálny čas browsera (vrátane DST)
   ▼
Date (instant)
   │  .toISOString()
   ▼
'2026-12-11T03:15:00.000Z'  (jednoznačný UTC timestamp pre API)
```

Toto platí iba pre **existujúci** lokálny wall-clock. Pri DST prechode (napr. `2026-03-29T02:30` v `Europe/Bratislava`
počas spring-forward 02:00 → 03:00) taký čas neexistuje. `new Date` ho potichu posunie, napr. na 03:30 CEST,
a `toISOString()` by vrátil iný čas, než používateľ zadal.

DST-safe algoritmus `localDateTimeInputToUtcIso(value, calendar = browserCalendar)`:

1. Validovať presný tvar `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$`. Iný tvar vráti `null`.
2. `date = calendar.toDate(value)` (v produkcii `new Date(value)`).
3. Ak `Number.isNaN(date.getTime())`, vrátiť `null`.
4. Porovnať `calendar.wallClock(date)` s komponentmi inputu (year, month, day, hour, minute, second; chýbajúce sekundy = 0).
5. Ak sa líšia, JS hodnotu normalizoval a vráti sa `null`. Patrí sem DST gap aj neplatný dátum typu `2026-02-30T10:00`.
6. Iba pri presnom round-tripe vrátiť `date.toISOString()`.

Poznámky:
- **Fall-back (zopakovaná hodina,** napr. `2026-10-25T02:30` v Bratislave): round-trip prejde. ECMAScript zvolí skorší
  offset (CEST), čo je akceptované správanie; nijako sa neupravuje.
- **`null` v UI:** preview `RecoveryPointSummary` zobrazí `—`. Nová validačná hláška nie je v scope; ak bude potrebná, je to follow-up.
- **Prečo `LocalCalendar`:** produkcia používa iba browser (`new Date` + lokálne gettery).
  Testy podstrčia kalendár pre explicitnú zónu, takže DST gap je testovateľný bez závislosti od OS/CI timezone (§7).

- **API kontrakt neexistuje:** Recovery Actions je mock-only a hodnota ide iba do `RecoveryPointSummary` preview.
  Oprava je teda FE-interná a bezpečná, ale `RecoveryPointSummary` musí súčasne prejsť na `formatDateTime`.
  Inak by sa zobrazil surový `…Z`.
- Keď vznikne reálny Recovery Actions endpoint, treba s BE potvrdiť, že prijíma UTC ISO (follow-up).

## 7. Testovacia stratégia

**Princíp:** žiadny test nesmie závisieť od OS timezone, CI timezone ani od premennej `TZ`.
Timezone konverziu dokazujú výlučne testy s explicitnou zónou: `timeZone` option v `Intl.DateTimeFormat`
alebo injektovaný `LocalCalendar`. Krok typu „spustiť testy s `TZ=UTC`“ sa nepoužíva.

- **Unit `dateTime.test.ts` (node), formatter:**
  - `Z` aj offset dávajú rovnaký instant;
  - `formatTime` s explicitným `timeZone` dá `Europe/Bratislava` 09:41 a `Europe/London` 08:41;
  - DST: decembrový instant v Bratislave dá 08:41;
  - fallback pre null, undefined, `''`, invalid a naive hodnoty, vrátane naive Airflow-like `2026-08-18T09:46:40`;
  - locale mapping sk/cs/en (porovnanie s `Intl` pre rovnaké locale a explicitný `timeZone: 'UTC'`);
  - zdroj modulu (import `?raw`) neobsahuje `Europe/` ani `±0X:00`.
- **Unit `dateTime.test.ts`, `localDateTimeInputToUtcIso` s injektovaným kalendárom pre `Europe/Bratislava`:**
  - `wallClock` cez `Intl.DateTimeFormat(…, { timeZone: 'Europe/Bratislava', hourCycle: 'h23' }).formatToParts`;
  - `toDate` simuluje parse browsera v tejto zóne s pevným offsetom pre daný prípad;
  - leto: `2026-08-11T04:15` s `toDate` `+02:00` vráti `2026-08-11T02:15:00.000Z`;
  - zima: `2026-12-11T04:15` s `toDate` `+01:00` vráti `2026-12-11T03:15:00.000Z`;
  - DST gap: `2026-03-29T02:30` s `toDate` `+01:00` (offset pred prechodom, ako ECMAScript) vráti `null`, lebo wall-clock je 03:30;
  - invalid: `''`, `2026-08-11`, `2026-08-11T04:15:00Z`, `2026-02-30T10:00` vrátia `null`.
- **Invariantné testy s default kalendárom:**
  - assertion platí pre ľubovoľnú host TZ, preto nezávisí od OS timezone;
  - `formatDateTime(v)` sa rovná `formatDateTime(v, { timeZone: getBrowserTimeZone() })`;
  - `localDateTimeInputToUtcIso('2026-08-11T04:15')` a `'2026-12-11T04:15'` sa round-tripnú na rovnaký wall-clock. Dátumy sú zvolené mimo bežných DST prechodov (marec, apríl, september až november).
- **Komponentové testy:**
  - overujú iba wiring, nie konverziu;
  - očakávaná hodnota je invariant voči host TZ: buď z rovnakého formattera, z `new Date(ts).getHours()`, alebo z round-tripu `datetime-local`. Nikdy nie natvrdo „10:25“;
  - existujúci test Access Logs s natvrdo zadaným `10:25:29` sa upraví;
  - každý migrovaný caller dostane aspoň jednu assertion, ktorá prejde formatterom.
- **Spúšťanie:** iba focused súbory (`npm exec vitest run <files>`), `eslint` na zmenených súboroch, `tsc -b`. Full suite ani build sa nespúšťajú.

## 8. Success criteria

1. V produkčnom kóde `src/` (mimo mockov a schedule options) nie je `timeZone: 'Europe/…'` ani `+02:00`.
2. Všetky SAFE (A) callery idú cez `dateTime.ts` a ich výstupný formát je rovnaký ako dnes, okrem timezone.
3. Kategórie B, D, E a F majú nezmenené správanie a sú zdokumentované v audite.
4. Focused testy, lint a typecheck prechádzajú; každý commit je malý a obsahuje iba vlastné súbory.
