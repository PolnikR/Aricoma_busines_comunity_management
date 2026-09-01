# Implementation Plan: Recovery group VM search loading skeleton

## Overview

V `Create recovery group → Resources` stepe má VMware VM search zobrazovať loading stav počas hľadania. Dnes používateľ napíše meno a nič sa nezmení, takže nevie, či sa niečo deje. Použije sa ten istý `ListSkeleton`, ktorý sidebar už renderuje pri prvotnom načítaní — žiadny nový vizuál, žiadny nový preklad.

Produkčný kód sa v planning fáze nemení. Stav: pripravené na implementáciu po schválení.

## Overený aktuálny stav

- `RecoveryGroupResourcesStep` posiela do `ResourceSidebar` iba `isLoading={query.isLoading}` a `isRetrying={query.isFetching}` (`RecoveryGroupResourcesStep.tsx:60-61`).
- VMware search ide na server s 300 ms debounce (`useVmwareResourceInventory.ts:56-62`), a `placeholderData` drží predchádzajúci zoznam na obrazovke, kým beží nový request (`useVmwareResourceInventory.ts:79-83`).
- Preto je počas hľadania `query.isLoading === false` (dáta existujú → `isPending` je false) a v sidebare nevidno žiadnu zmenu.
- `useVmwareResourceInventory` už vracia presne potrebné príznaky: `isDebouncing` a `isBackgroundFetching` (`useVmwareResourceInventory.ts:158-162`).
- `useRecoveryGroupResourceInventory` tieto príznaky síce spreaduje vo VMware branchi, ale návratový typ je union dvoch branchov, takže `query.isDebouncing` v komponente TypeScriptom neprejde.
- `ResourceSidebar` už renderuje `ListSkeleton` pri `isLoading` (`ResourceSidebar.tsx:86-87`), ale `isLoading` zároveň disabluje search input (`ResourceSidebar.tsx:73`).
- Rovnaký vzor už beží na Resources page: `isLoading={isBackgroundFetching}` prekryje tabuľku skeleton riadkami (`VmwareResourcesPage.tsx:190-195`).

## Architecture Decisions

1. Loading stav sa **nesmie** poslať cez existujúci `isLoading` prop — disabloval by search input, ktorý by stratil focus a používateľ by nedopísal meno. Preto nový samostatný príznak.
2. Zdrojom pravdy je hook, nie komponent: `useRecoveryGroupResourceInventory` vráti jeden odvodený boolean `isSearching`.
3. `isSearching` musí byť prítomný v **oboch** branchoch hooku (VMware aj non-VMware), inak union return type neumožní prístup k property.
4. VMware: `isSearching = isDebouncing || isBackgroundFetching`. Debounce window musí byť zahrnutý, inak prvých 300 ms po stlačení klávesy stále nie je vidieť nič.
5. Non-VMware (IBM Power, FlashSystem): `isSearching = false`. Ich search je klientský, nad už načítanými dátami — nič sa nefetchuje, skeleton by tam bol lož.
6. Vizuál je existujúci `ListSkeleton` s existujúcim `loadingLabel`. Žiadny nový komponent, žiadny nový i18n key.
7. `isSearching` má v `ResourceSidebar` prednosť pred error branchom, rovnako ako ju už dnes má `isLoading`.
8. Prop je optional s defaultom `false`, takže druhý konzument sidebaru (`RecoveryAppBuilder.tsx`) sa nemení.
9. Browser verification je povinná súčasť Definition of Done — ide o čisto vizuálnu, časovo podmienenú zmenu.

## Dependency Graph

```text
Task 1 hook exposes isSearching
        ↓
Task 2 ResourceSidebar isSearching prop
        ↓
Task 3 RecoveryGroupResourcesStep wiring + test doubles
        ↓
Task 4 Focused automated verification
        ↓
Task 5 Browser verification
```

## Task 1: Expose `isSearching` from `useRecoveryGroupResourceInventory`

**Description:** Pridať do návratovej hodnoty hooku jednotný boolean `isSearching`, ktorý komponentu povie, že prebieha serverové hľadanie (vrátane debounce okna).

**Acceptance criteria:**
- [ ] VMware branch vracia `isSearching: vmwareQuery.isDebouncing || vmwareQuery.isBackgroundFetching`.
- [ ] Non-VMware branch vracia `isSearching: false`.
- [ ] `isSearching` je typovo dostupný na návratovej hodnote hooku bez narrowingu na strane konzumenta.

