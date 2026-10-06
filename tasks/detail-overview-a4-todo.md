# Todo: Shared Overview layout (A4)

Plan: `tasks/detail-overview-a4-plan.md`. Branch `spike/ant-design-shell`.
Planning only. Do not start until the user approves the plan.

**Ground rules for every task**
- Other sessions share this working tree. Before editing, `git diff -- <task files>` must be
  empty (or only ours). Commit with `git commit --only -m "…" -- <explicit paths>`, never from
  `git status` and never `git add -A`.
- Focused verification only: the test files listed in the task, plus `npx eslint <changed files>`.
  The full suite and `npm run build` run only if the user asks.
- Inside `id="overview"` only: keep the fields, order, labels, values, links, badges, copy
  actions and secondary values identical. Do not touch other sections.
- Production tasks (Phase 1+) use only the values recorded in plan §2.0 at Checkpoint 0.
- Browser checks run in an own Edge tab on CDP `:9333`. The user logs in to Keycloak once.

**Blocker (plan §0).** `src/shared/components/detail-view/index.ts` has a foreign uncommitted
change: the `DetailCopyButton` export was removed by another session.
- Task 6 is the only task that edits this file. It must not start until that change is
  committed or reverted by its owner, or explicitly resolved with the user.
- Never overwrite, stage or commit the foreign hunk.
- [x] Resolved 2026-10-06: the owner committed it as `90d66d79` (`refactor(detail-view): remove unused copy-button barrel export`). Re-check `git diff -- src/shared/components/detail-view/index.ts` for new foreign hunks right before Task 6.

---

## Phase 0: Prototype (no production code)

## Task 1: A4 variant with production-faithful footprint
**Description:** In `prototypes/detail-overview-design/`, add template `A4` (A1 tokens + A2
row rule) as plan D5/D6 specify:
- `minmax(min(12.75rem,100%),1fr)` auto-fill, `column-gap:0`
- cell `padding-inline-end:1.75rem`, `py-2`, `border-bottom` at `border/60`
- `clip-path: inset(-0.5rem -0.5rem 1px -0.5rem)` on the `dl`
- `grid-auto-flow: row` without `dense`
- 11.5px medium label, 2 px label → value step, mono at `text-text-primary`, prose capped at
  88ch

Switch A4's footprint to the planned production rule (plan D4):
- only plain strings are measured
- links, badges and other nodes are normal unless the dataset marks them `wide` (then full)

Mark `wide` on the dataset node fields the real consumers mark today (URLs, tags). Add A4 to
the "A family" compare set; A–E and A1–A3 stay unchanged.

**Acceptance criteria:**
- [x] Continuous horizontal row rules; no vertical rules, outer border or surface.
- [x] The last row has no rule for all datasets at MD/LG/XL/Narrow, Normal and Long.
- [x] Field order on screen equals the dataset order (no dense backfill).
- [x] A link field without `wide` stays one track, whatever its text length.

**Verification:**
- [x] CDP overflow matrix over every dataset × MD/LG/XL/Narrow × Normal/Long: no overflow.
- [x] Screenshots of Stress test at LG and XL.

**Result:**
- 288 template renders, all problem-free: 4 datasets × MD/LG/XL/Narrow × Normal/Long × 9
  templates.
- Measured on A4: no vertical or top borders, the last row ends on the clipped band, the
  screen order equals the DOM order, and the clip is applied.
- Finding: with a plain `border-bottom`, rows that end early (a wide field moving to the
  next row) had gaps in the rule.
- Fixed with the shadow rule (plan D5 revised). Screenshots: Stress LG (light) and XL Long
  (dark).

**Dependencies:** None. **Files:** `prototypes/detail-overview-design/templates.js`,
`index.html`, `data.js`. **Scope:** S

