# Implementačný plán: Short-viewport floor pre table pages

Tasks: `tasks/short-viewport-table-floor-todo.md`.
Revízia: 2026-10-01 (r1) — **iba plán, nič neimplementované.**
Pôvod: follow-up gate v `tasks/recovery-plans-layout-measurements.md` (Recovery layout alignment, Task 4).
Referencia: `tasks/short-viewport-route-floor-plan.md` (rovnaký problém, vyriešený pre Resources a Infrastructure).

## Problém (namerané 2026-10-01, HEAD `62fbe47c`)

Na 1366×600 sa table pages s `contentScroll: 'contained'` stláčajú bez dolnej hranice:

| Route | Card h | Data viewport h | Plne viditeľné riadky |
|---|---|---|---|
| Platform Providers | 398 | 137 | 2 / 4 |
| Snapshot policies | 398 | 135 | 1 / 5 |
| Application Recovery policies | 398 | 135 | 0 / 3 |
| Resources VMware (s floor) | 480 | 190 | 2 / 2 — route scrolluje |

Na 1366×768 majú tie isté stránky Card h 566, na 1536×864 Card h 662.

## Scope

**In scope (8 routes, 6 page/shell súborov):**

| Route | Súbor s root frame + `InventoryShell` |
|---|---|
| Recovery Apps | `src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.tsx` |
| Recovery Groups | `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx` |
| Recovery Runs | `src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.tsx` |
| Snapshot / App Recovery / Clean Room policies | `src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.tsx` (1 zmena → 3 routes) |
| Policy Sets | `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx` |
| Providers | `src/features/providers-connectors/providers/pages/ProvidersPage.tsx` |
| Platform Providers | `src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.tsx` |

Všetkých 6 súborov má dnes rovnaký root `flex min-h-full flex-col lg:h-full lg:min-h-0` a `InventoryShell` bez floor.

**Mimo scope:** Resources / Resources ISE (už majú floor), Infrastructure, builder/editor pages, Identity Access,
Discovery Settings, Configuration. **Credentials** a **Audit** sú tiež table pages s `InventoryShell` — pozri
Open Questions; Task 1 ich iba zmeria.

## Overené fakty z kódu

- `AppShell` (`src/layouts/app-shell/AppShell.tsx`): pri `contained` route je `<main>` na lg `lg:overflow-hidden`
  a outlet `lg:min-h-0`; pod lg je obsah prirodzene scrollovateľný (dokument).
- `ContainedViewportFrame` (shared): `flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto`.
  Je to dnešný root target stránok **+ iba `lg:overflow-y-auto`**. Pod lg nemá overflow → mobile natural scroll ostáva.
- `InventoryShell.surfaceMinHeightClassName` (shared, generický): nahradí `lg:min-h-0` sekcie a odstráni
  `lg:min-h-0` zo shell rootu. Floor je na sekcii s Card, nie na celom shelli → `notice`/`metrics` nad Card
  nestlačia tabuľku späť.
- Resources floor: `RESOURCE_INVENTORY_MIN_HEIGHT = 'lg:min-h-[480px]'` vo feature súbore
  `ResourceInventoryShell.tsx` — **nesmie sa importovať** mimo Resources.
- `cn()` iba spája triedy (žiadny tailwind-merge) → nikdy neskladať `lg:min-h-0` a `lg:min-h-[…]` na jeden element;
  preto sa floor posiela cez `surfaceMinHeightClassName`, ktorý `lg:min-h-0` nahrádza.
- `DetailDrawer` a `Modal` sú `fixed` → scrollovateľný route frame ich nemá posúvať ani orezávať (overiť v Task 6).
- `PolicySetsPage.test.tsx` dnes assertuje `lg:min-h-0` na shell roote — po zmene sa musí upraviť na nový contract.

## Architektonické rozhodnutia

- **Scroll ownership = route frame**, nie `<main>`. `contained` handle ani `AppShell` sa nemenia.
  Každá z 6 stránok/shellov nahradí root `<div>` shared `ContainedViewportFrame`. Frame vyplní viewport a
  scrolluje iba vtedy, keď floor nevojde.
- **Floor = generický `surfaceMinHeightClassName`** na shared `InventoryShell` (existujúca capability, žiadny nový prop).
  Hodnota `lg:min-h-[480px]` sa zhoduje s Resources, aby mali všetky table pages rovnakú dolnú hranicu.
- **Hodnota ako shared konštanta**, nie Resources import: nová exportovaná konštanta
  `INVENTORY_SURFACE_MIN_HEIGHT = 'lg:min-h-[480px]'` v `src/shared/components/inventory-shell/`.
  Ak eslint (`react-refresh/only-export-components`) nepovolí export z `InventoryShell.tsx`, ide do samostatného
  `inventoryShellLayout.ts`. `ResourceInventoryShell` ostáva nezmenený (zjednotenie na shared konštantu = možný follow-up).
