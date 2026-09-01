# Todo: Recovery group VM search loading skeleton

Patrí k `tasks/recovery-group-vm-search-loading-plan.md`. Stav: Phase 1-4 hotové a commitnuté (`0c06a2e`). Phase 5 browser verification zostáva na interaktívnu session.

## Phase 1 — Hook exposes `isSearching`

- [x] VMware branch: `isSearching: isDebouncing || isBackgroundFetching`.
- [x] Non-VMware branch: `isSearching: false`.
- [x] Overiť, že property je dostupná na union return type bez narrowingu.
- [x] Test: true počas debounce okna.
- [x] Test: true počas refetchu so zobrazenými predchádzajúcimi dátami.
- [x] Test: false po dokončení fetchu.
- [x] Test: false pre `ibm_power_virtual_machines` a `ibm_flashsystem`.

## Phase 2 — `ResourceSidebar` skeleton state

- [x] Pridať `isSearching?: boolean` s defaultom `false`.
- [x] Renderovať existujúci `ListSkeleton` pri `isLoading || isSearching`.
- [x] Nechať `disabled={isLoading}` na search inpute nezmenené.
- [x] `aria-busy={isLoading || isSearching}` na data regióne.
- [x] Test: skeleton viditeľný pri `isSearching`, searchbox enabled, items neprítomné.
- [x] Overiť, že existujúci `isLoading` test prechádza bez zmeny.

### Checkpoint A
- [x] Hook vracia `isSearching` v oboch branchoch.
- [x] Sidebar zobrazí skeleton bez disablovania inputu.
- [x] `RecoveryAppBuilder` render nezmenený.

## Phase 3 — Wiring v resources stepe

- [x] `RecoveryGroupResourcesStep` posiela `isSearching={query.isSearching}`.
- [x] Pridať `isSearching` do `InventoryQueryDouble`.
- [x] Doplniť `isSearching` do všetkých `mockReturnValue` blokov v teste.
- [x] Test: skeleton pri `isSearching: true`, searchbox enabled.
- [x] Test: items pri `isSearching: false`.
- [x] Overiť, že existujúce testy stepu prechádzajú.

## Phase 4 — Automated verification

- [x] Focused Vitest: ResourceSidebar + hook + resources step + `RecoveryAppBuilder`.
- [x] Focused ESLint nad zmenenými súbormi.
- [~] `npm run typecheck` - moje súbory bez chyby; celý build blokuje nesúvisiaci rozbitý import `./RecoveryGroupContextMenu` v `RecoveryGroupsTable.tsx` (cudzia paralelná práca v worktree).
- [x] `git diff --check`.
- [x] Review task-owned diff.

## Phase 5 — Mandatory browser verification

- [ ] Spustiť `npm run dev` ako persistent process.
- [ ] Browser viewport 1542×765.
- [ ] `/recovery-plans/recovery-groups/create` → VMware → provider → Resources step.
- [ ] Skeleton sa objaví okamžite po stlačení klávesy, ešte pred requestom.
- [ ] Input zostáva focusnutý a písateľný počas skeletonu.
- [ ] Po výsledku skeleton zmizne a zoznam je filtrovaný.
- [ ] Clear cez `×` zobrazí skeleton a potom plný zoznam.
- [ ] Rýchle písanie nebliká medzi skeletonom a starým zoznamom.
- [ ] Prázdny výsledok zobrazí `No matches`, nie zaseknutý skeleton.
- [ ] IBM Power step: písanie filtruje lokálne, bez skeletonu.
- [ ] IBM FlashSystem step: to isté.
- [ ] Recovery application builder sidebar nezmenený.
- [ ] Screenshot skeletonu počas hľadania.
- [ ] Screenshot filtrovaného výsledku.
- [ ] Browser console check.
- [ ] Browser network check.

## Definition of Done

- [ ] Loading skeleton pokrýva celé okno od stlačenia klávesy po doručenie výsledku.
- [ ] Search input nie je nikdy disablovaný počas hľadania.
- [ ] Žiadny nový komponent, žiadny nový i18n key.
- [ ] Non-VMware lokálne filtrovanie bez skeletonu.
- [ ] `RecoveryAppBuilder` bez regresie.
- [ ] Focused automatické kontroly prešli.
- [ ] Browser test prešiel, console/network bez novej chyby.
- [ ] Commit obsahuje iba task-owned files.