## Task 2: Multi-group dataset, A4-grouped vs A4-flat
**Description:** Add a VM-style dataset that mirrors `VirtualMachineDetailPanel`:
- **Compute:** vCPU, Memory (emphasis)
- **Guest:** OS, Hostname, IP (mono)
- **Placement:** Cluster (+ host secondary), Datastore (+ disks secondary), Folder (string),
  Tags (pill node, `wide`)

Give it Long overrides: long OS name, hostname, cluster, folder path and tag list. Fields
carry a `group`. Add two templates over the same field list:
- `A4-grouped`: one titled A4 block per group, `h4` like `DetailFieldGroup`
- `A4-flat`: one A4 grid, no headings, same order

Add a compare option "A4 grouped vs flat" that shows both side by side for the current
dataset and width.

**Acceptance criteria:**
- [x] Both variants render the same fields in the same order. The only difference is the
  headings and block breaks.
- [x] For datasets without groups, the two variants are identical.
- [x] The compare option works at LG, XL and Narrow.

**Verification:**
- [x] CDP overflow matrix for the VM dataset × both variants × MD/LG/XL/Narrow × Normal/Long:
  no overflow.
- [x] Screenshots grouped vs flat at LG, XL and Narrow, in both Normal and Long, plus one in
  dark mode.

**Result:**
- Dataset `vm` (9 fields, Long overrides) and template `A4G`. Base `A4` is the flat variant: one
  grid, no headings, so there is no separate identical "A4-flat" template.
- Compare option "A4 grouped vs flat" shows A4G above A4.
- 400 template renders, all problem-free: 5 datasets × MD/LG/XL/Narrow × Normal/Long × 10
  templates.
- Screenshots: VM grouped vs flat at LG and XL (Normal), LG and XL (Long, XL in dark mode), and
  Narrow (Long).
- Finding: a grid ending on a fractional pixel (tag pills) left a faint rule under the last
  row with a 1 px clip. The clip is now 2 px (plan D5); a 3× zoom of the last row confirms no
  rule.

**Dependencies:** Task 1. **Files:** `data.js`, `templates.js`, `app.js`, `index.html`.
**Scope:** S–M

## Task 3: Threshold probe for the footprint heuristic
**Description:** Add a "Threshold probe" dataset with plain values at `NORMAL_MAX − 1`,
`NORMAL_MAX`, `NORMAL_MAX + 1`, `WIDE_MAX − 1`, `WIDE_MAX` and `WIDE_MAX + 1` characters,
built from realistic content. It covers:
- description
- URL as a link node (with and without `wide`)
- email
- UUID-style ID (mono, copy)
- datastore path (mono)
- a short label with a long value
- a long label with a short value
- badge node
- Not set

Make the two thresholds prototype URL parameters (`nmax`, `wmax`, defaults 34 / 72), so
alternatives can be compared without code edits.

**Acceptance criteria:**
- [x] The probe shows each boundary value with its resulting footprint (normal / wide / full).
- [x] Changing `nmax` / `wmax` in the URL re-renders with the new thresholds.
- [x] Nothing outside the prototype changes.

**Verification:**
- [x] Screenshots of the probe at LG, XL and Narrow with 34 / 72 and with one alternative pair
  (e.g. 28 / 64) for comparison.
- [x] CDP overflow check over the probe × MD/LG/XL/Narrow: no overflow.

**Result:**
- Dataset `probe` (18 fields) is built at render time from the current thresholds.
- `?nmax=&wmax=` set the thresholds; `?fp=1` prints `length → footprint` next to each A4
  label.
- `app.js` now keeps `nmax`, `wmax` and `fp` when it rewrites the URL.
- Probe lengths verified equal to their labels at 34/72 and 28/64.
- Screenshots: LG, XL and Narrow at 34/72; LG and XL at 28/64.
- Overflow: A4 and A4G are clean at both pairs.
- The only hit is template E on the probe: its intentionally truncated (`truncate`) label
  "Last successful replication consistency check" is ellipsised by design. That is not a layout
  overflow, and A–E are unchanged.

**Dependencies:** Task 1. **Files:** `data.js`, `templates.js`, `app.js`. **Scope:** S

