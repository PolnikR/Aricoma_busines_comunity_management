# TODO: Short-viewport floor pre table pages

Plán: `tasks/short-viewport-table-floor-plan.md` (r1, 2026-10-01).
Stav: **čaká na schválenie** — nič neimplementované.

## Safety

- Nemeniť `AppShell`, route `contentScroll` handles, `PageHeader`, `TableToolbar`, `DataTable*`, `Tabs`, `Card`.
- Nemeniť správanie `InventoryShell` ani `ContainedViewportFrame`; Task 2 iba pridá shared konštantu.
- Neimportovať `ResourceInventoryShell`, `ResourceViewportFrame` ani `RESOURCE_INVENTORY_MIN_HEIGHT`.
- Nemeniť Resources / Resources ISE / Infrastructure.
- Nemeniť business logiku, tabuľky, hooky, drawery, modaly, routing.
- Concurrency protocol A–D (pozri plán) v každom implementačnom tasku; nikdy nestageovať `.claude/scheduled_tasks.lock`.
- Každý task = samostatný atomický commit po focused verifikácii.

---

## Task 1: Baseline meranie pred zmenou (bez kódu)

**Description:** Agent pripraví a spustí merací skript (Edge, `playwright-core` v scratchpade); človek sa prihlási
do Keycloak. Zmerať aktuálny stav na HEAD pred Task 2.

**Routes:** Recovery Apps, Groups, Runs, Snapshot / App Recovery / Clean Room policies, Policy Sets, Providers,
Platform Providers; kontext: Credentials, Audit, Resources VMware.
**Viewporty:** 1536×864, 1366×768, 1366×600; jazyk en aj sk.
**Merať:** Card h, data viewport h, plne viditeľné riadky / v DOM, `<main>` a root frame `scrollHeight` vs `clientHeight`.

**Acceptance criteria:**
- [ ] Evidence zapísané do `tasks/short-viewport-table-floor-measurements.md` iba z reálneho behu.
- [ ] Potvrdené, že pri 480 px nie je Card h žiadnej in-scope route na 1366×768 / 1536×864 (en, sk) v normal stave pod 480; inak upraviť hodnotu v pláne pred Task 2.
- [ ] Odpoveď na Open Question 1 (Credentials, Audit) pripravená z dát.

**Dependencies:** None · **Files:** `tasks/short-viewport-table-floor-measurements.md` · **Scope:** S

---

## Task 2: Shared floor konštanta

**Description:** Pridať exportovanú `INVENTORY_SURFACE_MIN_HEIGHT = 'lg:min-h-[480px]'` (hodnota podľa Task 1)
do `src/shared/components/inventory-shell/`. Ak eslint nepovolí export z `InventoryShell.tsx`, použiť samostatný
`inventoryShellLayout.ts`.

**Acceptance criteria:**
- [ ] Konštanta je exportovaná zo shared modulu; žiadny consumer sa zatiaľ nemení.
- [ ] Test overí hodnotu a to, že `InventoryShell` s ňou dá sekcii floor a odstráni `lg:min-h-0`.

**Verification:**
- [ ] `npm exec vitest run src/shared/components/inventory-shell/InventoryShell.test.tsx`
- [ ] `npx eslint <zmenené súbory>`

**Dependencies:** Task 1 · **Files:** `src/shared/components/inventory-shell/InventoryShell.tsx` (alebo `inventoryShellLayout.ts`), `InventoryShell.test.tsx` · **Scope:** XS

---

## Task 3: Recovery Apps, Groups, Runs — frame + floor

**Description:** V troch stránkach nahradiť root `<div className="flex min-h-full flex-col lg:h-full lg:min-h-0">`
shared `ContainedViewportFrame` a poslať `surfaceMinHeightClassName={INVENTORY_SURFACE_MIN_HEIGHT}` do `InventoryShell`.
Drawer v Runs ostáva vnútri frame (je `fixed`).

