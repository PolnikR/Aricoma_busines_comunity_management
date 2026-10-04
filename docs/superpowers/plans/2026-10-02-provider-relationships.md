# Plan: Provider Relationships

Spec: [2026-10-02-provider-relationships-design.md](../specs/2026-10-02-provider-relationships-design.md)
Template (content only): [2026-10-02-provider-relationships-helper-template.html](../specs/2026-10-02-provider-relationships-helper-template.html)

Feature paths below are relative to `src/features/providers-connectors/providers/` unless they start with `src/`. Every task is test-first: write or adjust the failing test, implement, then re-run it.

## Dependency graph

```
T1 providerCategory ──┬─> T2 resolveProviderTopology ──┬─> T5 drawer/detail backing row
                      │                                └─> T9 buildRelationshipRows ─> T10 ProviderRelationshipsContent ─┐
                      └─> T3 ProviderCreateForm ─> T4 ProvidersCreateModal                                             ├─> T11 provider help wiring
T6 HelpPopover hover/focus + width ─> T7 KeyedHelpPopover children/width ─> T8 feature help test sweep ──────────────────┘
```

T6–T8 do not depend on T1–T5 and could run in parallel. They are scheduled after C2 so that each commit stays focused.

Commits: **C1** = T1–T2, **C2** = T3–T5, **C3** = T6–T8 (shared help contract), **C4** = T9–T11 (provider help content).

---

## C1: Classifier and resolver

### T1. `model/providerCategory.ts`
- **Do:**
  - Add `COMPUTE_PROVIDER_TYPES`, `STORAGE_PROVIDER_TYPES` and `PARTNER_PROVIDER_TYPES` (`as const satisfies readonly ProviderType[]`).
  - Add the three `is…ProviderType(type: string)` predicates.
  - Add a module comment saying that a backend category, when added, replaces this.
- **Acceptance:**
  - The four types classify as in the spec table.
  - `HITACHI` is storage but not partner-capable.
  - `''` and unknown types return false everywhere.
- **Files:** `model/providerCategory.ts`, `model/providerCategory.test.ts`

### T2. `helpers/resolveProviderTopology.ts`
- **Do:** implement the types and `resolveProviderTopology` exactly as in spec Part 1.
- **Acceptance:** all resolver cases from the spec testing strategy pass:
  - backing and partner relationships in each state: resolved, unresolved, mismatch
  - mutual merge and one-way
  - no reverse relationship
  - order preserved
  - arbitrary ids
- **Files:** `helpers/resolveProviderTopology.ts`, `helpers/resolveProviderTopology.test.ts`

**Verify C1**
```
npm exec vitest run src/features/providers-connectors/providers/model/providerCategory.test.ts src/features/providers-connectors/providers/helpers/resolveProviderTopology.test.ts
npx eslint <the four files> --max-warnings 0
node scripts/orval/check-feature-layout.mjs
git diff --check
```
Commit: `feat: add provider category classifier and relationship resolver`

---

## C2: Form, drawer and detail aligned with the backend contract

### T3. `components/ProviderCreateForm.tsx`
- **Do:**
  - Replace the `storageProviders` prop with `backingStorageProviders` and `partnerProviders`.
  - Gate the backing field with `isComputeProviderType` and the partner field with `isPartnerProviderType`.
  - Keep excluding self from the partner options.
- **Acceptance:**
  - `IBM_POWER` shows the backing field.
  - `HITACHI` shows neither the partner nor the backing field.
  - Options come from the matching props.
  - "Unavailable" options still render.
- **Files:** `components/ProviderCreateForm.tsx` (+test)

### T4. `components/ProvidersCreateModal.tsx`
- **Do:**
  - Pass storage-type candidates for backing and partner-type candidates for the partner.
  - On type change, clear backing when the new type is not compute, and clear the partner on any type change.
  - Submit `backingStorageProviderIds` for compute types.
