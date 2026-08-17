# Implementation Plan: Fast Refresh Context Boundaries

## Overview

Refactor the Language, Theme, and User React contexts so every Fast Refresh `.tsx` boundary exports only React components. Context values and consumer hooks move to `.ts` modules, while provider components move to dedicated `*Provider.tsx` modules. Runtime behavior and public hook contracts remain unchanged.

## Architecture Decisions

- Use one non-component context module and one provider component module per domain.
- Keep the existing hook names and provider behavior; only import paths change.
- Remove all `react-refresh/only-export-components` suppressions instead of disabling Fast Refresh globally.
- Add a regression test for the runtime export boundary before refactoring.

## Task List

### Phase 1: Regression contract

- Add a test proving provider modules export only `LanguageProvider`, `ThemeProvider`, or `UserProvider` at runtime.
- Run the focused test and confirm it fails against the current mixed-export modules.

### Phase 2: Context slices

- Split Language context state/hook from `LanguageProvider` and update its consumers.
- Split Theme context state/hook from `ThemeProvider` and update its consumers.
- Split User context state/hook from `UserProvider` and update its consumers.
- Run focused context, header, and language integration tests after each slice.

### Phase 3: Quality gate

- Remove the three ESLint suppressions.
- Run lint, TypeScript, the full test suite, and the production build.
- Start Vite, touch/save a provider module through a reversible edit, and confirm the incompatible-export warning no longer appears.

## Acceptance Criteria

- Provider `.tsx` modules have component-only runtime exports.
- Hooks keep their existing behavior and error messages outside their providers.
- Language persistence/loading, theme persistence/system mode, and current-user API bridge behavior remain unchanged.
- No `react-refresh/only-export-components` suppression remains in the three context domains.
- Full production build succeeds.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Missed import after file split | Medium | TypeScript and full build gate |
| Context instance duplicated across files | High | Export exactly one context object from each `.ts` context module and import it in both provider and hook |
| Runtime behavior changes during refactor | Medium | Preserve implementation verbatim and run existing integration tests after each slice |

## Open Questions

None. The component-only Fast Refresh boundary was approved.