**Acceptance criteria:**
- [ ] Root je `ContainedViewportFrame`; sekcia `InventoryShell` má floor; žiadny element nemá súčasne `lg:min-h-0` a `lg:min-h-[…]`.
- [ ] Titles, tabs, notice, tabuľky a drawer bez zmeny.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/pages/RecoveryApplicationsListPage.test.tsx src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.test.tsx src/features/recovery-plans/recovery-runs/pages/RecoveryRunsPage.test.tsx`
- [ ] Do jedného testu na stránku assertion na floor sekcie a `lg:overflow-y-auto` frame.

**Dependencies:** Task 2 · **Files:** 3 pages + 3 page testy · **Scope:** M

---

## Task 4: Recovery Policies shell + Policy Sets — frame + floor

**Description:** Rovnaká zmena v `RecoveryPolicyPageShell` (pokrýva 3 policy routes) a `PolicySetsPage`.
Prepísať assertion v `PolicySetsPage.test.tsx` (dnes `lg:min-h-0` na shell roote) na nový contract.

**Acceptance criteria:**
- [ ] Policy shell aj Policy Sets majú `ContainedViewportFrame` root a floor na sekcii.
- [ ] Tabs, povinné title/description a navigácia shellu bez zmeny.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/components/RecoveryPolicyPageShell.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx`

**Dependencies:** Task 2 · **Files:** `RecoveryPolicyPageShell.tsx` (+ test), `PolicySetsPage.tsx` (+ test) · **Scope:** S

---

## Task 5: Providers + Platform Providers — frame + floor

**Description:** Rovnaká zmena v `ProvidersPage` a `PlatformProvidersPage`. Modaly (`ProvidersCreateModal`,
`PlatformProvidersModal`) ostávajú vnútri frame (sú `fixed`).

**Acceptance criteria:**
- [ ] Obe stránky majú `ContainedViewportFrame` root a floor na sekcii.
- [ ] Role filter, create modal a tabuľky bez zmeny.

**Verification:**
- [ ] `npm exec vitest run` na existujúce page testy oboch stránok (nájsť `ProvidersPage*.test.tsx`, `PlatformProvidersPage*.test.tsx`); pridať assertion na floor a frame.

**Dependencies:** Task 2 · **Files:** 2 pages + ich testy · **Scope:** S

---

## Checkpoint: Po Tasks 2–5

- [ ] Všetky focused testy z Tasks 2–5 zelené
- [ ] `npm run typecheck` zelený
- [ ] `npx eslint <všetky zmenené .ts/.tsx>` zelený
- [ ] `git diff --check` zelený
- [ ] `.claude/scheduled_tasks.lock` a cudzie zmeny nestageované
- [ ] Celý test suite ani build sa nespúšťajú

---

## Task 6: Browser matrix po zmene + evidence

**Description:** Rovnaký merací postup ako Task 1 (človek sa prihlási, agent meria); výsledky do
`tasks/short-viewport-table-floor-measurements.md`.

**Viewporty:** 1536×864, 1366×768, 1366×600, mobile 390×844.

**Invarianty:**
- [ ] 1536×864 a 1366×768 (normal stav, en + sk): Card geometria = baseline z Task 1; frame `scrollHeight == clientHeight`.
- [ ] 1366×600: Card h = floor; data viewport výrazne vyšší než baseline (~135 px); route frame scrolluje, nie `<main>`.
- [ ] Nikdy nie je súčasne scrollovateľný `<main>` aj frame (žiadny double vertical scroll); nested data scroll v `DataTableSurface` je povolený.
- [ ] Toolbar a pagination ostávajú vnútri Card; pagination dosiahnuteľná scrollom frame.
- [ ] Detail drawer a create/edit modal na 1366×600 po odscrollovaní frame: fixné, neorezané, neposúvajú sa.
- [ ] Mobile 390×844: prirodzený scroll dokumentu, frame bez vlastného scrollu, žiadny horizontálny page scroll.
- [ ] Žiadny horizontálny page scroll na desktope.
- [ ] Tab switch (Runs, Policies) nemení Card X/W/H.

**Dependencies:** Checkpoint · **Files:** `tasks/short-viewport-table-floor-measurements.md` · **Scope:** S