- **Acceptance (tests):**
  - `IBM_POWER` submits its backing ids.
  - Hitachi appears in backing candidates and not in partner candidates.
  - Type changes:
    - `VMWARE` → `IBM_POWER` keeps backing.
    - `IBM_POWER` → `VMWARE` keeps backing.
    - Compute → `FLASHCOPY` and compute → `HITACHI` clear backing, and no backing ids are submitted.
    - `FLASHCOPY` → `HITACHI` clears the partner.
  - Existing tests are updated to the vendor-neutral backing labels.
- **Files:** `components/ProvidersCreateModal.tsx` (+test)

### T5. Backing storage row and translations
- **Do:**
  - In the drawer (`ProvidersCatalogueTable.tsx`), gate the partner row with `isPartnerProviderType` and add a "Backing storage" `DetailRow` for compute providers, using a memoized `resolveProviderTopology(allProviders)`.
  - Add the same item to `ProviderDetailPage.tsx`.
  - In en, sk and cs, rewrite `forms.backingStorageProviders*` as vendor-neutral and add the `details.backingStorage*` and `details.relationshipMismatch` keys.
- **Acceptance:**
  - The row shows resolved targets as `Name (id)`, unresolved ones as `id (Unavailable)`, mismatches with the marker, and `None` when there are none.
  - The row is absent for storage providers.
  - The partner row is unchanged.
- **Files:** `components/ProvidersCatalogueTable.tsx` (+test), `pages/ProviderDetailPage.tsx` (+test), `src/locales/{en,sk,cs}.json`

**Verify C2**
```
npm exec vitest run src/features/providers-connectors/providers/components/ProviderCreateForm.test.tsx src/features/providers-connectors/providers/components/ProvidersCreateModal.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProviderDetailPage.test.tsx src/locales/detailDrawerHelpTranslations.test.ts
npx eslint <changed .ts/.tsx files> --max-warnings 0
npm run typecheck
git diff --check
```
Commit: `feat: align provider backing storage and partner fields with backend contract`

---

## C3: Shared hover/focus help contract (cross-cutting)

### T6. `src/shared/components/help-popover/HelpPopover.tsx`
- **Do:** implement the spec 3a interaction inside the existing component, reusing its placement code. There is no second implementation anywhere.
  - Pointer handling (`pointerType !== 'touch'`):
    - Open after about 150 ms.
    - Use a shared close timer of about 200 ms, cancelled on enter, for both trigger and panel.
  - Focus handling:
    - Open on trigger focus.
    - Close on `focusout` when the new focus target is outside the wrapper and the pointer is not over it.
  - Remove the auto-focus of the panel on open, and add `tabIndex={0}` on the panel.
  - Click opens only; it no longer toggles.
  - Escape: while open, add a capture-phase `window` keydown listener that closes the help, calls `stopPropagation()`, and returns focus to the trigger only if focus was inside the panel. This replaces today's `onKeyDown` handler.
  - After a dismissal (Escape or close button), suppress reopen on trigger focus until focus leaves the wrapper or the pointer re-enters.
  - Keep "pointer down outside closes".
  - Add `width?: 'default' | 'wide'`, where `wide` is `w-[min(55rem,calc(100vw-2rem))]`.
  - Update the header comment to the new contract.
- **Acceptance (fake timers):** all shared tests listed in the spec testing strategy pass:
  - hover opens
  - the bridge from trigger to panel keeps it open
  - leaving both closes it
  - focus opens
  - Tab into the panel keeps it open
  - focus moving out closes it
  - hover never moves focus
  - Escape closes only the help, whether it was opened by hover or by focus, and a second Escape closes the drawer
  - click fallback, with no toggle
  - no reopen after dismissal
  - the close button returns focus
  - pointer down outside closes it
  - `width`

  The two obsolete tests ("moves focus into it", "closes on a second trigger click") are replaced.
- **Files:** `src/shared/components/help-popover/HelpPopover.tsx` (+test)

### T7. `src/shared/components/help-popover/KeyedHelpPopover.tsx`
- **Do:** add an optional `children` prop, rendered after the sections, and pass `width` through.
- **Acceptance:**
  - Children render after the sections.
  - `width` reaches `HelpPopover`.
  - The existing key-reading test still passes.
