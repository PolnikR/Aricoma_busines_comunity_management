# Checklist: izolovaný scroll Recovery builder panelov v2

Súvisiaci plán: `tasks/recovery-builder-scroll-containment-v2-plan.md`.

## Fáza 1 — Kontrakt a route metadata

- [ ] Task 1: pridať test contained/default shell režimu.
- [ ] Označiť všetky štyri create/edit builder routes handle metadátom.
- [ ] Potvrdiť red stav pred AppShell implementáciou.

## Fáza 2 — Route-scoped AppShell

- [ ] Task 2: čítať scroll handle cez `useMatches()`.
- [ ] Contained route → `main lg:overflow-hidden` + Outlet `lg:min-h-0`.
- [ ] Default route → zachovať `lg:overflow-auto` + `lg:min-h-min`.
- [ ] Potvrdiť route a AppShell testy.

### Checkpoint A

- [ ] Containment je obmedzený na builder routes.
- [ ] Ostatné obrazovky nemajú zmenu shell kontraktu.
- [ ] Žiadny URL string matching ani globálny revert.

## Fáza 3 — Interné panely

- [ ] Task 3: Group available Resources panel má definitívnu desktop výšku.
- [ ] Group selected/drag-and-drop list scrolluje interne.
- [ ] Group create/edit behavior testy zostali zelené.
- [ ] Task 4: Application available groups a tiers panely scrollujú interne.
- [ ] Application create/edit behavior testy zostali zelené.
- [ ] Shared ResourceSidebar/ResourceSelectionCard API sa nemení.

## Fáza 4 — Browser matrix

- [ ] Group create 1440×900.
- [ ] Group edit 1440×900.
- [ ] Application create 1440×900.
- [ ] Application edit 1440×900.
- [ ] Všetky štyri routes 1440×700.
- [ ] Všetky štyri routes 390×844.
- [ ] DevTools: vnorené `scrollHeight > clientHeight`.
- [ ] DevTools: AppShell main nie je vlastníkom dlhého resource scrollu.
- [ ] Header, wizard a action bar ostávajú stabilné.
- [ ] Screenshoty a konzola skontrolované.

## Fáza 5 — Verification a commit

- [ ] Focused Vitest.
- [ ] Focused ESLint.
- [ ] `npm run typecheck`.
- [ ] `git diff --check`.
- [ ] Full suite, ak cross-cutting shell zmena vyžaduje širšiu regresiu.
- [ ] Staged diff obsahuje iba task súbory.
- [ ] Cudzie rozpracované task dokumenty zostali mimo stage.
- [ ] Atomic commit s popisom route-scoped scroll containment.

## Definition of Done

- [ ] Na desktope scrollujú iba Resources a selected/drop panely.
- [ ] AppShell na builder routes nemá dlhý page scrollbar.
- [ ] Ostatné routes si zachovávajú existujúci fallback.
- [ ] Mobilný page scroll funguje prirodzene.
- [ ] Automatické aj browser overenie je zelené.
- [ ] Zmena je commitnutá bez nesúvisiacich súborov.