## Task 4: Phase 0 validation pack
**Description:** Run the full prototype validation and prepare the Checkpoint 0 decision. No
code changes.
- Overflow matrix over all datasets (Platform provider, User, Infrastructure provider, Stress
  test, VM multi-group, Threshold probe) × A4 / A4-grouped / A4-flat × MD/LG/XL/Narrow ×
  Normal/Long. Record the counts below.
- Measured checks: no vertical borders on A4 cells, last-row rule clipped, focus ring visible
  on the first and last row (Tab).
- A short recommendation for each of the three Checkpoint 0 decisions, with screenshots.

**Acceptance criteria:**
- [x] Zero overflow in the matrix. Any failure is fixed in the prototype (Tasks 1–3) and re-run.
- [x] Screenshots exist for: Stress LG and XL; VM grouped vs flat at LG, XL and Narrow (Normal
  and Long); the probe at 34 / 72 and one alternative; dark mode.

**Verification:**
- [x] The results table below is filled in.

**Dependencies:** Tasks 2, 3. **Files:** `tasks/detail-overview-a4-todo.md` only. **Scope:** XS

## Checkpoint 0 (user decision, gate for all production work)
**Approved by the user on 2026-10-06.**
- [x] The user approves the A4 look (tokens, row rule, empty-track behaviour).
- [x] The user decides **grouped vs flat** for multi-group Overviews: **flat**.
- [x] The user approves the footprint behaviour and the **thresholds**: `NORMAL_MAX` 28,
  `WIDE_MAX` 64, mono measured like other plain text (no weighting), track minimum 12.75rem,
  span gate 24rem.
- [x] Plan §2.0 "Approved" column is filled in. The production tasks below use only those
  values. Flat was chosen, so the flat variants of Tasks 14 and 15 apply.

### Phase 0 results (Task 4, 2026-10-06)
| Check | Result |
|---|---|
| Overflow matrix | 6 datasets × MD/LG/XL/Narrow × Normal/Long × 10 templates = 480 renders, run at 34/72 and at 28/64. A4 and A4G: 0 failures. Template E on the probe: its `truncate` label is ellipsised by design (not a layout overflow; E is unchanged). |
| No vertical/top borders on A4 cells | 0 found (computed `border-*-width`) |
| Last-row rule clipped | Every A4 grid's last row ends on the clipped band. Since Task 2, the clip is 2 px because of the fractional-pixel finding; a 3× zoom confirms no rule. |
| Screen order = field order | Holds in every render (no `dense`) |
| Row rule continuous when a row ends early | Yes, since the shadow rule (Task 1 finding) |
| Focus rings (real Tab key) | Fully visible: link in the first column (left edge), copy button and link in the last row (provider XL, probe LG; 4× crops) |

**Measurements behind the decisions**
- **One-track text width** (track minus 1.75rem gutter): MD 275 px (2 tracks), LG 201 px
  (3 tracks), XL 204 px (4 tracks), Narrow 293 px (1 track).
- **Two-track text width:** MD 578 px, LG 430 px, XL 435 px.
- **VM Overview height, grouped vs flat:**

  | Width | Normal | Long |
  |---|---|---|
  | MD | 472 vs 344 px | 644 vs 516 px |
  | LG | 472 vs 288 px | 588 vs 460 px |
  | XL | 364 vs 234 px | 472 vs 290 px |
  | Narrow | 652 vs 524 px | 824 vs 696 px |

  Grouped is 128–184 px (25–64 %) taller.

**Recommendations for Checkpoint 0**
1. **Grouped vs flat: flat.**
   - Same fields and order, 25–64 % less height.
   - The row rule already structures the list.
   - The headings mostly add near-empty rows: Compute has only 2 fields.
   - One layout for every Overview, which is the goal of this work.
   - Cost: 7 headings and their locale keys go, and 1 Recovery groups test assertion changes.
