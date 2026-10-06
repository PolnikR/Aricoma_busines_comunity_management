# Todo: Shared Overview layout (A4)

Plan: `tasks/detail-overview-a4-plan.md`. Branch `spike/ant-design-shell`.
Status: **complete** (2026-10-06). Open for the user: plan Q2 and Q3.

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
- [x] Empty, null or blank → normal without `wide`. Node → full only with `wide`.
  - Revised at Checkpoint 2 (2026-10-06): `wide` → full for every value, empty and plain text
    included (commits `1fb44048`, `70f6d80a`).
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

## Task 7: Pilot `PlatformProvidersTable`
**Description:** In the `id="overview"` section of `PlatformProvidersTable` only, replace
`DetailFieldGroup` with `DetailOverview`. Fields, order and values stay the same.

The user chose this pilot on 2026-10-06 instead of `ProvidersCatalogueTable`, which moves to
Task 9. Since `36aaf4a3`, `ProvidersCatalogueTable`'s Overview has 11 fields (not the 4 in the
§1 audit), and `PlatformProvidersTable` has no Connection group, only the Overview.

**Acceptance criteria:**
- [x] The Overview matches the approved prototype A4.
- [x] Fields, order, values, copy actions and the external URL (new tab) are unchanged.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx src/features/platform-administration/platform-providers/pages/PlatformProvidersPage.test.tsx`
  (unchanged tests pass)
- [x] `npx eslint src/features/platform-administration/platform-providers/components/PlatformProvidersTable.tsx`
- [x] Browser (plan §7) on `/platform-administration/platform-providers`, record
  "Primary Airflow": 1440 light and dark, 375 narrow; measured no overflow, no vertical borders,
  last row clipped, focus rings visible. See the browser log below.

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
- Resolved at Checkpoint 2 (user decision B, 2026-10-06): `wide` is an explicit full-row
  override for plain text too (plan D4). Rows now: Provider ID | Type, URL, Description,
  IP address | Port, DAG directory, Credential | Credential status, Notification email.

**Dependencies:** Checkpoint 1. **Files:** `PlatformProvidersTable.tsx`. **Scope:** XS

## Checkpoint 2 (production fidelity only)
**Approved by the user on 2026-10-06**, after two rule changes made at this checkpoint (plan D4):
`wide` is an explicit full-row override for plain text (`1fb44048`) and for empty values
(`70f6d80a`).
- [x] The user confirms that the production pilot matches the approved prototype A4.
- [x] Grouped vs flat and the thresholds are **not** reopened here.

**Source of truth since 2026-10-06 (user decision, see plan §0):**
`tasks/detail-drawer-master-inventory.json` decides each detail's content, field order and
sections. This plan decides only the Overview layout. Where the inventory differs from the
consumer state recorded in plan §1, the inventory wins: the policy IDs are Overview fields,
Level/Status are Overview fields, and Recovery applications and Recovery groups have no
Technical section. Acceptance items that said "Technical unchanged" or "ID row unchanged" are
superseded by the inventory.

---

## Phase 3: Remaining consumers

## Task 8: Single-group Overviews (RealmRoles, Credentials)
**Description:** `DetailFieldGroup` → `DetailOverview` in the Overview of `RealmRolesSection`
and `CredentialsTable`.

**Acceptance criteria:**
- [x] Both Overviews render A4, with fields, order and values unchanged.
- [x] RealmRoles has no separate Permissions/Users groups any more (restored drawer structure);
  Permissions and Users are Overview fields per the inventory, unchanged here.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx` (44 passed)
- [x] `npx eslint <the 2 files>`
- [x] Browser: covered by the final pass (Users on the same page).

**Result:** commit `d0c2de1d`.

## Task 9: Single-group Overviews (Recovery action history, Providers catalogue)
**Description:** Same change for `RecoveryActionsHistoryPage` and `ProvidersCatalogueTable`
(12 inventory fields; conditional Partner provider and Backing storage; URL node + `wide`).
`ProvidersCatalogueTable` replaces `PlatformProvidersTable` here, which became the pilot (Task 7).

**Acceptance criteria:**
- [x] Every provider type shows the same conditional fields in the same order as before.
- [x] The other sections are unchanged (the file has only the Overview section).

**Verification:**
- [x] `npm exec vitest run src/features/recovery-actions/pages/RecoveryActionsHistoryPage.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx` (21 passed)
- [x] `npx eslint <the 2 files>`
- [x] Browser: Providers catalogue at 1440 light with focus rings (log below).

**Result:** commit `4eda321c`.

