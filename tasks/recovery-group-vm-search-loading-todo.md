# Todo: Recovery group VM search loading skeleton

Patrí k `tasks/recovery-group-vm-search-loading-plan.md`. Stav: pripravené na implementáciu po schválení.

## Phase 1 — Hook exposes `isSearching`

- [ ] VMware branch: `isSearching: isDebouncing || isBackgroundFetching`.
- [ ] Non-VMware branch: `isSearching: false`.
- [ ] Overiť, že property je dostupná na union return type bez narrowingu.
- [ ] Test: true počas debounce okna.
- [ ] Test: true počas refetchu so zobrazenými predchádzajúcimi dátami.
- [ ] Test: false po dokončení fetchu.
- [ ] Test: false pre `ibm_power_virtual_machines` a `ibm_flashsystem`.

## Phase 2 — `ResourceSidebar` skeleton state

- [ ] Pridať `isSearching?: boolean` s defaultom `false`.
- [ ] Renderovať existujúci `ListSkeleton` pri `isLoading || isSearching`.
- [ ] Nechať `disabled={isLoading}` na search inpute nezmenené.
- [ ] `aria-busy={isLoading || isSearching}` na data regióne.
- [ ] Test: skeleton viditeľný pri `isSearching`, searchbox enabled, items neprítomné.
- [ ] Overiť, že existujúci `isLoading` test prechádza bez zmeny.

### Checkpoint A
- [ ] Hook vracia `isSearching` v oboch branchoch.
- [ ] Sidebar zobrazí skeleton bez disablovania inputu.
- [ ] `RecoveryAppBuilder` render nezmenený.

## Phase 3 — Wiring v resources stepe

- [ ] `RecoveryGroupResourcesStep` posiela `isSearching={query.isSearching}`.
- [ ] Pridať `isSearching` do `InventoryQueryDouble`.
- [ ] Doplniť `isSearching` do všetkých `mockReturnValue` blokov v teste.
- [ ] Test: skeleton pri `isSearching: true`, searchbox enabled.
- [ ] Test: items pri `isSearching: false`.
- [ ] Overiť, že existujúce testy stepu prechádzajú.

## Phase 4 — Automated verification

- [ ] Focused Vitest: ResourceSidebar + hook + resources step + `RecoveryAppBuilder`.
- [ ] Focused ESLint nad zmenenými súbormi.
- [ ] `npm run typecheck`.
- [ ] `git diff --check`.
- [ ] Review task-owned diff.

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