2. **Thresholds: `NORMAL_MAX` 28 and `WIDE_MAX` 64, instead of 34 / 72.**
   - At 34, values sit right on the one-track edge (~201 px at LG): a 34-character
     description or email wraps at LG, and a 33-character one does not.
   - At 72, 71–72-character values wrap inside two tracks (~430 px); 63–64-character values fit
     at XL.
   - 28 / 64 leaves a margin of a few characters at LG/XL. MD has wider tracks, so it is safe
     either way.
3. **Mono values (decide or accept).** Mono is wider per character, so a two-track path of
   ~60+ characters still wraps to 2 lines at 28 / 64. That is acceptable: it wraps inside its
   cell, with no overflow. The alternative is to weight mono length ×1.15 in the helper, which
   is one more rule. Recommendation: accept, keep one rule.
4. **Keep:** track minimum 12.75rem, two-track gate 24rem, `py-2` / 2 px / 11.5px medium label,
   88ch prose cap, 2 px last-row clip, shadow row rule.
5. **Node values need `wide`.** A link without `wide` stays in one track and wraps to 3 lines
   (probe "URL (link, no wide)"). The real URL fields already carry `wide`, so nothing changes
   for consumers. Badges and short links stay one track.

Prototype links for the review (dev server):
- A4 stress: `/prototypes/detail-overview-design/?t=A4&d=stress&w=lg&fit=1`
- Grouped vs flat: `?t=A4&d=vm&w=lg&cmp=g&fit=1` (switch Width and Values)
- Threshold probe: `?t=A4&d=probe&w=lg&fit=1&fp=1`, and the same with `&nmax=28&wmax=64`

---|---|
| Overflow matrix (combinations / failures) | |
| Last-row rule clipped (all datasets) | |
| Focus rings visible (first/last row) | |
| Grouped vs flat recommendation | |
| Threshold recommendation | |

---

## Phase 1: Shared primitive

## Task 5: Internal footprint module
**Description:**
- Add `src/shared/components/detail-view/overviewLayout.ts` with `NORMAL_MAX` and `WIDE_MAX`
  (the approved values from §2.0), the `OverviewFootprint` type and `getOverviewFootprint(value, wide)`
  (plan D4).
- Add `overviewLayout.test.ts`, which imports `./overviewLayout` directly.
- No change to `index.ts`. The module stays internal.

**Acceptance criteria:**
- [x] Boundary table at the approved thresholds:
  - `NORMAL_MAX` → normal
  - `NORMAL_MAX + 1` → wide
  - `WIDE_MAX` → wide
  - `WIDE_MAX + 1` → full
- [x] Empty, null or blank → normal, even with `wide`. Node → full only with `wide`. String +
  `wide` → measured.
- [x] The public barrel does not expose `getOverviewFootprint` (a test asserts it).

**Verification:**
- [x] `npm exec vitest run src/shared/components/detail-view/overviewLayout.test.ts` (14 passed)
- [x] `npx eslint src/shared/components/detail-view/overviewLayout.ts src/shared/components/detail-view/overviewLayout.test.ts`

**Result:** commit `d13412e6`.

**Dependencies:** Checkpoint 0. **Files:** `overviewLayout.ts`, `overviewLayout.test.ts`.
**Scope:** XS

## Task 6: `DetailOverview` + Overview rendering of `DetailField` — blocker resolved (`90d66d79`), re-check before edit
**Description:**
- Replace the private boolean `TechnicalContext` with a private `FieldLayoutContext`
  (`'grid' | 'technical' | 'overview'`, default `'grid'`). `DetailTechnicalGroup` provides
  `'technical'`.
- Add `DetailOverview`: a `dl` with the D5 grid, row rule and last-row clip, providing
  `'overview'`. Add the `title` prop only if Checkpoint 0 = grouped.
- The `'overview'` branch of `DetailField` uses the D6 tokens and the classes from
  `getOverviewFootprint`: wide = `col-span-2` gated on the approved width; full =
  `col-span-full`.
