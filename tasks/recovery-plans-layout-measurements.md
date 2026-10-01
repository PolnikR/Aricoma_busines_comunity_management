# Recovery Plans layout — browser verification

**Plan:** `tasks/recovery-plans-layout-alignment-plan.md`, Task 4 (human gate).
**Code under test:** commits `f35e3d73` (Apps + Groups), `fef4faa0` (Runs), `354e58d0` (Policies).

**Status:** checklist pripravený — **čaká na kontrolu človekom**. Sekcia *Evidence* je prázdna, kým
nebudú dodané screenshots alebo merania. Agent do nej zapisuje iba dodané výsledky, nič nevymýšľa.

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

_Zatiaľ žiadne dodané výsledky._