- **Files:** `src/shared/components/help-popover/KeyedHelpPopover.tsx` (+test)

### T8. Feature help test sweep
- **Do:** run every test file that interacts with a "?" help without changing it first (list below). Fix only the files that fail because of the new contract, and record each change in the commit body.

  Expected to pass unchanged, because a click still opens the help and Escape and the close button behave as before:
  - `src/features/providers-connectors/credentials/components/CredentialsTable.test.tsx`
  - `src/features/recovery-plans/recovery-runs/components/RecoveryRunHistoryDrawer.test.tsx`
  - `src/features/recovery-plans/recovery-policies/snapshot/components/SnapshotPoliciesTable.test.tsx`
  - `src/features/recovery-plans/recovery-policies/clean-room/components/CleanRoomPoliciesTable.test.tsx`
  - `src/features/recovery-plans/recovery-policies/application-recovery/components/RecoveryAppPoliciesTable.test.tsx`
  - `src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx`
  - `src/features/platform-administration/audit/components/AccessLogsTable.test.tsx`
  - `src/features/platform-administration/identity-access/components/ClientsSection.test.tsx`
  - `src/features/platform-administration/identity-access/components/RealmRolesSection.test.tsx`
  - `src/features/platform-administration/identity-access/components/UsersSection.test.tsx`
  - `src/features/discovery-inventory/resources/components/vmware/VirtualMachineDetailPanel.test.tsx`
  - `src/features/discovery-inventory/resources/components/ibm-power/PowerInventoryView.test.tsx`
  - `src/features/discovery-inventory/resources/components/flash-system/FlashSystemInventoryView.test.tsx`
  - `src/features/recovery-plans/policy-sets/components/PolicySetsTable.test.tsx`
  - `src/features/recovery-actions/pages/RecoveryActionsHistoryPage.test.tsx`
  - `src/features/recovery-plans/recovery-groups/components/RecoveryGroupMetroMirrorFields.test.tsx`
  - `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx` (Escape → focus stays on the trigger and the help does not reopen)
  - `src/features/recovery-plans/recovery-applications/components/RecoveryApplicationsTable.test.tsx`
  - `src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx`
  - `src/shared/components/data-table/DetailDrawer.test.tsx`
- **Acceptance:** every file above passes, and the diff touches only the assertions that the new contract invalidates.

**Verify C3**
```
npm exec vitest run src/shared/components/help-popover <all T8 files> src/locales/detailDrawerHelpTranslations.test.ts
npx eslint <changed files> --max-warnings 0
npm run typecheck
git diff --check
```
Manual check (`npm run dev`):
- In three different drawers (Providers, Credentials, Recovery groups), confirm hover, focus, the trigger-to-panel bridge, Escape and touch emulation in DevTools.
- Confirm the drawer never closes on the first Escape.

Commit: `feat: open detail help on hover and focus`

---

## C4: Provider help content

### T9. `helpers/buildRelationshipRows.ts`
- **Do:** a pure view model built from `ProviderTopology`. It covers:
  - compute rows in API order, with their targets stacked
  - each partner shown `full` the first time and `compact` after that
  - the direction: `both`, `out` or `in`
  - the selection of `otherStorageRows`
- **Acceptance:**
  - All cases from the spec's `buildRelationshipRows` tests pass.
  - The module imports nothing from React.
- **Files:** `helpers/buildRelationshipRows.ts` (+test)

### T10. `components/ProviderRelationshipsContent.tsx`
- **Do:** render the template v2 content:
  - section heading, intro, legend
  - the "Compute providers" and "Other storage relationships" lists
  - card and connector states, with hidden direction text and `aria-hidden` arrows
  - `isLoading` and `isError` states

  Add locale keys under `providers.relationships.*` in en, sk and cs. Columns collapse into a stack below about 760 px of container width. Split card and connector into sibling files if a file would exceed about 200 lines.