- **Žiadny nový komponent, žiadny Recovery shell, žiadny import Resources wrapperov.**
- **Nested data scroll nie je double scroll.** Canonical contract (Resources): data viewport vo vnútri
  `DataTableSurface` scrolluje riadky; route frame scrolluje iba o prebytok floor. **Double vertical scroll** =
  `<main>` aj frame scrollujú súčasne, alebo frame scrolluje na viewporte, kde floor vojde — to nesmie nastať.
- **CSS only.** Žiadne JS merania viewportu; `PageHeader`, `TableToolbar`, `DataTable*`, `Tabs` bez zmeny.

## Očakávaná geometria (overí Task 1, nie je to meranie)

- 1536×864 a 1366×768: Card h (662 / 566) > 480 → floor neaktívny, frame `scrollHeight == clientHeight`, layout bez zmeny.
- 1366×600: Card h 398 → 480; frame scrolluje o ~82 px; data viewport ~135 → ~217 px.
- Riziko: slovenské/české texty alebo `notice` môžu zmenšiť Card na 1366×768 pod 480 → Task 1 meria aj sk;
  ak by floor menil 1366×768 v normálnom stave, hodnota sa zníži (pravidlo: 768p a vyššie bez zmeny je pevné, číslo nie).

## Task List

### Phase 1: Baseline
- [ ] Task 1: Baseline meranie pred zmenou (bez kódu; human-gated login)

### Phase 2: Implementácia
- [ ] Task 2: Shared floor konštanta
- [ ] Task 3: Recovery Apps, Groups, Runs — frame + floor
- [ ] Task 4: Recovery Policies shell + Policy Sets — frame + floor
- [ ] Task 5: Providers + Platform Providers — frame + floor

### Checkpoint: Po Tasks 2–5
- [ ] Focused testy, `npm run typecheck`, focused `npx eslint`, `git diff --check`

### Phase 3: Verifikácia
- [ ] Task 6: Browser matrix po zmene (human-gated login) + evidence

## Overenie

- Focused testy iba pre zmenené súbory (zoznam v TODO); celý suite ani build nie.
- Browser: agent spúšťa Edge cez `playwright-core` v scratchpade (mimo repa); **človek sa prihlási do Keycloak**.
  Merané hodnoty sa zapisujú iba z reálneho behu. Zápisové API requesty (`delete_*`, `rollback_*`, `submit_*`)
  sa počas merania mockujú.
- Viewporty: 1536×864, 1366×768, 1366×600, mobile 390×844.

## Concurrency / worktree protocol

Na vetve paralelne pracuje iná session. Platí rovnaký protokol ako v
`tasks/recovery-plans-layout-alignment-plan.md` (A: status + task-start HEAD + diff + načítanie súborov;
B: HEAD pred stagingom; C: pri zmene HEAD STOP + `git diff --name-only <start>..HEAD -- <task-owned files>`,
žiadny rebase/reset/prepis; D: focused verification → selektívny staging → `git diff --cached` → posledná
kontrola HEAD → commit). `.claude/scheduled_tasks.lock` a cudzie zmeny sa nikdy nestageujú.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Floor spôsobí scroll na 1366×768 (sk texty, `notice`) | Med | Task 1 meria en+sk; Task 6 assertuje frame `scrollHeight == clientHeight` na 768/864 v normal stave |
| Double vertical scroll (`<main>` + frame) | Med | Task 6 meria `<main>` aj frame; `<main>` musí ostať bez scrollu |
| Drawer/modal sa posúva so scrollom frame | Med | Task 6: otvoriť detail drawer + create modal na 1366×600 po odscrollovaní frame |
| Mobile regresia | Low | Floor a `overflow-y-auto` sú iba `lg:`; Task 6 overí 390×844 natural scroll a žiadny vnorený page scroll |
| Rozbitý test contract (`PolicySetsPage.test.tsx`) | Low | Task 4 ho prepíše na nový contract (floor na sekcii, frame scroll) |
| Duplicitná hodnota 480 v Resources a shared | Low | Vedomé; zjednotenie ako samostatný follow-up |

## Open Questions

1. **Credentials a Audit** sú tiež table pages s `InventoryShell` (Audit má navyše `lg:overflow-hidden` na roote).
   Zahrnúť ich do tohto plánu po baseline z Task 1, alebo nechať ako ďalší follow-up? Odporúčanie: rozhodnúť
   po Task 1 podľa nameraného kolapsu.
