# TODO: Zjednotenie page layoutov a geometry contractu

Zdroj detailov: `tasks/page-layout-unification-plan.md`.

Pravidlo: nezačať ďalšiu fázu, kým príslušný checkpoint nie je zelený. Každý implementačný task musí zostať S/M a typicky <= 5 files.

## Safety

- [ ] Pred každou implementačnou session skontrolovať `git status --short`.
- [ ] Nikdy nestageovať ani neresetovať pre-existing OpenAPI/generated zmeny:
  - `openapi/abco-api.json`
  - `src/generated/api/models/orchestrationProvider.gen.ts`
  - `src/generated/api/models/orchestrationProviderRecord.gen.ts`
  - `src/generated/api/models/providerType.gen.ts`
  - `src/generated/api/zod.gen.ts`
- [ ] Žiadna API/business/query/filter zmena v rámci layout programu.

# Phase 1 — Foundation

- [ ] Task 1 — RED contract tests pre `PageFrame`, `PageSurface`, `TableSurface`.
- [ ] Task 2 — Implementovať `PageFrame` + `PageBody`.
- [ ] Task 3 — Implementovať `PageSurface`.
- [ ] Task 4 — Implementovať `TableSurface`.

## Checkpoint A

- [ ] Shared focused tests green.
- [ ] `npm run typecheck` green.
- [ ] `git diff --check` green.
- [ ] Shared primitive API review: žiadne feature imports ani optional-prop explosion.

# Phase 2 — Pilot

- [ ] Task 5 — Contained metadata pre Recovery Groups list + 3 Recovery Policy routes.
- [ ] Task 6 — Recovery Groups list migration.
- [ ] Task 7 — Recovery Policy shell + Snapshot Policies migration.
- [ ] Task 8 — Application Recovery + Clean Room policy table migration.
- [ ] Task 9 — Resources compatibility shell/panel -> shared primitives.
- [ ] Task 10 — Resources loading/error/empty containment alignment.
- [ ] Task 11 — Pilot browser gate.

## Pilot browser matrix

- [ ] Recovery Groups: empty / 1 row / many rows / error / mutation alert.
- [ ] Snapshot Policies + tab switching.
- [ ] Resources VMware.
- [ ] Resources FlashSystem.
- [ ] Resources IBM Power.
- [ ] Resources ISE smoke.
- [ ] Viewport `1542x765`.
- [ ] Viewport `1366x768`.
- [ ] Viewport `1920x1080`.
- [ ] Mobile `390x844` smoke.
- [ ] Pagination Y stabilný.
- [ ] Jeden vertical scroll owner.
- [ ] Horizontal DataTable scroll funguje.
- [ ] Console clean.

## Checkpoint B

- [ ] Pilot approved.
- [ ] No business/API diff.
- [ ] No nested-scroll regression.
- [ ] Až potom Phase 3/4/5.

# Phase 3 — Remaining table/list pages

- [ ] Task 12 — Providers.
- [ ] Task 13 — Platform Providers.
- [ ] Task 14 — Credentials.
- [ ] Task 15 — Recovery Applications list.
- [ ] Task 16 — Policy Sets; zachovať existing scroll fix.
- [ ] Task 17 — Recovery Runs.
- [ ] Task 18 — Contained mode pre migrated table routes.
- [ ] Task 19 — Table-page browser matrix.

## Table browser assertions

- [ ] Same archetype = same header/body/surface inset.
- [ ] 0/1/many rows nemenia surface H.
- [ ] Pagination je fixed footer.
- [ ] Empty/error/loading zostávajú v surface.
- [ ] No double vertical scrollbar.
- [ ] Horizontal scroll funguje.

## Checkpoint C

- [ ] Všetky table/list pages na shared contracte.
- [ ] `InventoryShell` nie je potrebný pre simple table pages.
- [ ] Browser matrix green.

# Phase 4 — Settings / Workspace

