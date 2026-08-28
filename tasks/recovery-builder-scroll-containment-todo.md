# Checklist: Recovery Application a Recovery Group scroll containment

Súvisiaci plán:
`tasks/recovery-builder-scroll-containment-plan.md`.

## Fáza 1 — Štrukturálny kontrakt

- [ ] Task 1: nahradiť neúčinné Group root-class testy builder-parent testami.
- [ ] Pridať rovnaké charakterizačné testy pre Application create/edit.
- [ ] Potvrdiť Application green a Group red pred produkčnou opravou.

## Fáza 2 — Recovery Group implementácia

- [ ] Task 2: pridať `flex flex-1 flex-col lg:min-h-0` body wrapper na Group create.
- [ ] Presunúť create alert/load-error/builder do body oblasti bez zmeny správania.
- [ ] Odstrániť create root `lg:overflow-hidden` workaround.
- [ ] Potvrdiť create green.
- [ ] Task 3: pridať rovnaký body wrapper na Group edit.
- [ ] Presunúť edit alert/builder do body oblasti bez zmeny správania.
- [ ] Odstrániť edit root `lg:overflow-hidden` workaround.
- [ ] Potvrdiť edit green.

### Checkpoint A

- [ ] Všetky štyri page contract testy prešli.
- [ ] Recovery Application produkčné stránky nemajú diff.
- [ ] AppShell, ResourceSidebar a oba builder komponenty nemajú diff.
- [ ] Neúčinný prvý workaround a jeho testy sú odstránené.

## Fáza 3 — Browser matica

- [ ] Task 4: Application create, dlhý zoznam, normálny desktop.
- [ ] Application edit, dlhý zoznam, normálny desktop.
- [ ] Group create, dlhý VM zoznam, normálny desktop.
- [ ] Group edit, dlhý VM zoznam, normálny desktop.
- [ ] Overiť krátky desktop viewport.
- [ ] Overiť mobilný viewport.
- [ ] Potvrdiť `scrollHeight > clientHeight` na vnorených scroll oblastiach.
- [ ] Uložiť screenshots a skontrolovať konzolu.

## Fáza 4 — Finálne overenie

- [ ] Task 5: spustiť focused Vitest maticu z plánu.
- [ ] Spustiť focused ESLint.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `git diff --check`.
- [ ] Potvrdiť nulový globálny/builder diff.
- [ ] Stage-nuť iba šesť plánovaných page/test súborov.
- [ ] Vytvoriť atomický commit.

## Definition of Done

- [ ] Application aj Group create/edit majú testovaný body containment kontrakt.
- [ ] Dlhé resource zoznamy scrollujú interne na všetkých štyroch routes.
- [ ] Desktop short-window a mobilný flow zostali použiteľné.
- [ ] Neexistuje neúčinný page-root overflow workaround.
- [ ] Automatické aj browser kontroly prešli.
- [ ] Zmena je v jednom čistom commite.
