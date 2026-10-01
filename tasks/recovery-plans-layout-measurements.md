# Recovery Plans layout — browser verification

**Plan:** `tasks/recovery-plans-layout-alignment-plan.md`, Task 4 (human gate).
**Code under test:** commits `f35e3d73` (Apps + Groups), `fef4faa0` (Runs), `354e58d0` (Policies).

**Status:** vykonané 2026-10-01 v autentifikovanom prehliadači (pozri *Evidence*). 8 z 9 invariantov splnených; 1 **ACCEPTED DEVIATION** (výška surface headera s tabs vs Resources — content-driven difference, nie bug; akceptoval používateľ 2026-10-01). Follow-up gate pre 1366×600 spustený → `tasks/short-viewport-table-floor-plan.md`. Plán uzavretý.

## Ako merať

Autentifikovaný prehliadač na `http://localhost:5173` (nie `127.0.0.1` — Keycloak ho odmietne).
DevTools → Device toolbar → Responsive, nastaviť viewport. Hodnoty z `getBoundingClientRect()`, napr.:

```js
const r = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } }
const card = document.querySelector('main section > div')          // InventoryShell Card
const header = card?.firstElementChild                              // surface header (ak existuje)
const table = document.querySelector('main section[aria-label] section[aria-label]') // DataTableSurface
console.table({ h1: r(document.querySelector('main h1')), card: r(card), header: r(header), table: r(table),
  pageScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth })
```

Selektory sú pomôcka; ak nesedia, stačí screenshot s DevTools overlay.

## Viewporty

| ID | Viewport |
|---|---|
| V1 | 1536×864 |
| V2 | 1366×768 |
| V3 | 1366×600 |

## Routes

| # | Stránka | Route | Stavy |
|---|---|---|---|
| R1 | Platform Providers (reference) | `/platform-administration/platform-providers` | normal |
| R2 | Resources VMware (reference) | `/discovery-inventory/resources` (VMware tab) | normal |
| R3 | Recovery Apps | `/recovery-plans/recovery-applications` | normal, empty, error, delete error (`notice`) |
| R4 | Recovery Groups | `/recovery-plans/recovery-groups` | normal, empty, error, delete error (`notice`) |
| R5 | Recovery Runs — All | `/recovery-plans/recovery-runs` | normal, loading, empty |
| R6 | Recovery Runs — Applications | `/recovery-plans/recovery-runs?tab=applications` | normal |
| R7 | Recovery Runs — Recovery Groups | `/recovery-plans/recovery-runs?tab=groups` | normal |
| R8 | Snapshot policies | `/recovery-plans/recovery-policies/snapshot` | normal, empty |
| R9 | Application Recovery policies | `/recovery-plans/recovery-policies/application-recovery` | normal |
| R10 | Clean Room policies | `/recovery-plans/recovery-policies/clean-room` | normal |
| R11 | Policy Sets (reference, nezmenené) | `/recovery-plans/policy-sets` | normal |

## Čo merať (každá route × V1–V3)

- `PageHeader`: top, height
- Card: top/Y, X, W, H
- surface header: height
- padding wellu (Card → `DataTableSurface`)
- top `DataTableToolbar`
- výška data viewportu, počet viditeľných riadkov
- pozícia pagination
- horizontálny page scroll (áno/nie)
- pri R5–R10: X/W/H Card pred a po prepnutí tabu

## Očakávané invarianty

- [ ] Card X/W všetkých Recovery stránok = Platform Providers R1 (±1 px).
- [ ] Card top/Y = R1 (±1 px) **iba v normal stave bez `notice`/`metrics`**.
- [ ] S `notice` (delete/mutation/error Alert) je posun Card nadol očakávaný — nie regresia; Y sa neporovnáva s R1.
- [ ] `notice` nemení X/W Card a nevytvára horizontálny overflow.
- [ ] Surface header s tabs (R5–R10) má rovnakú výšku ako R2.
- [ ] Žiadny prázdny surface header, žiadny duplikovaný text (h2 ≠ h1, description karty ≠ page description).
- [ ] Žiadny voľný informačný text mimo Card; explicitný `InventoryShell.notice` je povolený a zámerne nad Card.
- [ ] Prepínanie tabov nemení X/W/H Card.
- [ ] Žiadny horizontálny page scroll.

**Follow-up gate:** ak V3 (1366×600) ukáže kolaps tabuľky (napr. < 3 viditeľné riadky), vznikne samostatný
plán pre short-viewport floor — nie súčasť tohto plánu.

## Evidence

**Run:** 2026-10-01, HEAD `62fbe47c`, dev server `http://localhost:5173`, Microsoft Edge (Playwright
`playwright-core`, headed, mimo repa). Používateľ prihlásil prehliadač do Keycloak; merania a screenshots
vykonal skript agenta v tomto autentifikovanom okne. Všetky `delete_*` / `rollback_*` / `submit_*` requesty
boli zachytené a mockované (409) — žiadny zápis do backendu. Empty/error stavy: mockované list odpovede.
Hodnoty sú `getBoundingClientRect()` v CSS px. Surové dáta a screenshots ostali v scratchpade session (necommitnuté).

### Card, surface header, table — normal state

