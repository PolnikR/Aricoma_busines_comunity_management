# Task Checklist: Provider Role Server Filter

## Query a cache kontrakt

- [x] Doplniť query-key testy pre `all`, `source` a `target`.
- [x] Doplniť hook test oddelených role caches.
- [x] Overiť návrat na fresh cache bez nového requestu.
- [x] Spustiť focused query testy.
- [x] Commitnúť query/cache kontrakt.

## Serverová orchestration

- [x] Doplniť `roleFilter` do `ProvidersPage`.
- [x] Udržiavať kompletnú `all` query a viditeľnú role query.
- [x] Použiť viditeľnú query pre tabuľku, refresh, loading a error.
- [x] Použiť kompletnú query pre create/edit závislosti.
- [x] Odovzdať controlled role props tabuľke.
- [x] Doplniť a spustiť page testy.
- [x] Commitnúť page orchestration.

## Filter modal

- [x] Doplniť `pendingRole` a synchronizáciu cez `onFilterOpen`.
- [x] Pridať shared `Field` a `Select` pre Role.
- [x] Implementovať Apply pre Type aj Role.
- [x] Implementovať Cancel bez zmeny aplikovaných filtrov.
- [x] Implementovať Clear all na Type prázdny a Role `all`.
- [x] Resetovať pagination a zatvoriť detail pri zmene filtrov.
- [x] Počítať aktívne filtre v rozsahu 0–2.
- [x] Odvodzovať Type možnosti z kompletného datasetu.
- [x] Posielať kompletný dataset aj edit modalu v tabuľke.
- [x] Doplniť `providers.allRoles` do EN, SK a CS.
- [x] Doplniť testy Apply, Cancel, Clear all a kombinovaných filtrov.
- [x] Spustiť component a page testy.
- [x] Commitnúť filter UI.

## Invalidácia cache

- [x] Naplniť v mutation testoch cache `all`, `source` a `target`.
- [x] Overiť prefix invalidáciu po create/update.
- [x] Overiť prefix invalidáciu po delete.
- [x] Spustiť mutation testy.
- [x] Commitnúť invalidation kontrakt.

## Finálne overenie

- [x] Spustiť `npm run test -- src/features/providers-connectors/providers`.
- [x] Spustiť `npm run lint`.
- [x] Spustiť `npm run typecheck`.
- [ ] Spustiť `npm run build`.
- [ ] Manuálne overiť requesty `role=all`, `role=source`, `role=target`.
- [ ] Manuálne overiť cache návrat na už načítanú rolu.
- [ ] Manuálne overiť kompletné create dáta pri aktívnom filtri.
- [x] Skontrolovať `git diff --check` a rozsah zmien.
