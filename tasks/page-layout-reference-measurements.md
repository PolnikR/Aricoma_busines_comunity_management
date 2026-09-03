# Resources canonical browser measurements

**Task:** Page layout unification — Task 4

**Date:** 2026-09-03

## Manual browser evidence

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

## Coverage limitations

- Resources ISE currently exposes only the VMware provider tab, so its
  FlashSystem and IBM Power variants could not be reviewed.
- No-provider, loading, and fatal-error states were not available in the
  authenticated runtime and were not fabricated.
- No console capture was available from the user-managed browser.

Task 4 stays incomplete until those scenarios are available for real-browser
verification.
