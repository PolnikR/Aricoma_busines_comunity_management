# Task Checklist: Provider Filter & JSON Viewer Cleanup

## Remove dead helpers

- [ ] Delete `getSourceProvidersByType`/`getTargetProvidersByType` from `providerFilters.ts`.
- [ ] Delete their `describe` blocks and unused import from `providerFilters.test.ts`.
- [ ] Confirm no remaining references anywhere in `src/`.

## Readonly params + drop Array.from copy

- [ ] Widen `filterByType`, `filterByTypes`, `getProvidersByTypeAndRole`, `getEligibleSourceProviders` to accept `readonly ProviderRecord[]`.
- [ ] Remove `Array.from(providers)` in `buildResourceSourceTabs.ts:32`; pass `providers` directly.
- [ ] Confirm all call sites still typecheck without changes.

## Shared JSON-viewer helper

- [ ] Add `src/shared/utils/rawRecordJson.ts` exporting `toRawRecordJson`.
- [ ] Update `providerJson.ts` to delegate to it.
- [ ] Update `platformProviderJson.ts` to delegate to it.
- [ ] Leave `mapRecoveryApplications.ts`'s `toRecoveryApplicationJson` untouched.

## Verification

- [ ] Run focused tests for `providerFilters`, `buildResourceSourceTabs`, `ProvidersCatalogueTable`, `PlatformProvidersTable`.
- [ ] Run focused typecheck/lint on all touched files.
- [ ] Commit only files touched by this cleanup.
