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
| 3 | Airflow `start_date` / `logical_date` majú `Z` | fixtures `mapOrchestratorRuns.test.ts` (Airflow REST vracia UTC) |
| 4 | Discovery Cache `started_at` je **naive, v lokálnom čase BE hostu** | BE `discovery_cache/service.py:42` `datetime.now()` |
| 5 | FlashCopy `start_time` je `YYMMDDHHMMSS` bez zóny; BE z neho robí naive `start_time_iso` | BE `ibm_flashsystem/topology.py:146` |
| 6 | Recovery Actions nemá API, všetko sú mocky | `recovery-actions/mocks/recoveryActionsMocks.ts`, žiadny mutation hook |
| 7 | OpenAPI nemá pri žiadnom poli `format: date-time` | `openapi/abco-api.json` |
| 8 | Test prostredie nemá fixnú TZ; Node na Windows ignoruje `TZ` okrem `UTC` | `vitest.config.ts`, overené lokálne |

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
localDateTimeInputToUtcIso(value: string): string | null   // datetime-local → `…Z`
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

- Helper validuje tvar `YYYY-MM-DDTHH:mm[:ss]` a iba potom volá `new Date`, takže sa nespolieha na voľný `Date` parsing.
- **API kontrakt neexistuje:** Recovery Actions je mock-only a hodnota ide iba do `RecoveryPointSummary` preview.
  Oprava je teda FE-interná a bezpečná, ale `RecoveryPointSummary` musí súčasne prejsť na `formatDateTime`.
  Inak by sa zobrazil surový `…Z`.
- Keď vznikne reálny Recovery Actions endpoint, treba s BE potvrdiť, že prijíma UTC ISO (follow-up).

## 7. Testovacia stratégia

- **Unit `dateTime.test.ts` (node):**
  - `Z` aj offset dávajú rovnaký instant;
  - `formatTime` s explicitným `timeZone` dá `Europe/Bratislava` 09:41 a `Europe/London` 08:41;
  - DST: decembrový instant v Bratislave dá 08:41;
  - fallback pre null, undefined, `''`, invalid a naive hodnoty;
  - locale mapping sk/cs/en (porovnanie s `Intl` pre rovnaké locale);
  - default bez `timeZone` sa rovná `Intl` s `getBrowserTimeZone()`;
  - zdroj modulu (import `?raw`) neobsahuje `Europe/` ani `±0X:00`.
- **`datetime-local`:** round-trip test nezávislý od stroja. `localDateTimeInputToUtcIso('2026-12-11T04:15')` končí `Z`
  a sformátovaný v browser timezone dá späť `04:15`. Rovnako pre letný dátum.
  Starý kód (`+02:00`) by na CET aj UTC stroji vrátil iný čas, takže test regresiu zachytí.
- **Komponentové testy:**
  - očakávanie sa odvodzuje zo stroja (`new Date(ts).getHours()`) alebo z round-tripu, nikdy nie natvrdo „10:25“;
  - existujúci test Access Logs s natvrdo zadaným `10:25:29` sa upraví;
  - každý migrovaný caller dostane aspoň jednu assertion, ktorá prejde formatterom.
- **Spúšťanie:** iba focused súbory (`npm exec vitest run <files>`), `eslint` na zmenených súboroch, `tsc -b`. Full suite ani build sa nespúšťajú.

## 8. Success criteria

1. V produkčnom kóde `src/` (mimo mockov a schedule options) nie je `timeZone: 'Europe/…'` ani `+02:00`.
2. Všetky SAFE (A) callery idú cez `dateTime.ts` a ich výstupný formát je rovnaký ako dnes, okrem timezone.
3. Kategórie B, D, E a F majú nezmenené správanie a sú zdokumentované v audite.
4. Focused testy, lint a typecheck prechádzajú; každý commit je malý a obsahuje iba vlastné súbory.