- Update the `wide` prop comment.
- Export **only** `DetailOverview` from `index.ts`.

**Before starting:** `git diff -- src/shared/components/detail-view/index.ts` must show no
foreign hunk. If it does, stop and tell the user.

**Acceptance criteria:**
- [x] The `dl` uses the auto-fill track. No `grid-cols-N` and no viewport breakpoints.
- [x] Cells have the bottom rule only, and the `dl` has the clip. No background, outline,
  uppercase or vertical border.
- [x] Label is 11.5px medium. Mono is at `text-text-primary`. Not set, secondary, copy
  (accessible name), external link and badge nodes behave as before.
- [x] `DetailField` in `DetailFieldGroup`, `DetailTechnicalGroup` and `DetailStatusBlock`
  renders exactly as before.

**Verification:**
- [x] `npm exec vitest run src/shared/components/detail-view/DetailContent.test.tsx src/shared/components/detail-view/DetailView.test.tsx src/shared/components/detail-view/overviewLayout.test.ts` (62 passed)
- [x] `npx eslint src/shared/components/detail-view/DetailField.tsx src/shared/components/detail-view/index.ts src/shared/components/detail-view/DetailContent.test.tsx`
- [x] `npm run typecheck` (new public export).

**Result:** commit `fd1f3443`. `git diff -- src/shared/components/detail-view/index.ts` was
empty right before the edit (no foreign hunk). The A4 classes live in `DetailField.tsx` as
Tailwind arbitrary values; `index.css` is unchanged. The no-border assertion was mutation-checked
(an injected `border-l` fails it).

**Dependencies:** Task 5 and plan §0 resolved. **Files:** `DetailField.tsx`, `index.ts`,
`DetailContent.test.tsx`. **Scope:** S–M

## Checkpoint 1
- [x] Shared tests, lint and typecheck are green. Nothing is visible yet, because no consumer
  uses `DetailOverview`.

---

## Phase 2: Pilot

## Task 7: Pilot `ProvidersCatalogueTable`
**Changed by the user on 2026-10-06:** the pilot is `PlatformProvidersTable` (route
`/platform-administration/platform-providers`, record "Primary Airflow"), and
`ProvidersCatalogueTable` takes its place in Task 9. Reason: since `36aaf4a3`,
`ProvidersCatalogueTable`'s Overview has 11 fields (not the 4 in the §1 audit), and
`PlatformProvidersTable` now has no Connection group, only the Overview.

**Original description:** In the `id="overview"` section only, replace `DetailFieldGroup` with
`DetailOverview`. The four fields and their order stay the same. The URL node keeps `wide`.
The Description `wide` stays until Task 16. Connection, Relationships and Technical are
untouched.

**Acceptance criteria:**
- [ ] The Overview matches the approved prototype A4. The other sections look exactly as before.
- [ ] Type, Notification email, Description and URL (external, new tab) are unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx`
  (unchanged tests pass).
- [ ] `npx eslint src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx`
- [ ] Browser (plan §7) on `/providers-connectors/providers`:
  - md dialog at 1440 and 1024 wide, plus 375 narrow, light and dark
  - measured: no overflow, no vertical borders, last row clipped, focus rings visible
  - screenshots next to prototype A4

**Result (pilot `PlatformProvidersTable`):**
- Commit `a526ecfa`. Only the Overview `DetailFieldGroup` → `DetailOverview`, and the import.
- [x] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`
  (19 passed, unchanged tests)