| Route | V1 1536×864 Card x/y/w/h | V2 1366×768 Card x/y/w/h | V3 1366×600 Card x/y/w/h | Surface header h (V1/V2/V3) | Data viewport h (V1/V2/V3) | Plne viditeľné riadky / v DOM (V1/V2/V3) |
|---|---|---|---|---|---|---|
| R1 Platform Providers | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 57/57/57 | 401/305/137 | 4/4 · 4/4 · 2/4 |
| R2 Resources VMware | 337/210/1150/617 | 337/210/981/521 | 337/210/966/480 | 62/85/85 | 350/231/190 | 2/2 · 2/2 · 2/2 |
| R3 Recovery Apps | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 57/57/57 | 401/305/137 | 1/1 · 1/1 · 1/1 |
| R4 Recovery Groups | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 57/57/57 | 401/305/137 | 1/1 · 1/1 · 1/1 |
| R5 Runs — All | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 1/1 · 1/1 · 1/1 |
| R6 Runs — Applications | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 1/1 · 1/1 · 1/1 |
| R7 Runs — Recovery Groups | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 1/1 · 1/1 · 1/1 |
| R8 Snapshot policies | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 5/5 · 4/5 · 1/5 |
| R9 Application Recovery policies | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 3/3 · 2/3 · 0/3 |
| R10 Clean Room policies | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 58/58/58 | 399/303/135 | 2/2 · 2/2 · 2/2 |
| R11 Policy Sets | 337/165/1150/662 | 337/165/981/566 | 337/165/981/398 | 57/57/57 | 401/305/137 | 2/2 · 2/2 · 2/2 |

Spoločné pre všetky routes a viewporty: `PageHeader` top 93 / h 56; well padding 12 px; `DataTableToolbar` h 73;
pagination h 65. Surface tabs (R5–R10): tablist h 38, `border-bottom-width` 0 px (R2: tablist h 40, 0 px).
R2 je na Y 210 kvôli `metrics` slotu (iná slot topológia).

### Tab switch (Card x/y/w/h pred a po každom prepnutí)

| Viewport | R5 Runs: All → Applications → Recovery Groups → All | R8 Policies: Snapshot → App Recovery → Clean Room → Snapshot |
|---|---|---|
| V1 | 337/165/1150/662 vo všetkých krokoch | 337/165/1150/662 vo všetkých krokoch |
| V2 | 337/165/981/566 vo všetkých krokoch | 337/165/981/566 vo všetkých krokoch |
| V3 | 337/165/981/398 vo všetkých krokoch | 337/165/981/398 vo všetkých krokoch |

URL po prepnutí: `?tab=applications`, `?tab=groups`, bez parametra; policy tabs navigujú na svoje routes.

### States (V2 1366×768)

| Stav | Card x/y/w/h | Nad Card | Horizontálny scroll |
|---|---|---|---|
| R4 Groups empty (mock `[]`) | 337/165/981/566 | nič | nie |
| R4 Groups load error (mock 503) | 337/165/981/566 | nič | nie |
| R3 Apps load error (mock 503) | 337/165/981/566 | nič | nie |
| R11 Policy Sets load error (mock 503) | 337/165/981/566 | nič | nie |
| R4 Groups delete error (`notice`, mock 409) | 337/250/981/481 | `role="alert"` 337/165/981/70 | nie |

Nemerané: Runs loading, Apps/Snapshot empty, Apps delete `notice`. Nie je blocker (rozhodnutie používateľa): ekvivalentné slot topológie sú overené na iných pages/states (Groups empty/error/notice, Apps/Policy Sets error) a focused testy tieto stavy pokrývajú.

### Text

Pre každú route: h2 surface headera ≠ h1 a description karty ≠ page description; žiadny surface header bez
title (ľavý blok prítomný na R1–R11). V normal stave nie je nad Card žiadny element.

### Výsledok invariantov

- [x] Card X/W = R1 na všetkých Recovery routes a viewportoch (zhoda 0 px).
- [x] Card Y = R1 (165) v normal stave bez `notice`/`metrics` (zhoda 0 px).
- [x] S `notice` sa Card posunie nadol o 85 px (alert 70 + gap 16, zaokrúhlené na celé px); očakávané.
- [x] `notice` nemení X/W Card (337/981) a nevytvára horizontálny overflow.
- [x] **ACCEPTED DEVIATION — content-driven difference, nie bug** (akceptoval používateľ 2026-10-01; Recovery ani shared komponenty sa nemenia): surface header s tabs (R5–R10: 58 px) ≠ R2 (62 px na V1, 85 px na V2/V3).
  Recept je rovnaký (tablist `border-bottom` 0 px na oboch). Rozdiel spôsobuje obsah R2: provider badge
  v tab labeloch (tablist 40 vs 38 px), scroll controls a na V2/V3 zalomený provider-filter description.
  Recovery tabbed headery (58) sú o 1 px vyššie než canonical headery bez tabs (57). Absolútna zhoda s R2 sa nevynucuje.
- [x] Žiadny prázdny surface header, žiadny duplikovaný text.
- [x] Žiadny voľný informačný text mimo Card; jediný element nad Card je `notice` alert.
- [x] Prepínanie tabov nemení X/W/H Card (zhoda 0 px).
- [x] Žiadny horizontálny page scroll.

**Follow-up gate — spustený:** na V3 1366×600 má data viewport Recovery stránok 135–137 px; R8 ukazuje
1 z 5 riadkov, R9 0 z 3 plne viditeľných. Rovnaký stav má reference R1 Platform Providers (137 px, 2 zo 4).
R2 Resources drží `lg:min-h-[480px]` a route scrolluje. → Samostatný follow-up plán `tasks/short-viewport-table-floor-plan.md`
(cross-feature: Recovery + Providers + Platform Providers + Policy Sets), nie súčasť tohto plánu.

### Pre-existing pozorovania (mimo scope, bez zmeny)

- `cn()` nemerguje triedy: v surface tabs ostáva `padding-left` 12 px (`px-3` z `Tabs` vyhráva nad `px-0`)
  — rovnako na R2 Resources.
- Surface header je voči Card odsadený o 21 px (border 1 + `sm:p-5` z `Card`, napriek `sm:p-0` z `InventoryShell`)
  — rovnako na R1 Platform Providers aj R2 Resources.