- **Acceptance:**
  - Every state renders its text label.
  - `↔` appears only for mutual partners.
  - Loading, error and empty states render.
- **Files:** `components/ProviderRelationshipsContent.tsx` (+test, optional `ProviderRelationshipCard.tsx` / `ProviderRelationshipConnector.tsx`), `src/locales/{en,sk,cs}.json`

### T11. Provider help wiring and cleanup
- **Do:**
  - In `ProvidersCatalogueTable.tsx`, render `<KeyedHelpPopover helpKey="providers.help" sections={['role', 'credential']} width="wide"><ProviderRelationshipsContent providers={allProviders} isLoading=… isError=… /></KeyedHelpPopover>`.
  - In `ProvidersPage.tsx`, pass the all-providers query's loading and error state down.
  - Remove `providers.help.partner.title` and `providers.help.partner.text` from en, sk and cs.
- **Acceptance:**
  - The provider help contains Role, Credential and the relationship content, and no Partner section.
  - Its content is built from all providers.
  - No modal is rendered.
  - `detailDrawerHelpTranslations.test.ts` passes.
- **Files:** `components/ProvidersCatalogueTable.tsx` (+test), `pages/ProvidersPage.tsx`, `src/locales/{en,sk,cs}.json`

**Verify C4**
```
npm exec vitest run src/features/providers-connectors/providers/helpers/buildRelationshipRows.test.ts src/features/providers-connectors/providers/components/ProviderRelationshipsContent.test.tsx src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/providers-connectors/providers/pages/ProvidersPage.test.tsx src/locales/detailDrawerHelpTranslations.test.ts
npx eslint <changed files> --max-warnings 0
node scripts/orval/check-feature-layout.mjs
npm run typecheck
git diff --check
```
Manual check: compare the Providers drawer help with the template content in the light and dark themes. Check the wide placement and scrolling, and the Edge-case-like data where it is available.

Commit: `feat: show provider relationships in drawer help`

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| A global behavior change breaks feature tests that click "?" | Click stays an open-only fallback and dismissal suppresses reopening. T8 runs all 20 files and fixes only real contract breaks. |
| `userEvent.click` = hover + focus + click: a click toggle would close the help instantly | Click no longer toggles (spec 3a) |
| Escape also closes the drawer, since both listen on `window` | A capture-phase listener with `stopPropagation()`, tested for both hover-opened and focus-opened help |
| Focus returns to the trigger after Escape or Close and immediately reopens the help | Reopen suppression after dismissal, with a test |
| Hover close timers flake in tests | Fake timers in the shared tests. Feature tests rely on click and focus, not hover timing. |
| The wide panel is constrained by the drawer's `transform` | In-place absolute positioning works because the drawer has no `overflow`. The manual check in C4 confirms it, and portalling is the approved fallback only if needed. |
| `detailDrawerHelpTranslations` invariant | Relationship keys go under `providers.relationships.*`, and `providers.help.partner.*` is removed from all three locales at once. |
| Parallel sessions in the working tree | Stage and commit explicit paths only. |

## Not run by default

The full `npm test` and `npm run build` are not run (CLAUDE.md §5). C3 is cross-cutting, so its scope is every file that interacts with a "?" help (T8 list) instead of the full suite. The full suite runs only if the T8 list proves incomplete or on request.

---

## Revision 2026-10-04: partner always shown as a full card

C1–C4 are done (`011d0369`, `cdc96f3a`, `c3ab0bea`, `27d4faa5`). This revision drops the "first full, later compact" optimisation, so that every compute row can be read on its own:

```
[ Compute provider ] → Backing storage → [ Storage provider ] ↔ Partner ↔ [ Partner storage provider ]
```

A repeated partner is rendered as a full card in every row where it appears. "Other storage relationships" stays: it lists only the partner relationships that no compute row rendered.

