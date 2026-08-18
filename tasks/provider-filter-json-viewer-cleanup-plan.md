# Implementation Plan: Provider Filter & JSON Viewer Cleanup

## Overview

Three small, independent nits surfaced by the 2026-08-16 review, all low-risk cleanup with no behavior change for any real user flow: dead exported helpers left over from the Resources ISE feature, a needless array copy in tab building, and duplicated one-line JSON-viewer helpers across two provider-like feature modules. None of these touch the actual role-filtering logic, which the review already confirmed is correct.

## Architecture Decisions

- No functional behavior changes anywhere in this plan — every task is either deleting confirmed-dead code, widening a type to remove an unnecessary allocation, or de-duplicating identical one-liners behind a shared helper.
- The shared JSON-viewer helper goes in `src/shared/utils/` since it's used by two independent feature modules (`providers-connectors` and `platform-administration`) with no ownership relationship between them.
- `mapRecoveryApplications.ts`'s `toRecoveryApplicationJson` is left untouched — its fallback-reconstruction branch (used when `rawRecord` is absent) is materially different from the other two helpers, not just a naming variant, so forcing it through the shared helper would add a conditional for no real gain.

## Dependency Graph

```text
Task 1 (remove dead helpers) -- independent
Task 2 (widen readonly param, drop Array.from) -- independent
Task 3 (shared toRawRecordJson helper) -- independent
```

All three tasks touch disjoint files and can be done in any order or in parallel.

## Task 1: Remove dead `getSourceProvidersByType`/`getTargetProvidersByType`

**Description:** These two exported helpers (`providerFilters.ts:32-38`) were superseded by direct `getProvidersByTypeAndRole` calls when the Resources ISE feature landed. Confirmed via grep: the only remaining references are their own unit tests. Remove both functions and their dedicated test blocks.

**Acceptance criteria:**
- [ ] `getSourceProvidersByType` and `getTargetProvidersByType` are removed from `providerFilters.ts`.
- [ ] Their `describe` blocks and the now-unused import are removed from `providerFilters.test.ts`.
- [ ] `getProvidersByTypeAndRole` (the function they wrapped) and its own tests are untouched.
- [ ] No remaining reference to either removed function anywhere in `src/`.

**Verification:**
- [ ] `npm run test -- src/features/providers-connectors/providers/utils/providerFilters.test.ts --run`
- [ ] `npm exec eslint -- src/features/providers-connectors/providers/utils/providerFilters.ts src/features/providers-connectors/providers/utils/providerFilters.test.ts`
- [ ] `npm exec tsc -b` (or focused typecheck) — confirms no dangling import elsewhere

**Dependencies:** None

**Files likely touched:**
- `src/features/providers-connectors/providers/utils/providerFilters.ts`
- `src/features/providers-connectors/providers/utils/providerFilters.test.ts`

**Estimated scope:** Small: 2 files

## Task 2: Widen provider-array params to `readonly` and drop the `Array.from` copy

**Description:** `filterByType`, `filterByTypes`, `getProvidersByTypeAndRole`, and `getEligibleSourceProviders` in `providerFilters.ts` only read their `providers` argument (via `.filter`), so their parameter type can be widened from `ProviderRecord[]` to `readonly ProviderRecord[]`. This lets `buildResourceSourceTabs.ts:32` pass its `readonly ProviderRecord[]` input directly instead of allocating a fresh array with `Array.from(providers)` on every tab build.

**Acceptance criteria:**
- [ ] `filterByType`, `filterByTypes`, `getProvidersByTypeAndRole`, `getEligibleSourceProviders` accept `readonly ProviderRecord[]`.
- [ ] `buildResourceTabsByRole` in `buildResourceSourceTabs.ts` calls `getProvidersByTypeAndRole(providers, providerType, role)` directly — no `Array.from`.
- [ ] All existing call sites (the three resource-type sub-pages, `useResourceInventoryQueries.ts`) still compile with no changes required on their end.

**Verification:**
- [ ] `npm exec tsc -b` (or focused typecheck covering `src/features/providers-connectors` and `src/features/discovery-inventory/resources`)
- [ ] `npm run test -- src/features/providers-connectors/providers/utils/providerFilters.test.ts src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.test.ts --run`

**Dependencies:** None (independent of Task 1, though both touch `providerFilters.ts` — apply sequentially to avoid overlapping edits)

**Files likely touched:**
- `src/features/providers-connectors/providers/utils/providerFilters.ts`
- `src/features/discovery-inventory/resources/helpers/buildResourceSourceTabs.ts`

**Estimated scope:** Small: 2 files

## Task 3: Shared `toRawRecordJson` helper for provider JSON viewers

**Description:** `providerJson.ts`'s `toProviderJson` and `platformProviderJson.ts`'s `toPlatformProviderJson` are byte-identical one-liners (`return provider.rawRecord ?? provider`). Extract a small generic helper and have both call it.

**Acceptance criteria:**
- [ ] New `src/shared/utils/rawRecordJson.ts` exports `toRawRecordJson<Raw, T extends { rawRecord?: Raw }>(record: T): Raw | T`.
- [ ] `toProviderJson` and `toPlatformProviderJson` both delegate to it, keeping their existing exported names and signatures (call sites in `ProvidersCatalogueTable.tsx`/`PlatformProvidersTable.tsx` and the JSON viewer modal are unaffected).
- [ ] `mapRecoveryApplications.ts`'s `toRecoveryApplicationJson` is left as-is (its fallback-reconstruction logic doesn't fit the generic helper cleanly).

**Verification:**
- [ ] `npm run test -- src/features/providers-connectors/providers/components/ProvidersCatalogueTable.test.tsx src/features/platform-administration/platform-providers/components/PlatformProvidersTable.test.tsx --run`
- [ ] `npm exec eslint -- src/shared/utils/rawRecordJson.ts src/features/providers-connectors/providers/helpers/providerJson.ts src/features/platform-administration/platform-providers/helpers/platformProviderJson.ts`

**Dependencies:** None

**Files likely touched:**
- `src/shared/utils/rawRecordJson.ts` (new)
- `src/features/providers-connectors/providers/helpers/providerJson.ts`
- `src/features/platform-administration/platform-providers/helpers/platformProviderJson.ts`

**Estimated scope:** Small: 3 files

## Checkpoint: Complete

- [ ] Focused tests for all touched files pass.
- [ ] Focused typecheck/lint pass.
- [ ] No behavior change in any resource page, JSON viewer, or provider filtering — verified by unchanged existing test assertions.
- [ ] Commit contains only files related to this cleanup (separate from any feature work, per this repo's convention of one focused commit per fix).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Widening to `readonly ProviderRecord[]` breaks a caller that mutates the array in place | Low | Grep confirmed all current call sites only read/filter/map; typecheck will catch any real mutation attempt |
| Shared JSON helper's generic signature doesn't infer cleanly at both call sites | Low | Keep it a thin, single-purpose generic (`Raw | T` return) rather than trying to unify with `toRecoveryApplicationJson`'s different shape |

## Open Questions

None — user confirmed doing all three items as scoped in the original review.
