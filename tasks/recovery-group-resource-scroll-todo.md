# Checklist: Recovery Group resources scrollbar

Súvisiaci plán:
`tasks/recovery-group-resource-scroll-plan.md`.

## Fáza 1 — Baseline a test

- [ ] Úloha 1: reprodukovať problém v browseri.
- [ ] Zmerať AppShell, Outlet wrapper, page root, builder a sidebar overflow/výšky.
- [ ] Uložiť screenshot pred opravou.
- [ ] Úloha 2: doplniť failing layout contract test pre create stránku.
- [ ] Doplniť rovnaký failing test pre edit stránku.
- [ ] Potvrdiť red stav iba nových assertions.

## Fáza 2 — Chirurgická oprava

- [ ] Úloha 3: pridať `lg:overflow-hidden` na create page root.
- [ ] Pridať rovnaký containment na edit page root.
- [ ] Potvrdiť green stav create/edit testov.

### Checkpoint

- [ ] `AppShell`, `ResourceSidebar`, `RecoveryGroupBuilder` a
  `RecoveryGroupResourcesStep` nemajú produkčný diff.
- [ ] Nie je použitý pevný `max-height` ani viewportový workaround.
- [ ] Diff obsahuje iba priamo súvisiace riadky a testy.

## Fáza 3 — Browser a focused verification

- [ ] Úloha 4: overiť interný scrollbar na create route.
- [ ] Overiť interný scrollbar na edit route.
- [ ] Overiť krátky desktop viewport.
- [ ] Overiť mobilný viewport.
- [ ] Potvrdiť čistú browser konzolu a uložiť after screenshoty.
- [ ] Úloha 5: spustiť focused Vitest.
- [ ] Spustiť focused ESLint.
- [ ] Spustiť `npm run typecheck`.
- [ ] Spustiť `git diff --check`.
- [ ] Commitnúť iba opravu a jej testy.

## Definition of Done

- [ ] Dlhý available resources zoznam scrolluje interne na create aj edit stránke.
- [ ] Celý wizard sa pri scrollovaní zoznamu neposúva.
- [ ] AppShell short-window a mobilné správanie nemajú regresiu.
- [ ] Focused automatické aj manuálne browser kontroly prešli.
- [ ] Oprava je v jednom atomickom commite.
