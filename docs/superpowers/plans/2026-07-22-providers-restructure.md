# Implementation Plan: Providers Restructure + Move Applications

## Overview
Split the two concerns that are currently mixed on the Providers page:
1. **Providers page** becomes a catalogue of supported provider technologies (VMware vCenter, IBM PowerVM, Microsoft Azure) with a detail page (Overview / Connections / Capabilities / Health tabs).
2. The **Recovery Applications** table (Production ERP System, Customer Portal, Create Application flow) moves out of Providers & Connectors into **Recovery Plans → Applications**, with clean routes and its own feature folder so the two areas no longer mix.

## Architecture Decisions
- **Providers are static mock data** (no API). A `providerRegistry` module is the single source of truth for the catalogue and each provider's connections/capabilities/health.
- **Applications feature physically moves** from `src/features/providers-connectors/recovery-applications/` to `src/features/recovery-plans/applications/`. Physical move (not just re-routing) is what removes the "mixing" for good.
- **Recovery Plans sidebar item becomes a submenu**: Overview + Applications. Matches the domain (applications belong to recovery planning) and keeps Providers clean.
- **Routes** are namespaced strictly:
  - Providers catalogue: `/providers-connectors/providers` and `/providers-connectors/providers/:providerId`
  - Applications: `/recovery-plans/applications`, `/recovery-plans/applications/create`, `/recovery-plans/applications/:id/edit`
- **Provider detail actions** ("View / Configure", "Enable") are display/navigation only for now (no backend). The top-right button is **"Add Provider"** rendered disabled with a "coming soon" tooltip — never "Create Application".

## Dependency Graph
```
routes.ts (new route keys)
  ├── providerRegistry (mock data + types)   ── Providers page ── Provider detail (tabs)
  └── move applications folder ── applications routes ── sidebar submenu
```

## Task List

### Phase 1: Providers catalogue (independent, additive)

## Task 1: Provider data model + static registry
**Description:** Define provider types and a static registry with the three seeded providers and their connections/capabilities.
**Acceptance criteria:**
- [ ] `Provider`, `ProviderConnection` types defined
- [ ] Registry seeds VMware vCenter (2 conns), IBM PowerVM (1 conn), Microsoft Azure (0 conns, Disabled)
- [ ] Helper to look up a provider by id
**Verification:** `npm run build` compiles; data shape matches the table + detail needs.
**Dependencies:** None
**Files:** `src/features/providers-connectors/providers/model/providerRegistry.ts` (new)
**Scope:** S

## Task 2: Providers catalogue table
**Description:** Rewrite ProvidersPage to show the technologies table: Provider, Type, Connections, Capabilities, Status, Actions. Top-right "Add Provider" (disabled placeholder). Row actions: "View / Configure" (Active) or "Enable" (Disabled) navigating to the detail page.
**Acceptance criteria:**
- [ ] Table renders the three providers with correct columns
- [ ] Status badge (Active green / Disabled grey)
- [ ] Row action navigates to `/providers-connectors/providers/:providerId`
- [ ] No "Create Application" button anywhere on this page
**Verification:** `npm run lint`, `npm run build`; manual: Providers page shows technologies, not applications.
**Dependencies:** Task 1
**Files:** `src/features/providers-connectors/pages/ProvidersPage.tsx`, new `components/ProvidersCatalogueTable.tsx`
**Scope:** M

## Task 3: Provider detail page with tabs
**Description:** New detail page: header (name, Status, Provider version, Connections count) + tabs Overview / Connections / Capabilities / Health. Connections tab shows a table: Name, Endpoint, Role, Status. Other tabs show summary content from the registry.
**Acceptance criteria:**
- [ ] Header shows status, version, connection count
- [ ] Four tabs switchable; Connections tab renders the connections table
- [ ] Back button returns to `/providers-connectors/providers`
- [ ] Unknown providerId shows a not-found state
**Verification:** `npm run lint`, `npm run build`; manual: click VMware vCenter → detail with tabs.
**Dependencies:** Task 1
**Files:** new `pages/ProviderDetailPage.tsx`, `components/ProviderConnectionsTable.tsx`
**Scope:** M

