# Úlohy: Discovery Settings → Discovery & Inventory

Plán: `tasks/discovery-settings-to-discovery-inventory-plan.md` (2026-10-04, `test` @ `a1dc23c0`).
Ide o ownership migration, nie redesign. Bez zmien backendu, OpenAPI, Orvalu, `src/generated/**` a `pages.discoverySettings.*`.

- [x] Pred T1: `$base = git rev-parse HEAD` (baseline pre kontrolu renames, podľa plánu `a1dc23c0`).
- [x] T1: `git mv` celej `providers-connectors/discovery-settings` → `discovery-inventory/discovery-settings` (19 súborov vrátane `DiscoveryScheduleCard` a testov)
  - 4 relatívne `../../providers/...` importy prepísať na alias `@/features/providers-connectors/providers/...`;
  - v `AppRoutes` zmeniť iba lazy import path;
  - URL sa ešte nemení.
- [x] T2: route ownership
  - `routes.discoverySettings = '/discovery-inventory/discovery-settings'`, `routes.discoverySettingsLegacy` (iba redirect); `providerDiscoverySettings` zaniká;
  - reálna route v Discovery Inventory bloku s contained handle;
  - `RedirectPreservingSearch` pre starú URL (zachová `search` aj `hash`);
  - odstrániť položku z `providersConnectorsPages` a vetvu z `renderProvidersConnectorsRoutes`;
  - test URL na novú cestu, `router.test.tsx` contained zoznam, test redirectu.
- [x] Checkpoint A: presunuté testy + router testy + typecheck zelené; stará URL presmeruje s `tab`/`providerId`.
- [x] T3: sidebar a locale
  - sidebar: Settings preč z Providers & Connectors a pridať do Discovery & Inventory za Discovery Jobs;
  - `nav.providers.discovery` → `nav.discovery.settings` (en/cs/sk);
  - `AppSidebar.test.tsx`: aktívna skupina, poradie, Providers & Connectors bez Settings, Discovery Jobs nezmenený.
- [x] T4: audit importov presunutej feature a opačného smeru. Pri čistom audite žiadny commit, iba zápis do todo. Pri nájdenom generickom helperi minimálna zmena a atomický commit.
- [x] T5: regresia (Configuration, History, Notifications local-only, Schedule, search params, route, redirect, sidebar, Jobs placeholder).
- [x] Checkpoint B: validácia z plánu §5 (vitest, grep starej cesty, parita `nav.*`, eslint, feature layout, typecheck, `git diff --check`, renames cez `git diff -M --stat "$base..HEAD"`); review.

## Výsledok (2026-10-04)

Baseline `$base` = `4ea33d3b` (commit plánu nad `a1dc23c0`).

Commity:
- `db49bfa7`: T1, presun.
- `7ae1b797`: T2, route a legacy redirect.
- `396ad6f1`: T3, sidebar a locale.
- T4: čistý audit, bez commitu. Mimo feature vedú iba `providers-connectors/providers/{helpers/providerTypeLabel, model/providerTypes, model/selectProviders}`; opačný smer nemá žiadny import.

Odchýlky a poznámky:
- `git mv` celého adresára zlyhal na Windows („Permission denied“, zamknutý adresár). Súbory sa presunuli cez `git mv` po jednom a prázdne staré adresáre sa odstránili. Git rozpoznal všetkých 19 súborov ako renames (13× R100, 6× R094–R099).
- Redirect test renderuje `RouterProvider` nad `createMemoryRouter(createRoutesFromElements(AppRoutes()))`, lebo `<Navigate>` presmeruje až pri renderovaní. `AppShell` je zamockovaný ako `Outlet` a stránka ako stub. Mutačná kontrola: s obyčajným `Navigate` test zlyhá.
- V T2 sa sidebar dočasne prepol na `routes.discoverySettings`; presun skupiny je v T3.

Overenie:
- Focused Vitest (plán §5): 16 súborov, 85 testov prešlo.
- Grep starej cesty: iba `routes.discoverySettingsLegacy` a redirect testy. `providerDiscoverySettings` a `nav.providers.discovery`: prázdne. Starý adresár neexistuje.
- Parita `nav.*` en/cs/sk, eslint zmenených TS/TSX, feature layout, typecheck, `git diff --check`: prešli.

Nespustené:
- celý test suite;
- production build;
- manuálny smoke v prehliadači.
