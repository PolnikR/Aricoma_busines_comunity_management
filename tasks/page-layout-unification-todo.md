# TODO: Zjednotenie page layoutov podľa Resources reference

**Revízia:** 2026-09-02 — Resources-first canonical baseline.

Zdroj detailov: `tasks/page-layout-unification-plan.md`.

Hlavné pravidlo: **najprv stabilizovať a browserovo schváliť Resources/Resources ISE, až potom ich použiť ako canonical reference pre ostatné pages.** Nevytvárať nový abstraktný layout systém pred reference approval.

Každý implementačný task musí zostať S/M, typicky <= 5 files, s focused verification. Ďalší checkpoint sa nezačína, kým predchádzajúci nie je zelený.

## Safety

- [ ] Pred session `git status --short`.
- [ ] Stageovať iba task-owned files.
- [ ] Nedotknúť sa pre-existing `tasks/access-logs-audit-plan.md` a `tasks/access-logs-audit-todo.md`.
- [ ] Žiadna API/OpenAPI/generated/backend/business/query/filter semantics zmena.

# Phase 0 — Canonical Resources reference

- [ ] Task 1 — Resources reference contract tests + browser measurement targets.
- [ ] Task 2 — Resources + Resources ISE no-provider state v canonical primary surface.
- [ ] Task 3 — Zjednotiť Resources radius/request-state geometry; odstrániť `rounded-2xl` table contract oproti `rounded-[20px]` canonical Card.

## Checkpoint A0

- [ ] No-provider už neobchádza `InventoryShell`/primary surface.
- [ ] Loading/error/empty/data zachovávajú canonical boundary.
- [ ] Canonical bordered surface radius je jednotný.
- [ ] Focused Resources tests green.

- [ ] Task 4 — Browser canonical Resources matrix: Resources + Resources ISE, VMware/FlashSystem/IBM Power, no-provider/loading/error/empty/1/full/overflow rows.
- [ ] Task 5 — Generic contained frame extrahovaný iba z browser-approved `ResourceViewportFrame`.
- [ ] Task 6 — Shared `DataTableSurface` extrahovaný iba z browser-approved `ResourceInventoryPanel`.

## Checkpoint A1

- [ ] Shared APIs kopírujú proven Resources behavior, nie teoretický nový contract.
- [ ] Žiadne feature imports v shared primitives.
- [ ] Resources tests stále green.

- [ ] Task 7 — Re-verify Resources + Resources ISE po shared extraction.

## Checkpoint A — Canonical reference locked

- [ ] Desktop measurements uložené pre header/actions/primary surface/table viewport/pagination.
- [ ] Viewports `1542x765`, `1366x768`, `1920x1080`; mobile `390x844` smoke.
- [ ] Filter modal, tabs, horizontal scroll, detail drawer funkčné.
- [ ] 1 row nemení pagination Y.
- [ ] Až teraz začať migráciu ostatných pages.

# Canonical visual rules

- [ ] Outer X/Y vlastní `AppShell`; žiadny accidental double outer `p-3`.
- [ ] Page actions sú v `TableToolbar/PageHeader` right slot.
- [ ] Feature Add/Create action je pred Refresh.
- [ ] Table/inventory tabs sú v primary surface headeri.
- [ ] Table filters používajú `DataTableToolbar` + shared Modal, ak ide o table filter semantics.
- [ ] Search vľavo; density/filter controls vpravo.
- [ ] Table panel = toolbar / `minmax(0,1fr)` data viewport / fixed pagination.
- [ ] Iba data viewport vertikálne scrolluje.
- [ ] `DataTable` horizontal scroll ostáva.
- [ ] Canonical bordered surface radius = `rounded-[20px]`.
- [ ] Optional metrics/notice/tabs nevytvárajú fake spacers.

# Phase 1 — Table/list pages

- [ ] Task 8 — Providers.
- [ ] Task 9 — Platform Providers; zachovať AIRFLOW/SMTP/BACKEND/KEYCLOAK type-specific contract.
- [ ] Task 10 — Credentials.