### Architecture decisions
- `PartnerLink.display` is removed. The view model still tracks which partner relationships the compute rows rendered, but only to select `otherStorageRows`, not to change how a partner looks.
- `PartnerReference` and `PARTNER_ARROW` are removed from `ProviderRelationshipParts.tsx`. The partner is always `RelationshipConnector` + `ProviderRelationshipCard` / `UnavailableProviderCard`, and the full-card grid (`12.5rem_5.75rem_minmax(0,12.5rem)`) is used in every row.
- The spec is updated first. Template v2 still shows compact references; the spec records that this revision supersedes that part of the template. The template file itself stays as the approved historical reference.

### Tasks

- [ ] **T12. Update spec**
  - Acceptance:
    - "Partner repetition" in `docs/superpowers/specs/2026-10-02-provider-relationships-design.md` says the partner is always a full card.
    - The Structure and Testing Strategy bullets no longer mention first full / later compact.
    - A note says this supersedes the compact references in template v2.
  - Verify: `git diff --check`; a grep for `compact` in the spec only matches the `HelpPopover` width and the provider card description.
  - Files: the spec (1 file). Scope: XS.
  - Dependencies: none.

- [ ] **T13. View model: always a full partner** (`helpers/buildRelationshipRows.ts` + test)
  - Do:
    - Remove `display` from `PartnerLink` and from `linkFrom`.
    - Keep a `rendered` set filled by the compute rows and used only to filter `otherStorageRows`.
    - Update the comments.
  - Acceptance:
    - The same mutual partner reached from three compute rows gives a `PartnerLink` with `other` set and direction `both` in every row, and the type has no `display`.
    - "Other storage relationships" still lists only relationships no compute row rendered, unchanged.
    - The unresolved partner test drops `display` from its `toMatchObject`.
  - Verify: `npm exec vitest run src/features/providers-connectors/providers/helpers/buildRelationshipRows.test.ts`
  - Files: `helpers/buildRelationshipRows.ts`, `helpers/buildRelationshipRows.test.ts`. Scope: S.
  - Dependencies: T12.

- [ ] **T14. Rendering: no compact reference** (`components/ProviderRelationshipsContent.tsx`, `components/ProviderRelationshipParts.tsx` + content test)
  - Do:
    - In `BackingTarget`, always use the full-card grid.
    - `PartnerPart` always renders connector + card.
    - Delete `PartnerReference`, `PARTNER_ARROW` and the now-unused `PartnerLink` import in Parts.
  - Acceptance:
    - The test "shows a mutual partner in full once and as a compact reference afterwards" is replaced by one that checks a partner repeated across several compute rows. In every row the partner is a full card with name, type, role and id, and has a `Partner` connector whose hidden text is "mutual partner".
    - No `↔ Partner` one-line reference text is rendered.
    - The other content tests still pass.
  - Verify: `npm exec vitest run src/features/providers-connectors/providers/components/ProviderRelationshipsContent.test.tsx`
  - Files: `ProviderRelationshipsContent.tsx`, `ProviderRelationshipParts.tsx`, `ProviderRelationshipsContent.test.tsx`. Scope: S.
  - Dependencies: T13. T13 changes the `PartnerLink` type, so T13 and T14 land in one commit to keep typecheck green.

### Checkpoint: after T12–T14
- [ ] `npm exec vitest run src/features/providers-connectors/providers src/locales src/shared/components/help-popover`
- [ ] `npx eslint <changed .ts/.tsx files> --max-warnings 0`
- [ ] `npm run typecheck`
- [ ] `git diff --check`
- [ ] Commits:
  - `docs: show provider partner as a full card in every relationship row` (T12)
  - `feat: always render provider partner as a full card` (T13 + T14)
- [ ] Manual check in `npm run dev`: in the provider drawer help, rows that share a partner (for example vCenter 01 and vCenter 03 → IBM Flash Source 01) each show the full partner card.

### Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Removing `display` breaks typecheck between tasks | Low | T13 and T14 are one commit, and typecheck runs at the checkpoint |
| Repeated full cards make the help taller | Low | The help body already scrolls; this is the accepted trade-off for self-contained rows |
| "Other storage relationships" regresses once the flag is gone | Med | The existing "lists only partner relationships not already shown" test stays unchanged |