## Task 4: Provider routes
**Description:** Add the provider detail route and route key.
**Acceptance criteria:**
- [ ] `/providers-connectors/providers/:providerId` renders ProviderDetailPage
- [ ] Providers index still renders the catalogue
**Verification:** `npm run build`; manual navigation works.
**Dependencies:** Tasks 2, 3
**Files:** `src/app/router.tsx`, `src/app/routes.ts`
**Scope:** S

### Checkpoint: Providers catalogue
- [ ] Lint + build clean
- [ ] Providers page = technologies; clicking a provider opens detail with tabs
- [ ] Applications still reachable at old route (not broken yet)

### Phase 2: Move Applications to Recovery Plans

## Task 5: Move applications feature folder
**Description:** Move `src/features/providers-connectors/recovery-applications/` → `src/features/recovery-plans/applications/`. Update all imports and the `/api/recovery-applications` mock endpoint references stay unchanged (endpoint URL is fine; only import paths change).
**Acceptance criteria:**
- [ ] Folder relocated; no import references the old path
- [ ] `npm run build` compiles
**Verification:** `grep` finds no `providers-connectors/recovery-applications` imports; build passes.
**Dependencies:** None (can start after Phase 1 checkpoint)
**Files:** entire `recovery-applications/` tree → `recovery-plans/applications/`
**Scope:** M (mechanical, many import updates)

## Task 6: Applications routes under Recovery Plans
**Description:** Add routes: list `/recovery-plans/applications`, `create`, `:id/edit`. Add a proper view (the table's View button currently targets a nonexistent `:id` route → 404 → VMs). Decide: View opens the JSON modal (keep existing JsonViewer) instead of a dead route.
**Acceptance criteria:**
- [ ] List/create/edit routes work under `/recovery-plans/applications`
- [ ] View button no longer redirects to Virtual Machines
- [ ] Create/Back/Edit/Save navigation all use the new base path
**Verification:** `npm run lint`, `npm run build`; manual: create → back → create stays correct; view works.
**Dependencies:** Task 5
**Files:** `src/app/router.tsx`, `src/app/routes.ts`, applications pages/table nav paths
**Scope:** M

## Task 7: Sidebar — Recovery Plans submenu + remove apps from Providers
**Description:** Convert the "Recovery Plans" sidebar link into a submenu with Overview (`/recovery-plans`) and Applications (`/recovery-plans/applications`). Ensure Providers submenu is unchanged and no longer implies applications.
**Acceptance criteria:**
- [ ] Sidebar shows Recovery Plans → Applications
- [ ] Navigating Applications highlights the correct menu
- [ ] Providers menu highlights on provider pages
**Verification:** manual: sidebar highlighting correct on each page.
**Dependencies:** Task 6
**Files:** `src/layouts/app-shell/AppSidebar.tsx`
**Scope:** S

## Task 8: Remove dead Providers app-table code
**Description:** Delete `ProvidersTablePage.tsx` (old applications table inside Providers) and any now-unused imports it pulled from the applications feature.
**Acceptance criteria:**
- [ ] `ProvidersTablePage` removed; ProvidersPage renders the catalogue
- [ ] No dangling imports; lint clean
**Verification:** `npm run lint`, `npm run build`.
**Dependencies:** Tasks 2, 5
**Files:** `src/features/providers-connectors/pages/ProvidersTablePage.tsx` (delete)
**Scope:** S

### Checkpoint: Complete
- [ ] Lint + build clean
- [ ] Providers = technologies + detail tabs
- [ ] Applications live under Recovery Plans → Applications with correct routes
- [ ] Create → Back → Create and View all behave correctly
- [ ] No route falls through to Virtual Machines

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Folder move breaks many imports | High | Do move as isolated Task 5, build immediately after |
| Sidebar submenu conversion breaks highlighting | Medium | Follow existing Providers submenu pattern exactly |
| View button dead route persists | Medium | Explicitly fixed in Task 6 (JSON modal) |
| Old `routes.recoveryApplications` left dangling | Low | Remove/repoint during Task 6 |

## Open Questions
1. **Applications location** — confirm **Recovery Plans → Applications** (`/recovery-plans/applications`) vs a top-level `/applications`. Plan assumes the former.
2. **View action** — confirm View opens the **JSON modal** (recommended) rather than a separate read-only page.
3. **"Add Provider" button** — keep it **disabled/"coming soon"** (recommended) since providers are hardcoded, or omit it entirely?
