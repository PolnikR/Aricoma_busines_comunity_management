# Úlohy: Discovery Settings → Discovery & Inventory

Plán: `tasks/discovery-settings-to-discovery-inventory-plan.md` (2026-10-04, `test` @ `a1dc23c0`).
Ide o ownership migration, nie redesign. Bez zmien backendu, OpenAPI, Orvalu, `src/generated/**` a `pages.discoverySettings.*`.

- [ ] Pred T1: `$base = git rev-parse HEAD` (baseline pre kontrolu renames, podľa plánu `a1dc23c0`).
- [ ] T1: `git mv` celej `providers-connectors/discovery-settings` → `discovery-inventory/discovery-settings` (19 súborov vrátane `DiscoveryScheduleCard` a testov)
  - 4 relatívne `../../providers/...` importy prepísať na alias `@/features/providers-connectors/providers/...`;
  - v `AppRoutes` zmeniť iba lazy import path;
  - URL sa ešte nemení.
- [ ] T2: route ownership
  - `routes.discoverySettings = '/discovery-inventory/discovery-settings'`, `routes.discoverySettingsLegacy` (iba redirect); `providerDiscoverySettings` zaniká;
  - reálna route v Discovery Inventory bloku s contained handle;
  - `RedirectPreservingSearch` pre starú URL (zachová `search` aj `hash`);
  - odstrániť položku z `providersConnectorsPages` a vetvu z `renderProvidersConnectorsRoutes`;
  - test URL na novú cestu, `router.test.tsx` contained zoznam, test redirectu.
- [ ] Checkpoint A: presunuté testy + router testy + typecheck zelené; stará URL presmeruje s `tab`/`providerId`.
- [ ] T3: sidebar a locale
  - sidebar: Settings preč z Providers & Connectors a pridať do Discovery & Inventory za Discovery Jobs;
  - `nav.providers.discovery` → `nav.discovery.settings` (en/cs/sk);
  - `AppSidebar.test.tsx`: aktívna skupina, poradie, Providers & Connectors bez Settings, Discovery Jobs nezmenený.
- [ ] T4: audit importov presunutej feature a opačného smeru. Pri čistom audite žiadny commit, iba zápis do todo. Pri nájdenom generickom helperi minimálna zmena a atomický commit.
- [ ] T5: regresia (Configuration, History, Notifications local-only, Schedule, search params, route, redirect, sidebar, Jobs placeholder).
- [ ] Checkpoint B: validácia z plánu §5 (vitest, grep starej cesty, parita `nav.*`, eslint, feature layout, typecheck, `git diff --check`, renames cez `git diff -M --stat "$base..HEAD"`); review.