## Checkpoint B1

- [ ] Providers/Platform Providers/Credentials header/action/surface geometry matches Resources.
- [ ] Add/Create + Refresh placement consistent.
- [ ] No nested vertical scroll.

- [ ] Task 11 — Recovery Applications list.
- [ ] Task 12 — Policy Sets; zachovať existujúci dobrý scroll fix.
- [ ] Task 13 — Recovery Groups list.

## Checkpoint B2

- [ ] 0/1/many rows stable.
- [ ] Empty/error/mutation state v canonical surface.
- [ ] Pagination anchor stable.

- [ ] Task 14 — Recovery Policy shell + Snapshot; tabs v Resources-style surface headeri.
- [ ] Task 15 — Application Recovery + Clean Room policy tables.
- [ ] Task 16 — Recovery Runs.

## Checkpoint B3

- [ ] Tabbed table pages share one tabs/surface/table geometry contract.
- [ ] Tab switching nemení outer surface X/W/H.

- [ ] Task 17 — Enable contained route metadata až po inner table migrations.
- [ ] Task 18 — Full table-page browser matrix.

## Checkpoint B — Table archetype complete

- [ ] All table/list pages derived from Resources baseline.
- [ ] Same header/actions X/Y.
- [ ] Same primary surface left/right boundary.
- [ ] Fixed toolbar/data/pagination ownership.
- [ ] Filters consistent where present.
- [ ] No double inset / no double vertical scrollbar.

# Phase 2 — Settings / Workspace

- [ ] Task 19 — Configuration.
- [ ] Task 20 — Discovery Settings outer workspace.
- [ ] Task 21 — Discovery History embedded table -> shared data surface.

## Checkpoint C1

- [ ] Configuration + Discovery Settings stable at `1366x768`.
- [ ] History table uses canonical table contract.

- [ ] Task 22 — Recovery Actions shared shell for Execute/History/Schedule/Validate.
- [ ] Task 23 — Recovery Actions History embedded table.
- [ ] Task 24 — Identity Access outer frame/content panel.

## Checkpoint C2

- [ ] Recovery Actions + Identity outer header/Card geometry aligned.
- [ ] One vertical scroll owner per workspace branch.

- [ ] Task 25 — Identity Users + Realm Roles.
- [ ] Task 26 — Identity Clients + Client Scopes.
- [ ] Task 27 — Identity Organizations + User Federation.

## Checkpoint C3

- [ ] Identity list sections I share canonical data-surface geometry.

- [ ] Task 28 — Identity Sessions + Permissions.
- [ ] Task 29 — Identity Events + Authentication.
- [ ] Task 30 — Identity Groups/Realm Settings/Identity Providers non-table regression pass.

## Checkpoint C4

- [ ] Identity table sections consistent.
- [ ] Non-table sections bez clipping/regression.

- [ ] Task 31 — Workspace browser matrix.

## Checkpoint C — Workspace complete

- [ ] Header/action/primary Card geometry follows relevant Resources baseline rules.
- [ ] Table-specific filter/pagination semantics sa neaplikujú na non-table forms.
- [ ] No clipping at `1366x768`.

# Phase 3 — Builders / Detail / Topology / Document

- [ ] Task 32 — Recovery Group create/edit outer geometry.
- [ ] Task 33 — Recovery Application create/edit outer geometry.
- [ ] Task 34 — Builder primary Card + evidence-based common wizard sidebar width.

## Checkpoint D1

- [ ] Builder states preserve outer geometry.
- [ ] Longest SK/EN wizard labels measured before width decision.

- [ ] Task 35 — `ModuleWorkQueuePage` explicit alignment task.
- [ ] Task 36 — Provider Detail success/error/not-found geometry.
- [ ] Task 37 — Infrastructure outer topology workspace.

## Checkpoint D2

