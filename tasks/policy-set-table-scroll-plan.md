# Implementation Plan: Policy Set Table Scroll Layout

## Overview

Oprava zabezpečí, že Policy Sets stránka využije dostupnú výšku aplikácie bez odrezania pagination. Toolbar a pagination zostanú fixné v paneli, zatiaľ čo iba obsah tabuľky bude na desktopoch vertikálne scrollovateľný. Zdieľaný `DataTable` ostane zodpovedný iba za horizontálny scroll.

## Root Cause

Výškový flex reťazec je prerušený v `PolicySetsPage`: wrapper s `flex-1` nie je flex kontajner. `InventoryShell` preto nemôže využiť svoje `flex-1`, rastie podľa obsahu tabuľky a nadradený `overflow-hidden` odreže spodnú časť vrátane pagination. Predchádzajúci vnútorný `overflow-y-auto` nevyriešil chýbajúce výškové obmedzenie rodiča.

## Architecture Decisions

- Opraviť flex reťazec lokálne v Policy Sets stránke pomocou `flex`, `min-h-0`, `min-w-0` a `flex-col` na wrapperi, ktorý priamo vlastní `InventoryShell`.
- Doplniť `min-w-0` na vnútorný panel a koreň `PolicySetsTable`, aby široká tabuľka nerozťahovala stránku mimo viewportu.
- Vertikálny scroll ponechať iba na obsahovej oblasti medzi toolbarom a pagination; pagination už používa `shrink-0` a zostane stále viditeľná.
- Vertikálny nested scroll aktivovať až od desktop breakpointu, rovnako ako `ResourceInventoryPanel`; mobilná stránka zostane prirodzene scrollovateľná.
- Nemeniť globálny `DataTable`, API, pagination logiku ani počet riadkov na stránku.

## Dependency Graph

```text
PolicySetsPage constrained flex wrapper
    -> InventoryShell receives a bounded height
        -> PolicySetsTable fills the panel
            -> table body becomes the only vertical scroll owner
                -> pagination remains fully visible
```

## Task 1: Zachytiť layout regresiu

**Description:** Rozšíriť focused testy o štrukturálne invarianty layoutu a pripraviť browser scenár, ktorý reprodukuje odrezanú pagination pri obmedzenej výške viewportu.

**Acceptance criteria:**

- [ ] Test identifikuje kontajner, ktorý musí byť `flex`, `min-h-0`, `min-w-0` a `flex-col`.
- [ ] Test identifikuje samostatnú scroll oblasť medzi toolbarom a pagination.
- [ ] Browser scenár používa dostatok riadkov alebo dostatočne nízky viewport, aby tabuľka reálne pretekala.

**Verification:**

- [ ] RED focused test: `npm run test -- src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx --run`
- [ ] Pred úpravou browser scenár reprodukuje odrezanú pagination.

**Dependencies:** None

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Estimated scope:** Small: 2 files

## Task 2: Opraviť výškový a šírkový flex reťazec

**Description:** Upraviť lokálne wrappery Policy Sets stránky tak, aby `InventoryShell` dostal skutočne ohraničenú výšku a vnútorný panel sa mohol zmenšiť bez horizontálneho alebo vertikálneho pretečenia stránky.

**Acceptance criteria:**

- [ ] Wrapper priamo nad `InventoryShell` je flex kontajner s `flex-1`, `min-h-0`, `min-w-0`, `flex-col` a `overflow-hidden`.
- [ ] Vnútorný panel a koreň tabuľky majú `min-w-0` a zachovajú `min-h-0`.
- [ ] Globálny `InventoryShell` a `DataTable` sa nemenia.

**Verification:**

- [ ] Focused page a component testy prejdú.
- [ ] Focused ESLint pre zmenené TSX súbory prejde bez warningov.
- [ ] `git diff --check` prejde.

**Dependencies:** Task 1

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/pages/PolicySetsPage.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`

**Estimated scope:** Small: 2 files

## Task 3: Ustáliť scroll owner a pagination

**Description:** Zosúladiť vnútornú scroll oblasť s Resources vzorom: toolbar a pagination budú `shrink-0`, tabuľkové riadky dostanú zostávajúcu výšku a vertikálny scroll iba na desktopoch.

**Acceptance criteria:**

- [ ] Pri pretečení scrollujú iba riadky tabuľky; hlavička stránky, table toolbar a pagination zostávajú viditeľné.
- [ ] Pagination je celá vo vnútri panela a nepretína spodný okraj ani viewport.
- [ ] Horizontálny scroll `DataTable` zostane funkčný bez horizontálneho rozťahovania stránky.

**Verification:**

- [ ] Browser kontrola pri približne `1366x768`, `1920x1080` a pri rozmere reprodukujúcom dodaný screenshot.
- [ ] Overiť compact aj comfortable density.
- [ ] Overiť nulový, krátky a pretekajúci zoznam; pagination je viditeľná vo všetkých stavoch bez chyby.

**Dependencies:** Task 2

**Files likely touched:**

- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx`
- `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`

**Estimated scope:** Small: 2 files

## Checkpoint: Complete

- [ ] Focused Policy Sets testy prešli.
- [ ] Focused lint a `git diff --check` prešli.
- [ ] Browser overenie potvrdilo plne viditeľnú pagination a funkčný scrollbar.
- [ ] Screenshot pred/po zachytáva opravený stav.
- [ ] Commit obsahuje iba súbory súvisiace s touto opravou.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ďalší `overflow-auto` vytvorí nested scroll | Medium | Presne jeden vertikálny scroll owner medzi toolbarom a pagination |
| Flex prvok sa odmietne zmenšiť | High | `min-h-0` a `min-w-0` na každom relevantnom flex rozhraní |
| Mobilný layout bude mať vnorený scrollbar | Medium | Vertikálny scroll aktivovať až na desktop breakpointe |
| Zmena shared komponentu ovplyvní ďalšie stránky | Medium | Opravu držať lokálne; shared komponenty nemeniť |
| JSDOM test prejde, ale CSS layout ostane zlý | High | Povinné browser overenie s pretekajúcim datasetom a viacerými viewportmi |

## Open Questions

- Žiadne. Požadovaný výsledok je zrejmý zo screenshotu: table toolbar a pagination zostanú celé viditeľné, scrollujú sa iba riadky.
