# Implementation Plan: Single Platform Configuration (Runtime + Session)

## Overview

Simplify `platform-administration/configuration` from a per-provider list
(pick a provider, edit its own work/temp/log directories and session
timeout) down to **one single, global config** with the same two field
groups, no provider selection at all:

```
Configuration
├── Runtime directories
│   ├── Work directory
│   ├── Temp directory
│   └── Log directory
└── Session
    └── Session timeout
```

This replaces every earlier direction explored this session (Airflow
orchestration defaults, recovery execution, status sync, recovery-plan
defaults) — all discarded per the user's explicit revert back to the
original per-provider template as the starting point. This plan only
simplifies that reverted baseline; it does not reintroduce any of the
discarded fields.

## Architecture Decisions

- **One flat settings object, not an array.** Drop `PlatformProviderConfig[]`
  and provider selection entirely. Replace with a single
  `RuntimeConfiguration` object: `{ workDirectory, tempDirectory,
  logDirectory, sessionTimeoutMinutes }`, plus the existing default/min/max
  companion values needed for the Reset buttons and the timeout slider.
- **Drop the "Auto-renew on activity" toggle and connection-status badge.**
  Neither appears in the requested tree (`Runtime directories` /
  `Session` → `Session timeout` only). Auto-renew and connection status
  were properties of a *specific provider*; with no provider selected
  there's no "this provider's connection" to badge, and auto-renew wasn't
  asked for.
- **Delete `PlatformProviderConfigList.tsx`** — there is nothing left to
  list or select once configuration isn't per-provider.
- **Reuse the existing Save/Cancel/dirty-tracking pattern** from
  `ConfigurationPage.tsx` (`JSON.stringify` comparison between draft and
  last-saved), just against the single object instead of a
  `providers`/`savedProviders` pair keyed by `selectedProviderId`.
- **No backend, no localStorage** — same as the current reverted baseline
  (plain `useState`, resets on reload). Not changing persistence behavior
  as part of this simplification; that's a separate decision if wanted
  later.

## Task List

### Phase 1: Simplify the model and defaults
- [ ] Task 1: Replace `platformProviderConfigMocks.ts`'s array with a
      single `RuntimeConfiguration` default object

### Phase 2: Simplify the components
- [ ] Task 2: Rewrite `PlatformProviderConfigPanel.tsx` to drop the
      provider header/badge and auto-renew section, keeping only Runtime
      directories + Session timeout
- [ ] Task 3: Delete `PlatformProviderConfigList.tsx`
- [ ] Task 4: Rewrite `ConfigurationPage.tsx` around one config object
      (no `selectedProviderId`, no side list)

### Checkpoint: Component layer complete
- [ ] `npm run typecheck` passes
- [ ] Manual check: page renders Runtime directories + Session sections,
      no provider list/sidebar

### Phase 3: Tests
- [ ] Task 5: Rewrite `ConfigurationPage.test.tsx` for the single-config
      shape (no provider-switch test, since there's nothing to switch)

### Checkpoint: Complete
- [ ] `npm run build` (lint + typecheck + full test suite + vite build)
      passes
- [ ] Commit

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Renaming/removing `PlatformProviderConfig` type breaks an import elsewhere | Low | Already confirmed (earlier this session) this type/these components are only referenced within `configuration/` itself |
| Losing the "which provider does this apply to" framing removes real information some future feature needs | Medium | Out of scope for this plan — if a future need reintroduces per-provider config, that's a new design conversation, not a revert of this simplification |

## Open Questions

None outstanding — scope was given explicitly as the tree above.