- [ ] Task 20 — Configuration outer contract + contained route.
- [ ] Task 21 — Discovery Settings outer workspace.
- [ ] Task 22 — Discovery History -> shared TableSurface.
- [ ] Task 23 — Recovery Actions shared shell + contained routes.
- [ ] Task 24 — Recovery Actions History embedded table.
- [ ] Task 25 — Identity Access outer frame + `IdentityContentPanel`.
- [ ] Task 26 — Identity Users + Realm Roles.
- [ ] Task 27 — Identity Clients + Client Scopes.
- [ ] Task 28 — Identity Organizations + User Federation.
- [ ] Task 29 — Identity Sessions + Permissions.
- [ ] Task 30 — Identity Events + Authentication.
- [ ] Task 31 — Identity Groups/RealmSettings/IdentityProviders regression pass.
- [ ] Task 32 — Workspace browser checkpoint.

## Checkpoint D

- [ ] Configuration stable.
- [ ] Discovery Settings all tabs stable.
- [ ] Recovery Actions all tabs stable.
- [ ] Identity Access table sections share one geometry contract.
- [ ] Identity non-table sections bez clippingu/regresie.
- [ ] `1366x768` no clipping.

# Phase 5 — Builders / Detail / Topology

- [ ] Task 33 — Recovery Group create/edit state boundaries.
- [ ] Task 34 — Recovery Application create/edit state boundaries.
- [ ] Task 35 — Builder primary surface + common wizard sidebar width.
- [ ] Task 36 — Provider Detail success/error/not-found geometry.
- [ ] Task 37 — Infrastructure outer contained workspace.
- [ ] Task 38 — Infrastructure loading skeleton geometry.
- [ ] Task 39 — Builder/detail/topology browser checkpoint.

## Builder decision gate

- [ ] Zmerať longest wizard labels v Group builderi.
- [ ] Zmerať longest wizard labels v Application builderi.
- [ ] Overiť SK/EN.
- [ ] Zvoliť jednu spoločnú sidebar width podľa browser evidence; nepoužiť náhodných 260px.

# Phase 6 — Loading fallbacks / Cleanup / Final

- [ ] Task 40 — `RouteLoadingSkeleton` archetype variants.
- [ ] Task 41 — Route fallback wiring.
- [ ] Task 42 — Reference check + odstránenie iba skutočne obsolete wrappers.
- [ ] Task 43 — Final cross-cutting automated verification.
- [ ] Task 44 — Final browser regression matrix.

## Final automated verification

- [ ] All focused suites green.
- [ ] Full `npm test`/complete Vitest green.
- [ ] `npm run typecheck` green.
- [ ] `npm run lint` green.
- [ ] `npm run build` green.
- [ ] `git diff --check` green.

## Final browser routes

### Table
- [ ] Providers.
- [ ] Recovery Groups.
- [ ] Recovery Policies.
- [ ] Recovery Runs.

### Inventory
- [ ] Resources.
- [ ] Resources ISE.

### Workspace
- [ ] Discovery Settings.
- [ ] Configuration.
- [ ] Recovery Actions.
- [ ] Identity Access.

### Builder / Detail / Topology
- [ ] Recovery Group Builder.
- [ ] Recovery Application Builder.
- [ ] Provider Detail.
- [ ] Infrastructure.

# Final Definition of Done

- [ ] Všetkých 26 route-level pages je vedome zaradených do archetypu.
- [ ] Same-archetype pages používajú rovnaký `PageFrame/PageBody/PageSurface` contract.
- [ ] Table row count nemení primary surface H ani pagination Y.
- [ ] Loading/error/empty nemenia outer primary surface boundary.
- [ ] Desktop contained pages majú jedného vertical scroll ownera.
- [ ] Browser scrollbar nespôsobuje unexpected horizontal jump.
- [ ] Resources metrics/tabs/filter summary/filtering/drawer zachované.
- [ ] Identity feature behavior zachované.
- [ ] Builder DnD/steps/footer behavior zachované.
- [ ] Typografia/farby/buttons/tables business obsah nezmenené.
- [ ] No API/OpenAPI/generated changes z tohto programu.
- [ ] Obsolete wrappers odstránené iba po 0-reference checku.
- [ ] Finálne tests/lint/typecheck/build/browser checks green.
