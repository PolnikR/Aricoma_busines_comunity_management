# Todo: Single Platform Configuration (Runtime + Session)

See `tasks/platform-configuration-simplify-plan.md` for full context.

## Task 1: Replace the provider-array mock with a single RuntimeConfiguration default

**Description:** In
`src/features/platform-administration/configuration/mocks/platformProviderConfigMocks.ts`,
replace `PlatformProviderConfig` (id/name/connectionStatus/... per
provider) and the `PLATFORM_PROVIDER_CONFIG_MOCKS` array with a single
`RuntimeConfiguration` interface — `workDirectory`, `workDirectoryDefault`,
`tempDirectory`, `tempDirectoryDefault`, `logDirectory`,
`logDirectoryDefault`, `sessionTimeoutMinutes`,
`sessionTimeoutMinDefault`, `sessionTimeoutMaxDefault`,
`sessionTimeoutDefault` — and one `DEFAULT_RUNTIME_CONFIGURATION` object
(reuse the existing "Recovery Defender" mock's values as the single
default, since it's the most fully-specified entry). Drop `id`, `name`,
`connectionStatus`, `autoRenewOnActivity` entirely.

**Acceptance criteria:**
- [ ] File exports `RuntimeConfiguration` and `DEFAULT_RUNTIME_CONFIGURATION`
- [ ] No `id`/`name`/`connectionStatus`/`autoRenewOnActivity` fields remain
- [ ] No other file still imports `PlatformProviderConfig` or
      `PLATFORM_PROVIDER_CONFIG_MOCKS` (both renamed/removed)

**Verification:**
- [ ] Tests pass: N/A directly (type/data-only change; covered by Task 5)
- [ ] Build succeeds: `npm run typecheck` (expect cascading errors in
      Tasks 2–4's files until they're updated too)
- [ ] Manual check: none beyond typecheck

**Dependencies:** None

**Files likely touched:**
- `src/features/platform-administration/configuration/mocks/platformProviderConfigMocks.ts`

**Estimated scope:** XS: 1 file

---

## Task 2: Simplify PlatformProviderConfigPanel to Runtime + Session only

**Description:** Rewrite
`src/features/platform-administration/configuration/components/PlatformProviderConfigPanel.tsx`
(rename to `RuntimeConfigurationPanel.tsx` for clarity, since it's no
longer "the panel for a selected provider") to take a single
`RuntimeConfiguration` prop instead of `provider`. Remove the header row
(provider name + connection-status badge) and the entire "Auto-renew on
activity" block from the Session section — keep only the Session-timeout
field, its reset button, and the range slider. Keep the existing
Save/Cancel footer and `isDirty` prop as-is.

**Acceptance criteria:**
- [ ] Component renders exactly two sections: "Runtime directories" (Work/
      Temp/Log directory, each with its own Reset button) and "Session"
      (Session timeout only)
- [ ] No provider name/badge header, no auto-renew toggle anywhere in the
      component
- [ ] Reset buttons still restore each field to its own default value

**Verification:**
- [ ] Tests pass: covered by Task 5 (page-level test, no separate panel
      test file exists today)
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: none beyond typecheck at this stage (visual check
      happens once ConfigurationPage is wired up in Task 4)

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/platform-administration/configuration/components/PlatformProviderConfigPanel.tsx`
  (renamed to `RuntimeConfigurationPanel.tsx`)

**Estimated scope:** Small: 1 file

---

## Task 3: Delete PlatformProviderConfigList

**Description:** Remove
`src/features/platform-administration/configuration/components/PlatformProviderConfigList.tsx`
entirely — with configuration no longer per-provider, there is nothing to
list or select between.

**Acceptance criteria:**
- [ ] File deleted
- [ ] No remaining imports of `PlatformProviderConfigList` anywhere in `src/`

**Verification:**
- [ ] Tests pass: N/A (deletion only)
- [ ] Build succeeds: `npm run typecheck` (confirms no dangling imports)
- [ ] Manual check: none

**Dependencies:** None (can be done alongside Task 2)

**Files likely touched:**
- `src/features/platform-administration/configuration/components/PlatformProviderConfigList.tsx`
  (deleted)

**Estimated scope:** XS: 1 file removed

---

## Task 4: Rewrite ConfigurationPage around one config object

**Description:** Rewrite
`src/features/platform-administration/configuration/pages/ConfigurationPage.tsx`
to hold one `RuntimeConfiguration` in state (draft + last-saved pair, same
`isDirty` comparison pattern as today) instead of a `providers`/
`savedProviders` array plus `selectedProviderId`. Remove the
`PlatformProviderConfigList` usage and the two-column layout (list +
panel); render just the single `RuntimeConfigurationPanel`. Update the
`PageHeader` description to drop "for each connected platform provider"
since it's no longer per-provider.

**Acceptance criteria:**
- [ ] No provider list/sidebar renders
- [ ] Editing a field enables Save; Save persists it as the new
      last-saved baseline; Cancel reverts to last-saved
- [ ] Each Reset button restores its field to the default value

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/platform-administration/configuration/pages/ConfigurationPage.test.tsx --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: open Platform Administration → Configuration in a
      running dev server, confirm only Runtime directories + Session
      sections appear, no provider list

**Dependencies:** Tasks 1, 2, 3

**Files likely touched:**
- `src/features/platform-administration/configuration/pages/ConfigurationPage.tsx`

**Estimated scope:** Small: 1 file

---

## Checkpoint: Component layer complete

- [ ] `npm run typecheck` passes with zero errors
- [ ] Manual check in a running dev server: Configuration page shows
      exactly two sections, no provider selection UI anywhere

---

## Task 5: Rewrite ConfigurationPage.test.tsx for the single-config shape

**Description:** Replace the existing provider-switching test (currently
"switches the detail panel when another provider is selected") with tests
for the single-config flow: renders both sections with default values,
Save enables/disables correctly, Cancel discards, each Reset button
restores its own default.

**Acceptance criteria:**
- [ ] No test references provider selection/switching (nothing left to
      switch between)
- [ ] Tests cover: initial render shows default values for all four
      fields, editing enables Save, Save then disables it again, Cancel
      discards an edit, each Reset button restores its field's default

**Verification:**
- [ ] Tests pass: `npx vitest run src/features/platform-administration/configuration --no-coverage`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: none beyond the automated tests

**Dependencies:** Task 4

**Files likely touched:**
- `src/features/platform-administration/configuration/pages/ConfigurationPage.test.tsx`

**Estimated scope:** Small: 1 file

---

## Checkpoint: Complete

- [ ] `npm run build` (lint + typecheck + full test suite + vite build) passes
- [ ] Manual walkthrough in a running dev server confirms the simplified
      page matches the requested tree exactly
- [ ] Commit