- [x] `npx eslint src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- [x] Browser, Primary Airflow, 1440 light/dark and 375 narrow: see the log below.
- Finding for Checkpoint 2: DAG directory is plain text (18 characters), so its old `wide` is
  ignored and it takes one track. Credential moves up next to it, and Credential status shares
  a row with Notification email. This follows the approved rule (D4), but the user expected
  Credential and Credential status in one row.

**Dependencies:** Checkpoint 1. **Files:** `ProvidersCatalogueTable.tsx`. **Scope:** XS

## Checkpoint 2 (production fidelity only)
- [ ] The user confirms that the production pilot matches the approved prototype A4.
- [ ] Grouped vs flat and the thresholds are **not** reopened here. If the user wants to change
  them, go back to Phase 0 and Checkpoint 0.

---

## Phase 3: Remaining consumers

## Task 8: Single-group Overviews (RealmRoles, Credentials)
**Description:** `DetailFieldGroup` → `DetailOverview` in the Overview of `RealmRolesSection`
(3 fields) and `CredentialsTable` (3 fields; username mono + emphasis).

**Acceptance criteria:**
- [ ] Both Overviews render A4, with fields, order and values unchanged.
- [ ] RealmRoles' Permissions and Users sections are untouched.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx`
- [ ] `npx eslint <the 2 files>`
- [ ] Browser: one record each at md and narrow.

**Dependencies:** Checkpoint 2. **Files:** `RealmRolesSection.tsx`, `CredentialsTable.tsx`.
**Scope:** S

## Task 9: Single-group Overviews (Recovery action history, Platform providers)
**Description:** Same change for `RecoveryActionsHistoryPage` (5 fields, long Summary) and
`PlatformProvidersTable` (conditional fields and fragments per `type`; URL node `mono` + `wide`).

**Acceptance criteria:**
- [ ] Every provider `type` shows the same conditional fields in the same order as before.
  Fragments render as cells.
- [ ] The Connection and Technical sections are unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-actions/pages/RecoveryActionsHistoryPage.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`
- [ ] `npx eslint <the 2 files>`
- [ ] Browser: Platform provider BACKEND (most fields) and SMTP at md and narrow; one history
  run.

**Dependencies:** Task 8. **Files:** `RecoveryActionsHistoryPage.tsx`,
`PlatformProvidersTable.tsx`. **Scope:** S

## Task 10: Overview + `DetailTechnicalGroup` (Policy sets, Clean room)
**Description:** `DetailFieldGroup` → `DetailOverview` in `PolicySetsTable` and
`CleanRoomPoliciesTable` (the 1-field case). The `DetailTechnicalGroup` below stays exactly
as is.

**Acceptance criteria:**
- [ ] The field grid is A4. The ID row and its copy action are unchanged.
- [ ] Clean room with only a Description shows one cell with no rule.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.test.tsx`
- [ ] `npx eslint <the 2 files>`
- [ ] Browser: both at md and narrow; copy the ID once.

**Dependencies:** Task 9. **Files:** `PolicySetsTable.tsx`, `CleanRoomPoliciesTable.tsx`.
**Scope:** S

## Task 11: Overview + `DetailTechnicalGroup` (Recovery app policies, Snapshot policies)
**Description:** Same change for `RecoveryAppPoliciesTable` (6 fields) and
`SnapshotPoliciesTable` (5 fields).

**Acceptance criteria:**
- [ ] A4 field grid. The technical ID rows are unchanged.
- [ ] The formatted frequency, retention and status texts are identical.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.test.tsx`
- [ ] `npx eslint <the 2 files>`
- [ ] Browser: both at md and narrow.

**Dependencies:** Task 10. **Files:** `RecoveryAppPoliciesTable.tsx`,
`SnapshotPoliciesTable.tsx`. **Scope:** S

## Checkpoint 3a
- [ ] 9 of 14 consumers are migrated and their focused tests are green.
- [ ] Two of them spot-checked in dark mode.

## Task 12: Recovery applications
**Description:** `DetailOverview` in `RecoveryApplicationsTable`'s Overview. The Submission
field (`Badge` node + mono `secondary`, `wide`) keeps `wide`, which makes it a full row.

**Acceptance criteria:**
- [ ] The submission badge colour, status text and mono remote path are unchanged.
- [ ] A record without a submission shows 4 cells.

**Verification:**
- [ ] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
- [ ] `npx eslint src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx`
- [ ] Browser: one application with and one without a submission, at md and narrow.

**Dependencies:** Checkpoint 3a. **Files:** `RecoveryApplicationsTable.tsx`. **Scope:** XS

## Task 13: Clients (loaded and loading)
**Description:** In `ClientsSection`:
- the loaded Overview → `DetailOverview` (3 fields, Type badge node)
- the `ClientDetailLoading` skeleton → `DetailOverview`, so loading and loaded share the
  layout
- the error Overview (`FetchErrorAlert`) and the Roles section stay unchanged

**Acceptance criteria:**
- [ ] The skeleton keeps `aria-busy` and its accessible label, with 6 skeleton cells in the A4
  grid.
- [ ] The loaded fields are unchanged.
- [ ] The error state is unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/identity-access/components/ClientsSection.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx`
- [ ] `npx eslint src/features/platform-administration/identity-access/components/ClientsSection.tsx`
- [ ] Browser: open a client (skeleton, then the loaded Overview), at md and narrow.

