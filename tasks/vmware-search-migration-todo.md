# Checklist: migrácia VMware inventára na `POST /vms/search`

Tento checklist patrí k
`tasks/vmware-search-migration-plan.md`. Implementácia sa má vykonať až po ľudskom
schválení plánu.

## Fáza 1 — Kanonický kontrakt

- [ ] Úloha 1: zaviesť normalizovaný VMware search vstup a kanonický POST wrapper.
- [ ] Overiť explicitné `{}`, provider query, všetky filtre, AND kombináciu,
  `force_refresh`, mapovanie a chyby.
- [ ] Úloha 2: zaviesť canonical `vmwareSearch` query key.
- [ ] Overiť provider/folder/tag/debounced-prefix identitu a ignorovanie
  `forceRefresh`.

### Checkpoint A

- [ ] Spustiť focused API a query-key testy.
- [ ] Potvrdiť jediného vlastníka normalizácie a request body.
- [ ] Potvrdiť nulové deprecated importy v kanonickom wrapperi.

## Fáza 2 — Konzumenti

- [ ] Úloha 3: migrovať `fetchInventory`, Infrastructure a Recovery Groups.
- [ ] Overiť spoločný unfiltered provider key a nezmenené IBM vetvy.
- [ ] Úloha 4: migrovať `useVmwareResourceInventory`.
- [ ] Overiť 300 ms debounce pre name-only aj tag + name.
- [ ] Overiť jeden AND request a key s tagom aj debouncovaným prefixom.
- [ ] Overiť retained data, provider isolation, cache reuse, error/retry/empty a
  normálny refetch.

### Checkpoint B

- [ ] Spustiť focused testy všetkých migrovaných dátových tokov.
- [ ] Skontrolovať request counts pomocou fake timers.
- [ ] Skontrolovať spoločnú cache identitu Resources/Infrastructure/Recovery Groups.

## Fáza 3 — Shared UI a cleanup

- [ ] Úloha 5: migrovať shared `VmwareResourcesPage` pre Resources aj Resources ISE.
- [ ] Zachovať fixed provider filtre, klientské filtre, pagination a detail drawer.
- [ ] Potvrdiť, že refresh neposiela `force_refresh: true`.
- [ ] Úloha 6: odstrániť `vmsByNameApi`, `useVmsByName`, legacy key factories a
  nepoužívané registry položky.
- [ ] Potvrdiť, že generated/OpenAPI súbory neboli ručne zmenené.

### Checkpoint C

- [ ] Spustiť všetky priamo dotknuté testy.
- [ ] Spustiť focused ESLint nad zmenenými TS/TSX súbormi.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť statický scan na deprecated ručne písané VM symboly a URL.

## Fáza 4 — Finálne overenie a commit

- [ ] Úloha 7: prejsť kompletnú regresnú maticu z plánu.
- [ ] Spustiť focused Vitest.
- [ ] Spustiť focused ESLint.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `npm run api:check`.
- [ ] Spustiť `npm run build`.
- [ ] Spustiť `git diff --check`.
- [ ] Zopakovať cleanup `rg` scan.
- [ ] Úloha 8: stage-nuť iba migračné súbory a vytvoriť jeden atomický commit.
- [ ] Overiť výsledný commit a pracovný strom.

## Definition of Done

- [ ] Jediná frontendová VMware inventory cesta je `POST /api/vms/search`.
- [ ] Query key presne reprezentuje normalizovaný serverový request bez
  `forceRefresh`.
- [ ] Tag + namePrefix sa odosielajú spolu a sú spolu v key.
- [ ] Všetci runtime konzumenti sú migrovaní a zdieľajú vhodnú cache.
- [ ] Legacy ručne písané endpointy, hooky, key factories a fallbacky sú odstránené.
- [ ] Všetky požadované testy a verification príkazy prešli.
- [ ] Zmena je v jednom overenom atomickom commite.