- [ ] ModuleWorkQueue consciously remains Document/workspace natural-scroll archetype.
- [ ] Provider Detail remains default-scroll detail archetype.
- [ ] Infrastructure has explicit topology scroll owner.

- [ ] Task 38 — Infrastructure loading skeleton geometry.
- [ ] Task 39 — Builder/detail/topology/document browser matrix.

## Checkpoint D — Non-table archetypes complete

# Phase 4 — Fallbacks / Cleanup / Final

- [ ] Task 40 — Archetype-aware `RouteLoadingSkeleton` variants.
- [ ] Task 41 — Wire route fallbacks to route matrix.
- [ ] Task 42 — Reference check + remove only truly obsolete wrappers.

## Checkpoint E1

- [ ] Table fallback resembles canonical Resources geometry.
- [ ] Workspace/builder fallback resembles real target archetype.
- [ ] No wrapper deleted without 0-reference/compatibility evidence.

- [ ] Task 43 — Final complete automated verification.
- [ ] Task 44 — Final browser regression matrix.
- [ ] Task 45 — Final 26-route traceability signoff.

# Final automated verification

- [ ] Complete Vitest green.
- [ ] `npm run typecheck` green.
- [ ] `npm run lint` green.
- [ ] `npm run build` green.
- [ ] `git diff --check` green.

# 26-route traceability signoff

- [ ] InfrastructurePage — Tasks 37–38.
- [ ] ResourcesPage — Tasks 1–7.
- [ ] ResourcesIsePage — Tasks 1–7.
- [ ] ModuleWorkQueuePage — Task 35.
- [ ] ConfigurationPage — Task 19.
- [ ] IdentityAccessPage — Tasks 24–30.
- [ ] PlatformProvidersPage — Task 9.
- [ ] CredentialsPage — Task 10.
- [ ] DiscoverySettingsPage — Tasks 20–21.
- [ ] ProviderDetailPage — Task 36.
- [ ] ProvidersPage — Task 8.
- [ ] RecoveryActionsExecutePage — Task 22.
- [ ] RecoveryActionsHistoryPage — Tasks 22–23.
- [ ] RecoveryActionsSchedulePage — Task 22.
- [ ] RecoveryActionsValidatePage — Task 22.
- [ ] PolicySetsPage — Task 12.
- [ ] RecoveryApplicationBuilderPage — Tasks 32–34.
- [ ] RecoveryApplicationEditorPage — Tasks 32–34.
- [ ] RecoveryApplicationsListPage — Task 11.
- [ ] RecoveryGroupBuilderPage — Tasks 32–34.
- [ ] RecoveryGroupEditorPage — Tasks 32–34.
- [ ] RecoveryGroupsListPage — Task 13.
- [ ] RecoveryAppPoliciesPage — Tasks 14–15.
- [ ] CleanRoomPoliciesPage — Tasks 14–15.
- [ ] SnapshotPoliciesPage — Task 14.
- [ ] RecoveryRunsPage — Task 16.

# Final Definition of Done

- [ ] Resources/Resources ISE no-provider state uses canonical primary surface.
- [ ] No mixed canonical `rounded-2xl` vs `rounded-[20px]` table/surface contract.
- [ ] Resources browser baseline approved before other migrations.
- [ ] Shared geometry primitives are proven Resources extractions only.
- [ ] Same table archetype matches Resources-derived header/actions/tabs/filter/table/pagination placement.
- [ ] Add/Create action before Refresh in canonical header action slot.
- [ ] 0/1/many rows do not move pagination or resize primary table surface.
- [ ] Loading/error/empty/no-provider preserve canonical boundary.
- [ ] Desktop contained pages have one vertical scroll owner.
- [ ] Mobile natural scroll usable.
- [ ] All 26 route-level pages have archetype + task + route mode + scroll owner.
- [ ] `ModuleWorkQueuePage` and `ResourcesIsePage` are explicitly covered.
- [ ] No API/OpenAPI/generated/backend/business/query/filter semantics changes.
- [ ] Final automated + browser checks green.
