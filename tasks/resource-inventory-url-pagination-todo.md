# Checklist: spoločný URL pagination pattern

## Scope guard

- [ ] URL stav zaviesť pre VMware, FlashSystem aj IBM Power.
- [ ] `providerId` ponechať ako source navigation context, nie filter.
- [ ] Zatiaľ neposielať nepotvrdené pagination parametre backendu.
- [ ] Density, detail drawer a selected row neukladať do URL.

## Fáza 1: Shared URL základ

- [ ] Úloha 1 — failing testy pre parsing, serializáciu a page reset.
- [ ] Úloha 2 — shared pagination/search-param hook a spoločné typy.

## Checkpoint 1

- [ ] Shared focused testy prejdú.
- [ ] Typecheck prejde.
- [ ] Existujúce resource stránky zatiaľ nemenia správanie.

## Fáza 2: Resource integrácie

- [ ] Úloha 3 — VMware migrovaný na shared základ bez regresie.
- [ ] Úloha 4 — VMware provider oddelený od table filter modelu.
- [ ] Úloha 5 — FlashSystem page, pageSize, search a filtre v URL.
- [ ] Úloha 6 — IBM Power page, pageSize, search a filtre v URL.

## Checkpoint 2

- [ ] Refresh obnoví stav každého z troch tabov.
- [ ] Filter/page-size zmena resetuje page na 1.
- [ ] Out-of-range page sa clampne a opraví v URL.
- [ ] Provider sa nepočíta medzi filtre.

## Fáza 3: Source prechody

- [ ] Úloha 7 — resource/provider switch zachová search/pageSize.
- [ ] Úloha 7 — resource/provider switch vyčistí nekompatibilné filtre.
- [ ] Úloha 7 — selection a page reset sa zapíšu atomicky.

## Checkpoint 3

- [ ] VMware → FlashSystem → IBM Power nevytvára stale filter state.
- [ ] Zmena providera v rovnakom type zobrazí page 1.
- [ ] URL zostane zdieľateľná a spätne kompatibilná.

## Fáza 4: Verifikácia

- [ ] Úloha 8 — produkčný frontend flow a regresné overenie.
- [ ] Focused hook, page a inventory-view testy.
- [ ] `npm run lint`.
- [ ] `npm run typecheck`.
- [ ] `npm test`.
- [ ] `npm run build`.
- [ ] `git diff --check`.
- [ ] Browser: page 2 + refresh pre všetky tri taby.
- [ ] Browser: page size, filter reset a provider/source switch.
- [ ] Network: bez nových pagination parametrov pred backend podporou.

## Schválenie

- [ ] Používateľ skontroloval špecifikáciu a plán.
- [ ] Používateľ schválil implementáciu pred zmenou funkčného kódu.

## Odložená backend etapa

- [ ] Potvrdiť `page/pageSize`, `offset/limit` alebo cursor kontrakt.
- [ ] Definovať paginated response vrátane `total` a globálnych metrík.
- [ ] Vytvoriť samostatný implementačný plán backend integrácie.