**Dependencies:** Task 12. **Files:** `ClientsSection.tsx`. **Scope:** XS

## Task 14: Multi-group Users and Recovery groups (as decided at Checkpoint 0)
**Description:**
- **Grouped:** each `DetailFieldGroup title=…` → `DetailOverview title=…`, with the same
  fields and order.
- **Flat:**
  - one `DetailOverview` per Overview, with the fields in today's order (Profile then Account;
    General then Workload)
  - `RecoveryGroupsTable.test.tsx:573-574` asserts the field order instead of the two headings
  - remove the 4 group-title keys used here from en/cs/sk, after checking that
    `git diff -U0 src/locales` holds only ours
- The section `description` of Recovery groups is unchanged.

**Acceptance criteria:**
- [ ] Field order is identical to before.
- [ ] Roles, Orchestration, Inventory and Technical are unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/platform-administration/identity-access/components/UsersSection.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
  (+ `src/locales/*Translations.test.ts` if flat)
- [ ] `npx eslint <changed files>`
- [ ] Browser: a user at md; a recovery group at xl and narrow; dark mode once.

**Dependencies:** Task 13. **Files:** `UsersSection.tsx`, `RecoveryGroupsTable.tsx`
(+ the test and 3 locales if flat). **Scope:** S (M if flat)

## Task 15: Multi-group Virtual machine (as decided at Checkpoint 0)
**Description:** Apply the Checkpoint 0 decision to `VirtualMachineDetailPanel` (Compute /
Guest / Placement):
- Folder (plain text) is measured.
- Tags (pill node) keeps `wide`, which makes it a full row.
- The secondary lines on Cluster and Datastore are unchanged.
- If flat, remove the 3 VM group-title keys from en/cs/sk.

**Acceptance criteria:**
- [ ] All 9 fields, secondary lines, tag pills and the mono IP are unchanged in order and
  content.
- [ ] The other VM sections are unchanged.

