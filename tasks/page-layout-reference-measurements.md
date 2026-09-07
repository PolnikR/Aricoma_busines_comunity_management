# Resources canonical browser measurements

**Task:** Page layout unification — Task 4

**Date:** 2026-09-03

## Manual browser evidence

### Authenticated recheck — 2026-09-07

- Keycloak authentication succeeded at `http://localhost:5173`; `127.0.0.1` was rejected as an invalid redirect URI.
- Identity & Access at `1366x768` rendered the aligned header/action, navigation, shared Users surface, toolbar, rows, and fixed pagination without observed clipping.
- Resources was rechecked after launching the local Vite process with access to the internal backend: VMware showed two rows, FlashSystem progressed from loading to 52 rows, and IBM Power progressed from loading to its empty state. In each observed state the toolbar, contained data viewport, and pagination boundary remained in place.

The application was reviewed in the authenticated user browser because the
isolated browser cannot navigate to the internal Keycloak host. The following
runtime states were observed from the supplied screenshots.

| Route | Tab / state | Observed result |
|---|---|---|
| Resources | VMware VMs, 2 rows | Header, metrics, primary surface, table toolbar, and fixed pagination render in the canonical containment hierarchy. |
| Resources | FlashSystem Volumes, 52 records / 10 visible | The populated table keeps pagination fixed at the panel bottom; the data viewport contains the overflow. |
| Resources | IBM Power Partitions, empty | Empty state remains inside the table surface with toolbar and pagination retained. |
| Resources ISE | VMware VMs, 2 rows | Target route follows the same header, primary surface, toolbar, and pagination geometry. |
| Resources ISE | Filter modal | Modal opens over the table surface with `Cancel`, `Clear all`, and `Apply` controls. |
| Resources ISE | VM detail drawer | Drawer opens on the right without shifting the underlying table surface or pagination. |
| Resources ISE | VMware VMs, filtered to 1 row | Pagination stays at the fixed panel bottom with the one-row result. |
| Resources | VMware VMs, 200 records at `1366x768` | The data viewport scrolls internally while pagination remains fixed. |
| Resources | VMware VMs, 200 records at `1542x765` | The table keeps the canonical contained surface and fixed pagination. |
| Resources | VMware VMs, 200 records at `1920x1080` | The expanded desktop view preserves the same header, surface, and pagination ownership. |
| Resources ISE | VMware VMs, 1 row at `390x844` | Mobile layout is usable; the table retains horizontal scrolling and fixed pagination. |
| Resources | VMware VMs, loading | Metrics, tabs, primary surface, and a fixed skeleton footer remain inside the canonical geometry. |
| Resources | FlashSystem Volumes, loading | The FlashSystem skeleton preserves the same primary surface and fixed footer ownership. |
| Resources | VMware VMs, 200 records after shared frame/surface extraction | The canonical primary surface, internal data scrollbar, and fixed pagination remain unchanged. |
| Resources ISE | VMware VMs, 1 row after shared frame/surface extraction | The target inventory keeps the same contained surface, toolbar, and fixed pagination. |

## Coverage limitations

- Resources ISE currently exposes only the VMware provider tab, so its
  FlashSystem and IBM Power variants could not be reviewed.
- No-provider and fatal-error states were not available in the authenticated
  runtime and were not fabricated.
- No console capture was available from the user-managed browser.

The no-provider and fatal-error variants remain unavailable from the supplied
authenticated backend, so they were verified by the existing route/component
tests rather than fabricated in the browser.

## Final authenticated browser regression — 2026-09-07

| Archetype / routes | Observed result |
|---|---|
| Table: Resources, Resources ISE, Providers | Shared header and primary surface are intact. Providers rendered five real records with search, density/filter controls, contained data grid, and fixed footer. At `390x844` the responsive shell exposes a sidebar toggle and preserves the data surface. |
| Workspace: Configuration, Identity & Access, Discovery Settings, Recovery Actions | Configuration rendered stable form sections and disabled save state; Identity rendered its shared Users data surface at `1366x768`; Discovery Settings and Recovery Actions rendered their workspace tabs and contained data/table sections. Recovery history rendered four rows inside the evidence surface. |
| Builder/detail: Recovery Group, Recovery Application, Provider Detail | Browser checks confirmed the shared builder header/sidebar/content frame and the preserved contained error/not-found/detail geometry without invoking mutation actions. |
| Topology/document: Infrastructure Topology, work queue | Infrastructure loaded the live topology graph (212 nodes / 211 relations) within its explicit viewport; the document/work queue route retained its natural-scroll workspace layout. |

The topology check emitted one pre-existing non-fatal console warning from ELK's
optional `web-worker` package fallback. No browser errors were observed during
the final route checks.