## Task 10: Overview (Policy sets, Clean room)
**Done by a parallel session** in `b0c90b8b` (Policy sets) and `5dcdf1c4` (recovery policies),
together with the inventory content: the ID is the first Overview field (mono, copy), Status is
a field (Clean room), and there is no `DetailTechnicalGroup`.
- `775f3acc` first undid that content (layout-only rule). After the user made the inventory the
  source of truth, `6adf0b2d` restored the inventory state, again with `DetailOverview`.

**Acceptance criteria:**
- [x] The field grid is A4 (`DetailOverview`).
- [x] Content, order and sections match the inventory (ID + copy is an Overview field).

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx src/features/recovery-plans/policy-sets/pages/PolicySetsPage.test.tsx src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/clean-room/pages/CleanRoomPoliciesPage.test.tsx` (47 passed together with Task 11)
- [x] `npx eslint <the 2 files>`
- [x] Browser: policy set "Tier 2 applications" at 1440 light and 375 dark (log below).

## Task 11: Overview (Recovery app policies, Snapshot policies)
**Done by the parallel session** in `5dcdf1c4`, aligned in `6adf0b2d` (see Task 10): Policy ID,
Description, Level, then the original fields; no `DetailTechnicalGroup`.

**Acceptance criteria:**
- [x] A4 field grid; content and order match the inventory.
- [x] The formatted frequency, retention and status texts are identical.

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/application-recovery/pages/RecoveryAppPoliciesPage.test.tsx src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx src/features/recovery-plans/recovery-policies/snapshot/pages/SnapshotPoliciesPage.test.tsx` (47 passed together with Task 10)
- [x] `npx eslint <the 2 files>`

## Checkpoint 3a
- [x] 9 of 14 consumers are migrated and their focused tests are green.
- [x] Dark mode spot checks: User and VM (log below).

## Task 12: Recovery applications
**Done by the parallel session** in `2e5ccdab`, accepted as canonical (user decision B): one
`DetailOverview` in inventory order (Description, Environment, Platform, Tiers, Status,
Submission when present); sections Overview, Orchestration, Inventory; no Technical section.

**Acceptance criteria:**
- [x] The submission badge, status text and mono remote path render as the inventory defines.
- [x] A record without a submission shows 5 cells (Status is a field per the inventory).

**Verification:**
- [x] `npm exec vitest run src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx` (in the final run)
- [x] eslint ran with the parallel session's commit; the file is unchanged since.

## Task 13: Clients (loaded and loading)
**Description:** the loaded Overview and the `ClientDetailLoading` skeleton → `DetailOverview`;
the error Overview (`FetchErrorAlert`) stays.

**Acceptance criteria:**
- [x] The skeleton keeps `aria-busy` and its accessible label, with 6 skeleton cells in the A4
  grid.
