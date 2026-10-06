# Spec: zobrazovanie časov v timezone browser session

Stav: **návrh na review, nič nie je implementované.** Baseline je `89423dac` na vetve `spike/ant-design-shell`.
Klasifikácia všetkých nálezov je v [browser-timezone-date-formatting-audit.md](browser-timezone-date-formatting-audit.md),
poradie práce v [browser-timezone-date-formatting-plan.md](browser-timezone-date-formatting-plan.md) a
[browser-timezone-date-formatting-todo.md](browser-timezone-date-formatting-todo.md).

**Aktuálny scope:**
- jeden centralizovaný formatter pre zobrazovanie SAFE (A) absolute timestampov v browser timezone;
- migrácia existujúcich SAFE display callerov.

AMBIGUOUS (B) a LOCAL USER INPUT (C) zostávajú nedotknuté. `datetime-local` je **deferred follow-up** (§6).

## 1. Problém

- Formátovanie timestampov je rozkopírované na viacerých miestach vo FE, každé s vlastnou locale/fallback logikou.
- `AccessLogsTable.tsx` má natvrdo `timeZone: 'Europe/Bratislava'`, takže používateľ v inej timezone vidí čas Bratislavy.
- *(mimo aktuálneho scope, §6)* Recovery Actions skladá `datetime-local` hodnotu ako `${date}:00+02:00`, čo je kvôli DST nesprávne.
  Jej preview `RecoveryPointSummary` zobrazuje surový string. Oboje zostáva známy technical debt.

## 2. Cieľ

```
server  ──►  `…Z` / `…±HH:MM`  ──►  shared formatter  ──►  Intl.DateTimeFormat bez timeZone  ──►  browser timezone
2026-10-06T07:41:00Z                                                                   Europe/Bratislava → 09:41
                                                                                       Europe/London     → 08:41
```

## 3. Non-goals

- Žiadna zmena BE ani ručná zmena Orval súborov v `src/generated/`.
- Žiadne pravidlo „naive timestamp = UTC“. Naive hodnoty (kategória B) zostávajú bez zmeny, kým BE nepotvrdí semantiku.
- Žiadna zmena LOCAL USER INPUT (kategória C): `datetime-local`, `${…}:00+02:00` ani `RecoveryPointSummary` preview. Je to deferred follow-up (§6).
- Žiadny shared helper na konverziu lokálneho vstupu na UTC.
- Žiadna zmena business schedule timezone (kategória D), date-only (E) ani duration (F).
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
| 6 | Recovery Actions nemá API, všetko sú mocky. `RecoveryPointSummary` sa renderuje iba v Execute a Validate a jeho `configurationAt` vždy pochádza z `datetime-local` + `+02:00`. | `recovery-actions/mocks/recoveryActionsMocks.ts`; `RecoveryActionsExecutePage.tsx:67`, `RecoveryActionsValidatePage.tsx:90` |
| 7 | OpenAPI nemá pri žiadnom poli `format: date-time` | `openapi/abco-api.json` |
| 8 | Test prostredie nemá fixnú TZ. Premenná `TZ` nie je spoľahlivá stratégia (Windows), preto sa nepoužíva. | `vitest.config.ts` |

**SAFE (A) sa posudzuje per hodnota, nie per zdroj.** Klasifikácia zdroja v audite je iba očakávanie.
`parseTimestamp` pri každej hodnote vynucuje explicitné `Z` alebo `±HH:MM`. Žiadny zdroj vrátane Airflow nemá výnimku:
ak príde naive hodnota, zobrazí sa `—` a nikdy sa nepovažuje za UTC.

## 5. Shared modul `src/shared/utils/dateTime.ts`