**Verification:**
- [ ] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx`
  (+ locale tests if flat)
- [ ] `npx eslint src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx`
- [ ] Browser: a VM at xl (1440 and 1024 wide) and narrow, light and dark.

**Dependencies:** Task 14. **Files:** `VirtualMachineDetailPanel.tsx` (+ 3 locales if flat).
**Scope:** XS (S if flat)

## Checkpoint 3
- [ ] All 14 consumers are migrated.
- [ ] All field-based Overview render paths use `DetailOverview`: 15 of 16 `id="overview"`
  render paths.
- [ ] The Clients error Overview stays `FetchErrorAlert` by design (unchanged).
- [ ] Every focused consumer test from Tasks 7–15 is green.
- [ ] A measured browser pass over all consumers (plan §7) is recorded below.

---

## Phase 4: Cleanup and final audit

## Task 16: Remove ignored `wide` from plain-text Overview fields
**Description:** Inside Overview sections only, drop `wide` from plain-text fields: the
descriptions in 10 consumers, the Recovery action Summary and the VM Folder. `wide` stays on the
node fields (2 URLs, VM tags, Submission). Rendering does not change, because the flag is
already ignored.

**Acceptance criteria:**
- [ ] `wide` in Overview sections remains only on node values.
- [ ] Screenshots of 2 consumers are identical before and after.

**Verification:**
- [ ] Re-run the consumer test files from Tasks 7–15 (two `vitest run` invocations if long).
- [ ] `npx eslint <changed files>`

**Dependencies:** Checkpoint 3. **Files:** up to 12 consumer files. If more than 5, split into
two commits by feature area. **Scope:** S per commit

## Task 17: Doc comment and final audit
**Description:**
- Update the `DetailFieldGroup` comment: it is for non-Overview sections, and Overview uses
  `DetailOverview`. `DetailFieldGroup` stays exported.
- Run the final audit below over the explicit list of the 14 consumer files and record the
  output. No parser, and no new test that scans source files.

**Audit command** (Git Bash, from the repo root):
```sh
FILES="src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx
src/features/platform-administration/identity-access/components/ClientsSection.tsx
src/features/platform-administration/identity-access/components/RealmRolesSection.tsx
src/features/platform-administration/identity-access/components/UsersSection.tsx
src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx
src/features/providers-connectors/credentials/components/CredentialsTable.tsx
src/features/providers-connectors/providers/components/ProvidersCatalogueTable.tsx
src/features/recovery-actions/pages/RecoveryActionsHistoryPage.tsx
src/features/recovery-plans/policy-sets/components/PolicySetsTable.tsx
src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.tsx
src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx
src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.tsx
src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.tsx
src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.tsx"
for f in $FILES; do printf '%-40s group=%s overview=%s\n' "$(basename "$f")" "$(grep -c '<DetailFieldGroup' "$f")" "$(grep -c '<DetailOverview' "$f")"; done
grep -n '<DetailFieldGroup' $FILES   # every hit must be in a non-Overview section
```

**Expected:**
- `group=` values: Clients 1 (roles), RealmRoles 2 (permissions, users), Users 1 (roles),
  Platform providers 1 (connection), Providers 2 (connection, relationships). All others 0,
  with no `DetailFieldGroup` import.
- Total `<DetailOverview`: 15 if flat, 19 if grouped.

**Acceptance criteria:**
- [ ] The audit output matches the expected counts. Each remaining hit is confirmed outside
  `id="overview"`.
- [ ] Every plan §10 acceptance criterion is ticked, with evidence.

**Verification:**
- [ ] `npm exec vitest run src/shared/components/detail-view` and the consumer test files from
  Tasks 7–15.
- [ ] `npx eslint src/shared/components/detail-view/DetailField.tsx`
- [ ] `npm run typecheck`

**Dependencies:** Task 16. **Files:** `DetailField.tsx` (comment only), this todo (audit
record). **Scope:** XS

## Checkpoint: Complete
- [ ] All plan §10 criteria are met, with commands, measured browser results and screenshots
  recorded.
- [ ] The full suite and build run only if the user asks.
- [ ] The user decides plan Q2 (FlashSystem / IBM Power) and Q3 (prototype directory).

## Browser verification log
| Task | Consumer | Widths | Light/Dark | Overflow | Vertical rules | Last-row rule | Notes |
|---|---|---|---|---|---|---|---|
| 7 | PlatformProvidersTable, Primary Airflow | 1440 (dl 606 px, 2 tracks) | light + dark | none (region 670/670, dl 606/606, doc 1440/1440) | 0 (all cell borders 0 px) | clipped | height 414 → 338 px (−18 %), row pitch 60–64 → 54–58 px, label → value 4 → 2 px, column gap 40 → 0 px; focus rings of the copy buttons and the URL link fully visible |
| 7 | PlatformProvidersTable, Primary Airflow | 375 × 800 (dl 281 px, 1 track) | light | none (region 321/321, dl 281/281, doc 360/360) | 0 | clipped | 10 rows, one field each; focus rings visible |

## Final audit record
_(paste the Task 17 audit output here)_