- [x] The loaded fields are unchanged (7 fields in inventory order, Roles as a field).
- [x] The error state is unchanged.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/identity-access/components/ClientsSection.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx` (39 passed)
- [x] `npx eslint src/features/platform-administration/identity-access/components/ClientsSection.tsx`

**Result:** commit `df64b5e6`.

## Task 14: Users and Recovery groups (flat)
**Result:**
- Users: already one untitled field list (restored drawer structure); only the grid changes,
  commit `48d92b1e`. No Users group-title keys remain.
- Recovery groups: **done by the parallel session** in `b2f9d754`, accepted as canonical: one
  flat `DetailOverview` in inventory order (Description, Policy Set, Provider ID, Source
  Category, Workload Type, Resource Type, Resources, Status); sections Overview, Orchestration,
  Inventory. The General/Workload keys and the unused technical keys were removed there.

**Acceptance criteria:**
- [x] Field order matches the inventory.
- [x] Orchestration and Inventory are unchanged; Technical is gone per the inventory.

**Verification:**
- [x] `npm exec vitest run src/features/platform-administration/identity-access/components/UsersSection.test.tsx src/features/platform-administration/identity-access/pages/IdentityAccessPage.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx src/locales` (in the final run)
- [x] `npx eslint src/features/platform-administration/identity-access/components/UsersSection.tsx`
- [x] Browser: a user at 1440 dark; a recovery group at 1440 light and 375 (log below).

## Task 15: Virtual machine (flat)
**Result:** already one untitled field list in inventory order (vCPU, Memory, Tags, OS,
Cluster, Datastore, Folder, VM path); only the grid changes, commit `1061ca99`. No VM
group-title keys remain.

**Acceptance criteria:**
- [x] All fields, secondary lines, tag pills and the mono VM path are unchanged in order and
  content.
- [x] The other VM sections (Disks, Backing Storage Info) are unchanged.

**Verification:**
- [x] `npm exec vitest run src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx src/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage.test.tsx` (68 passed together with Users)
- [x] `npx eslint src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.tsx`
- [x] Browser: TEST-WEB02 at 1440 dark (log below).

## Checkpoint 3
- [x] All 14 consumers are migrated.
- [x] All field-based Overview render paths use `DetailOverview`: 15 of 16 `id="overview"`
  render paths.
- [x] The Clients error Overview stays `FetchErrorAlert` by design (unchanged).
- [x] Every focused consumer test from Tasks 7–15 is green.
- [x] A measured browser pass over 6 representative consumers is recorded below.

---

## Phase 4: Cleanup and final audit

## Task 16: Remove redundant `wide` from plain-text Overview fields
`wide` is an explicit full-row override (plan D4). A plain-text `wide` is REMOVE only if the
28/64 footprint gives the same layout for every realistic value.

**Audit (current inventory content, 2026-10-06):**

| Consumer | Field | Value | Decision | Reason |
|---|---|---|---|---|
| PlatformProvidersTable | DAG directory | path | KEEP | user-required full row; keeps Credential + Credential status paired |
| PlatformProvidersTable | Description | prose | KEEP | short text would pull IP address up and split IP address + Port |
| RealmRolesSection | Description | prose | KEEP | followed by Client ID and more fields; would re-pair them |
| CredentialsTable | Description | prose | KEEP | followed by Password; would re-pair |
| ProvidersCatalogueTable | Description | prose | KEEP | last field, but whether it joins Credential status depends on the email / connection ID lengths before it |
| RecoveryActionsHistoryPage | Summary | prose | KEEP | last field; whether it joins Checks depends on the lengths of the fields before it |
| PolicySetsTable | Description | prose | KEEP | followed by the three policy fields; would re-pair |
| RecoveryApplicationsTable | Description | prose | KEEP | first field; would pair with Environment |
| RecoveryGroupsTable | Description | prose | KEEP | first field; would pair with Policy Set |
| RecoveryAppPoliciesTable | Description | prose | KEEP | followed by Level and more; would re-pair |
| CleanRoomPoliciesTable | Description | prose | KEEP | followed by Status; would re-pair |
| SnapshotPoliciesTable | Description | prose | KEEP | followed by Level and more; would re-pair |
| VirtualMachineDetailPanel | Folder | path | KEEP | intentional full row; followed by VM path |
| VirtualMachineDetailPanel | VM path | mono path + copy | KEEP | intentional full row (path) |
| RealmRolesSection | Users | badge list, or the "no users" text | KEEP | list value; the empty text must not re-pair the row |

Node fields keep `wide` by rule (Clients/Users Roles, RealmRoles Permissions, URLs, Backing
storage, Submission, VM Tags).

**Outcome:** every plain-text `wide` is an intentional full-row override or protects the pairing
of the fields after it; none is redundant. No code change, so no commit and no before/after
screenshots.

**Acceptance criteria:**
- [x] Every remaining plain-text `wide` in an Overview is an intentional full-row override.
- [x] No consumer changed, so there is nothing to compare before/after.

## Task 17: Doc comment and final audit
**Description:**
- Update the `DetailFieldGroup` comment: it is for non-Overview sections, and Overview uses
  `DetailOverview`. `DetailFieldGroup` stays exported (still used by FlashSystem, IBM Power,
  Backing storage, Access log and the orchestrator result modal).
- Run the final audit over the 14 consumer files and record the output.

**Expected (updated to the inventory state):** `group=0` and `technical=0` in all 14 files; total
`<DetailOverview` 15 (Clients 2: loading + loaded; every other consumer 1).

**Acceptance criteria:**
- [x] The audit output matches the expected counts (record below).
- [x] Every plan §10 acceptance criterion is ticked, with evidence.

**Verification:**
- [x] `npm exec vitest run src/shared/components/detail-view` plus the consumer test files from
  Tasks 7–15 and `src/locales`: 31 files, 334 tests passed.
- [x] `npx eslint src/shared/components/detail-view/DetailField.tsx`
- [x] `npm run typecheck` (no errors)
- [x] `git diff --check` (clean)

**Result:** comment commit `4ea5d748`.

## Checkpoint: Complete
- [x] All plan §10 criteria are met, with commands, measured browser results and screenshots
  recorded.
- [x] The full suite and build were not run (not requested).
- Open for the user: plan Q2 (FlashSystem / IBM Power) and Q3 (prototype directory).

## Browser verification log
| Task | Consumer | Widths | Light/Dark | Overflow | Vertical rules | Last-row rule | Notes |
|---|---|---|---|---|---|---|---|
| 7 | PlatformProvidersTable, Primary Airflow | 1440 (dl 606 px, 2 tracks) | light + dark | none (region 670/670, dl 606/606, doc 1440/1440) | 0 (all cell borders 0 px) | clipped | height 414 → 338 px (−18 %), row pitch 60–64 → 54–58 px, label → value 4 → 2 px, column gap 40 → 0 px; focus rings of the copy buttons and the URL link fully visible |
| 7 | PlatformProvidersTable, Primary Airflow | 375 × 800 (dl 281 px, 1 track) | light | none (region 321/321, dl 281/281, doc 360/360) | 0 | clipped | 10 rows, one field each; focus rings visible |
| 7 (after rule B) | PlatformProvidersTable, Primary Airflow | 1440 + 375 × 800 | light + dark | none (same values as above) | 0 | clipped | `wide` = full row: DAG directory full, Credential + Credential status paired again; height 414 → 392 px; rule 1 px with 10 copies on every cell; focus rings of the 3 copy buttons and the URL visible |
| 7 (after empty-`wide` fix) | PlatformProvidersTable, Primary Airflow | 1440 | light | none (region 670/670, dl 606/606, doc 1440/1440) | 0 | clipped | regression after `70f6d80a`: same rows, height 392 px, rule 1 px × 10 copies on every cell |
| final | PlatformProvidersTable, Primary Airflow | 1440 | light | none | 0 | clipped | same 7 rows; focus: 3 copy buttons + URL link visible |
| 9 | ProvidersCatalogueTable, first provider (vCenter) | 1440 (2 tracks) | light | none (670/670, 606/606, 1440/1440) | 0 | clipped | rows: ID / Type, Backing storage, Role / IP, URL, Email / Orchestrator conn ID, Credential / Credential status, Description; focus: 3 copy buttons + URL visible |
| 14 | UsersSection, superadmin | 1440 (2 tracks) | dark | none (670/670, 606/606) | 0 | clipped | dl 606 × 330 |
| 14 | RecoveryGroupsTable, db_and_app | 1440 (xl, 3 tracks) + 375 | light | none (878/878, 814/814; 336/336, 296/296) | 0 | clipped | rows: Description, Policy Set / Provider ID / Source Category, Workload / Resource Type / Resources, Status |
| 15 | VirtualMachineDetailPanel, TEST-WEB02 | 1440 (xl, 3 tracks) | dark | none (878/878, 814/814) | 0 | clipped | OS 2 tracks + Cluster; Datastore alone, its rule still spans the row (screenshot) |
| 10 | PolicySetsTable, Tier 2 applications | 1440 + 375 | light + dark | none (670/670, 606/606; 342/342, 302/302) | 0 | clipped | inventory order: Policy set ID, Description, Snapshot / Recovery app policy, Clean room policy |

All runs: `grid-auto-flow: row` (no dense), clip `inset(-8px 0 2px -8px)`, rule 1 px with 10
shadow copies on every cell, every cell inside the grid.

## Final audit record
```
VirtualMachineDetailPanel.tsx            group=0 overview=1 technical=0
ClientsSection.tsx                       group=0 overview=2 technical=0
RealmRolesSection.tsx                    group=0 overview=1 technical=0
UsersSection.tsx                         group=0 overview=1 technical=0
PlatformProvidersTable.tsx               group=0 overview=1 technical=0
CredentialsTable.tsx                     group=0 overview=1 technical=0
ProvidersCatalogueTable.tsx              group=0 overview=1 technical=0
RecoveryActionsHistoryPage.tsx           group=0 overview=1 technical=0
PolicySetsTable.tsx                      group=0 overview=1 technical=0
RecoveryApplicationsTable.tsx            group=0 overview=1 technical=0
RecoveryGroupsTable.tsx                  group=0 overview=1 technical=0
RecoveryAppPoliciesTable.tsx             group=0 overview=1 technical=0
CleanRoomPoliciesTable.tsx               group=0 overview=1 technical=0
SnapshotPoliciesTable.tsx                group=0 overview=1 technical=0
total overview: 15
grep '<DetailFieldGroup' over the 14 files: no hits
```
- Inventory check (Overview label keys in code vs `bodyFields` / first section in
  `detail-drawer-master-inventory.json`, plus DetailViewSection ids): all 14 match, Platform
  providers including its per-type conditional fields.
- Per-feature grid CSS inside Overview blocks: none. The only class lists are `flex flex-wrap`
  wrappers of tag and badge values (VM tags, Users/Clients roles), which are content.
- Clients error state: `FetchErrorAlert` (unchanged).