Modul rieši **iba display formatting SAFE timestampov**.

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
```

Správanie pre vstupy:

| Vstup | Výsledok |
|-------|----------|
| `2026-10-06T07:41:00Z`, `2026-10-06T07:41:00+00:00`, `…+02:00` | instant v browser timezone |
| naive `2026-08-18T09:46:40` | `—` |
| date-only `2026-10-06` | `—` |
| invalid, `''`, `null`, `undefined` | `—` |

Pravidlá:
- Formatter **neposiela `timeZone`**, takže Intl použije browser timezone a DST rieši IANA databáza.
  `timeZone` je iba pass-through Intl option a používajú ho len testy.
- Ak caller pošle field options (`day`, `hour`, …), defaultné `dateStyle`/`timeStyle` sa nepridajú, lebo Intl ich nedovolí kombinovať.
- `parseTimestamp` odmieta date-only `YYYY-MM-DD`, pretože `new Date('2026-10-06')` je v JS UTC polnoc (kategória E).
- Pre samotné date-only hodnoty sa nič nepridáva: v `src/` sa žiadne date-only API pole nenašlo.

## 6. Deferred follow-up: `datetime-local` (kategória C)

**Nie je súčasťou aktuálneho tasku.** `datetime-local` je problém LOCAL USER INPUT / wall-clock, nie display formatting.

### Problem
`datetime-local` reprezentuje lokálny wall-clock bez timezone. Aktuálny kód skladá
`` `${recoveryDate}:00+02:00` `` (Execute) a `` `${validationDate}:00+02:00` `` (Validate).
To je nesprávne kvôli DST, pretože `Europe/Bratislava` má v zime `+01:00`. Hodnota ide iba do mock preview `RecoveryPointSummary` (žiadne API).

### Spring-forward
Niektoré wall-clock hodnoty neexistujú. Príklad: `2026-03-29T02:30 Europe/Bratislava`, keďže hodiny skáču z 02:00 na 03:00.
JS `new Date('2026-03-29T02:30')` ho potichu posunie na 03:30 CEST.

### Fall-back
Niektoré wall-clock hodnoty existujú dvakrát. Príklad: `2026-10-25T02:30 Europe/Bratislava`
môže znamenať `00:30Z` (CEST, `+02:00`) aj `01:30Z` (CET, `+01:00`), teda dva rozdielne instanty.
Bez UX/API rozhodnutia FE nevie, ktorý instant používateľ myslel.
Automaticky sa nesmie vybrať skorší ani neskorší offset.

### Required future decision
Pred implementáciou treba rozhodnúť UX/API semantiku:
- Má používateľ vyberať timezone?
- Má UI pri ambiguous čase (fall-back) vyžiadať offset a pri neexistujúcom čase (spring-forward) zobraziť chybu?
- Má aplikácia používať explicitnú business timezone namiesto browser timezone?
- Má API prijímať local datetime + IANA timezone?
- Alebo má API prijímať už resolved UTC instant?

### Stav do rozhodnutia
- Existujúce `datetime-local` správanie sa v tomto tasku nemení.
- `RecoveryPointSummary` sa nemigruje: jeho `configurationAt` vždy pochádza z `datetime-local` (§4, riadok 6).
  Centralizácia by zmenila zobrazený čas preview, čo by bola zmena C.
- Fixed `+02:00` zostáva známy technical debt a nesmie sa tváriť ako vyriešený.
- Historická poznámka: skorší návrh `localDateTimeInputToUtcIso` s injektovaným `LocalCalendar`/`WallClock`
  bol z aktuálneho scope **odstránený**. Neriešil fall-back ambiguitu bez tichého predpokladu.

## 7. Testovacia stratégia

**Princíp:** žiadny test nesmie závisieť od OS timezone, CI timezone ani od premennej `TZ`.
Timezone konverziu dokazujú výlučne testy s explicitným `timeZone` option v `Intl.DateTimeFormat`.
Krok typu „spustiť testy s `TZ=UTC`“ sa nepoužíva.

- **Unit `dateTime.test.ts` (node):**
  - UTC `Z` aj explicitný offset (`+00:00`, `+02:00`) reprezentujú správny instant;
  - naive `2026-08-18T09:46:40`, date-only `2026-10-06`, invalid, `null` a `undefined` vrátia fallback `—`;
  - locale mapping sk/cs/en (porovnanie s `Intl` pre rovnaké locale a explicitný `timeZone: 'UTC'`);
  - explicitný `timeZone`: `2026-10-06T07:41:00Z` je v `Europe/Bratislava` 09:41 a v `Europe/London` 08:41;
  - DST: decembrový instant v Bratislave dá 08:41;
  - browser default: `formatDateTime(v)` sa rovná `formatDateTime(v, { timeZone: getBrowserTimeZone() })`, čo platí pri ľubovoľnej host TZ;
  - zdroj modulu (import `?raw`) neobsahuje `Europe/` ani fixný offset `±0X:00`.
- **Komponentové testy:**
  - overujú iba wiring, nie konverziu;
  - očakávaná hodnota je invariant voči host TZ: buď z rovnakého formattera, alebo z `new Date(ts).getHours()`. Nikdy nie natvrdo „10:25“;
  - existujúci test Access Logs s natvrdo zadaným `10:25:29` sa upraví;
  - každý migrovaný caller dostane aspoň jednu assertion, ktorá prejde formatterom.
- **Mimo scope (deferred, §6):** testy `datetime-local` → UTC, DST gap, fall-back, injektovaný kalendár, konverzia letného a zimného lokálneho vstupu.
- **Spúšťanie:** iba focused súbory (`npm exec vitest run <files>`), `eslint` na zmenených súboroch, `tsc -b`. Full suite ani build sa nespúšťajú.

## 8. Success criteria

1. Existuje jeden shared formatter pre SAFE absolute timestamps (`src/shared/utils/dateTime.ts`).
2. Všetky SAFE display callery v scope ho používajú a ich výstupný formát je rovnaký ako dnes, okrem timezone.
3. Browser timezone sa používa implicitne (žiadny `timeZone` v produkčných volaniach).
4. Žiadny hardcoded display timezone `Europe/Bratislava`.
5. Naive timestamp sa nikdy potichu neinterpretuje a vždy vráti `—`.
6. Semantika B, C, D, E a F sa nemení.
7. `datetime-local` je explicitne zdokumentovaný ako deferred follow-up (§6).
8. Produkčný scope neobsahuje žiadny helper na konverziu lokálneho vstupu na UTC.
9. Focused testy, lint a typecheck prechádzajú; každý commit je malý a obsahuje iba vlastné súbory.