**Verification:**
- [ ] `useRecoveryGroupResourceInventory.test.tsx`: `isSearching === true` počas debounce okna po zmene `vmwareNamePrefix`.
- [ ] `isSearching === true` počas prebiehajúceho refetchu, keď sú predchádzajúce dáta stále zobrazené.
- [ ] `isSearching === false` po dokončení fetchu.
- [ ] `isSearching === false` pre `ibm_power_virtual_machines` aj `ibm_flashsystem`.
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Dependencies:** None.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`

**Estimated scope:** Small — 2 files.

## Task 2: Add `isSearching` skeleton state to `ResourceSidebar`

**Description:** Nový optional prop `isSearching`, ktorý v zozname zobrazí existujúci `ListSkeleton`, ale nechá search input plne použiteľný.

**Acceptance criteria:**
- [ ] `isSearching?: boolean` s defaultom `false`.
- [ ] Pri `isSearching` sa v data regióne renderuje ten istý `ListSkeleton` ako pri `isLoading` (rovnaký `rowCount`, rovnaký `loadingLabel`).
- [ ] Search input pri `isSearching` **nie je** disabled a nestráca focus.
- [ ] `aria-busy` data regiónu je true pri `isLoading` aj `isSearching`.
- [ ] `isLoading` chovanie vrátane disablovaného inputu zostáva nezmenené.
- [ ] Bez `isSearching` je render bit-for-bit rovnaký ako dnes (`RecoveryAppBuilder` sa nemení).

**Verification:**
- [ ] `ResourceSidebar.test.tsx`: pri `isSearching` je viditeľný `role="status"` skeleton, search input je enabled a items nie sú renderované.
- [ ] Existujúci `isLoading` test (disabled searchbox) prechádza bez zmeny.
- [ ] `npm exec vitest run src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`

**Dependencies:** None (môže ísť paralelne s Task 1).

**Files likely touched:**
- `src/shared/components/resource-sidebar/ResourceSidebar.tsx`
- `src/shared/components/resource-sidebar/ResourceSidebar.test.tsx`

**Estimated scope:** Small — 2 files.

## Checkpoint A

- [ ] Hook vracia `isSearching` v oboch branchoch.
- [ ] Sidebar vie zobraziť skeleton bez disablovania inputu.
- [ ] `RecoveryAppBuilder` render sa nezmenil.

## Task 3: Wire the searching state into the recovery group resources step

**Description:** Prepojiť hook a sidebar a aktualizovať test doubles, ktoré nový príznak nepoznajú.

**Acceptance criteria:**
- [ ] `RecoveryGroupResourcesStep` posiela `isSearching={query.isSearching}`.
- [ ] Počas VMware hľadania sa v `AVAILABLE VIRTUAL MACHINES` zobrazí skeleton a input zostane editovateľný.
- [ ] `InventoryQueryDouble` v `RecoveryGroupResourcesStep.test.tsx` obsahuje `isSearching` a všetky `mockReturnValue` bloky ho nastavujú.
- [ ] IBM Power / FlashSystem stepy skeleton pri písaní nezobrazia.

**Verification:**
- [ ] `RecoveryGroupResourcesStep.test.tsx`: pri `isSearching: true` je skeleton viditeľný a searchbox enabled.
- [ ] Test, že pri `isSearching: false` sa renderujú resource items.
- [ ] Existujúce testy (VMware server search, local Power search, scroll regiony, error stav) prechádzajú.
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`

**Dependencies:** Tasks 1 a 2.

**Files likely touched:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`

**Estimated scope:** Small — 2 files.

## Task 4: Focused automated verification

**Acceptance criteria:**
- [ ] Dotknuté Vitest súbory prechádzajú.
- [ ] `RecoveryAppBuilder.test.tsx` prechádza bez zmeny (regression pre druhého konzumenta sidebaru).
- [ ] Focused ESLint nad zmenenými TS/TSX súbormi bez warningov.
- [ ] `npm run typecheck` prechádza (kritické — mení sa union return type hooku).
- [ ] `git diff --check` prechádza.

**Verification:**

```text
npm exec vitest run \
  src/shared/components/resource-sidebar/ResourceSidebar.test.tsx \
  src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx \
  src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx \
  src/features/recovery-plans/recovery-applications/components/RecoveryAppBuilder.test.tsx

npm exec -- eslint <changed-ts-tsx-files> --max-warnings=0
npm run typecheck
git diff --check
```

**Dependencies:** Tasks 1–3.

**Files likely touched:** None beyond direct regression fixes.

**Estimated scope:** Small.

## Task 5: Mandatory browser verification

**Description:** Spustiť lokálnu app a overiť loading stav reálne. Ide o časovo podmienený vizuál, ktorý unit testy nedokážu potvrdiť ako UX.

### Setup

```text
npm run dev
```

Route: `/recovery-plans/recovery-groups/create` → workload type `VMware virtual machines` → provider → step `Resources`.

Browser viewport: `1542 × 765`.

### Scenario A — VMware search

- [ ] Prvý vstup do stepu zobrazí skeleton (nezmenené chovanie), potom zoznam VM.
- [ ] Po napísaní znaku sa zoznam **okamžite** prepne na skeleton (počas debounce, nie až po requeste).
- [ ] Search input zostáva focusnutý a dá sa doňho ďalej písať počas zobrazeného skeletonu.
- [ ] Po dokončení requestu skeleton zmizne a zobrazí sa filtrovaný zoznam.
- [ ] Vymazanie search textu cez `×` tiež zobrazí skeleton a potom plný zoznam.
- [ ] Rýchle písanie neprodukuje blikanie medzi skeletonom a starým zoznamom.
- [ ] Prázdny výsledok zobrazí `No matches`, nie zaseknutý skeleton.
- [ ] Console bez nových React chýb/warningov.

### Scenario B — non-VMware regression

- [ ] `IBM Power virtual machines` step: písanie do search filtruje lokálne a skeleton sa **nezobrazí**.
- [ ] `IBM FlashSystem` step: to isté.

### Scenario C — recovery application builder regression

Route: recovery application builder so `ResourceSidebar`.

- [ ] Sidebar sa chová identicky ako pred zmenou.

### Network assertions

- [ ] Jedno stlačenie klávesy nevytvorí request skôr ako po debounce.
- [ ] Skeleton je viditeľný už pred odoslaním requestu a zmizne až po jeho dokončení.

### Browser evidence

- [ ] Screenshot skeletonu počas hľadania s viditeľným textom v search inpute.
- [ ] Screenshot výsledného filtrovaného zoznamu.
- [ ] Console check.
- [ ] Network check.

**Dependencies:** Task 4 musí byť zelený.

**Files likely touched:** None; browser test je verification krok.

**Estimated scope:** Small.

## Final Definition of Done

- [ ] VMware VM search zobrazuje loading skeleton od prvého stlačenia klávesy až po doručenie výsledku.
- [ ] Search input počas loading stavu nie je disabled a nestráca focus.
- [ ] Použitý je existujúci `ListSkeleton` a existujúci `loadingLabel`; žiadny nový komponent ani i18n key.
- [ ] Non-VMware workload typy skeleton pri lokálnom filtrovaní nezobrazujú.
- [ ] `RecoveryAppBuilder` sidebar chovanie nezmenené.
- [ ] Focused testy, ESLint, typecheck, diff check prešli.
- [ ] Browser test prešiel, console/network skontrolované.
- [ ] Zmena je commitnutá atomicky iba s task-owned files.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Skeleton pri každom klávese pôsobí ako blikanie | Medium | Debounce 300 ms už existuje; browser Scenario A explicitne testuje rýchle písanie |
| Použitie existujúceho `isLoading` by disablovalo input a zhodilo focus | High | Samostatný `isSearching` prop; test na enabled searchbox v oboch test súboroch |
| Union return type hooku neprejde typecheckom | Medium | `isSearching` v oboch branchoch + povinný `npm run typecheck` v Task 4 |
| Zabudnuté `isSearching` v existujúcich test doubles zhodí typecheck | Low | Task 3 acceptance criteria to vyžaduje explicitne |
| Spread `nonVmwareQuery` zruší React Query property tracking a pridá re-rendery | Low | Vzor už existuje vo VMware branchi aj v `useVmwareResourceInventory`; komponent renderuje na tie isté polia |
| Skeleton prekryje stale-error alert počas refetchu | Low | Rovnaká precedencia už dnes platí pre `isLoading`; po zlyhaní je `isSearching` false a error sa zobrazí |

## Out of Scope

- Zmena debounce hodnoty 300 ms.
- Server-side search pre IBM Power / FlashSystem.
- Spinner alebo dimming alternatíva namiesto skeletonu.
- Redizajn `ResourceSidebar` layoutu.
- Zmena `useVmwareResourceInventory` lifecycle príznakov.
- Nesúvisiaci refaktor `RecoveryGroupResourcesStep`.

## Open Questions

Žiadne blokujúce otázky.
