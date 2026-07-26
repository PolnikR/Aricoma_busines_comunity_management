# Feature-owned Data Flow Design

## Scope

This design applies only to features backed by real backend data:

- `discovery-inventory`;
- `providers-connectors`;
- future backend-backed features following the same conventions.

`recovery-plans` is explicitly out of scope while it uses mock data and
`localStorage`.

## Architecture

Each feature owns its API clients, runtime response schemas, query keys, React
Query hooks, domain models, and pure transformations.

The standard flow is:

```text
page or component
  -> React Query hook
  -> feature API client
  -> fetch
  -> Zod response validation
  -> API-to-domain mapping
  -> React Query cache
  -> pure selectors and transformations
  -> UI
```

Components do not call `fetch` and do not consume raw backend response models.

## Directory Responsibilities

```text
feature/
├── api/
│   ├── featureApi.ts
│   ├── featureSchemas.ts
│   ├── featureQueryKeys.ts
│   ├── useFeatureQueries.ts
│   └── useFeatureMutations.ts
├── model/
│   └── featureTypes.ts
└── helpers/
    ├── mapFeatureData.ts
    └── filterFeatureData.ts
```

- `api` owns HTTP communication, runtime validation, query configuration, cache
  updates, and invalidation.
- `model` owns frontend domain types and domain constants.
- `helpers` contains pure functions without React or network calls.

Small features may keep schemas or query keys beside the API client or hooks.
They should be separated only when their size justifies another file.

## Discovery Inventory

Discovery inventory becomes the canonical server query. Virtual-machine and
topology views derive their models from the same cached inventory instead of
starting independent requests.

```text
useDiscoveryInventory(providerId, tag)
  -> one React Query cache entry
     -> mapInventoryToVirtualMachines
     -> mapInventoryToTopology
```

The query key must include every server-side filter:

```text
['discovery-inventory', 'inventory', providerId ?? null, tag ?? null]
```

VM filtering, metrics, filter options, and pagination remain pure client-side
transformations. Infrastructure topology remains a pure mapping of inventory.
The current global `useVirtualMachinesUnified` wrapper is removed once all
consumers use the canonical inventory query.

Tags belong to the discovery domain rather than specifically to the VM page.
Vdisks retain their own query because they come from a separate endpoint and
are loaded for a specific VM.

## Providers

The provider feature owns:

- `providersApi`;
- provider response schemas;
- provider query keys;
- query and mutation hooks;
- provider domain types and constants;
- provider presentation helpers such as `providerTypeLabel`.

Provider cache writes remain explicit:

- upsert replaces or appends the matching provider;
- delete stores the backend's remaining provider list;
- query keys are defined by a provider key factory.

## Error Handling

- API clients throw technical errors for network failures, non-success HTTP
  responses, and invalid payloads.
- React Query owns loading, error, retry, and cache state.
- UI components translate those states into user-facing messages.
- API clients do not display UI alerts or silently convert unexpected failures
  into empty successful responses.

Known domain outcomes may use a typed result or a specific error type when an
empty state is genuinely part of the backend contract.

## Target Structure

```text
src/features/
├── discovery-inventory/
│   ├── api/
│   │   ├── discoveryInventoryApi.ts
│   │   ├── discoveryInventoryQueryKeys.ts
│   │   ├── useDiscoveryInventory.ts
│   │   ├── tagsApi.ts
│   │   └── useTags.ts
│   ├── model/
│   ├── virtual-machines/
│   │   ├── api/
│   │   │   ├── vdisksApi.ts
│   │   │   └── useVdisksByVm.ts
│   │   └── helpers/
│   │       ├── mapInventoryToVirtualMachines.ts
│   │       └── filterVirtualMachines.ts
│   └── infrastructure/
│       └── helpers/
│           └── mapInventoryToTopology.ts
└── providers-connectors/
    └── providers/
        ├── api/
        │   ├── providersApi.ts
        │   ├── providerQueryKeys.ts
        │   ├── useProviders.ts
        │   ├── useUpsertProvider.ts
        │   └── useDeleteProvider.ts
        ├── model/
        │   └── providerTypes.ts
        └── helpers/
            └── providerTypeLabel.ts
```

The global `src/features/api` and `src/features/hooks` directories are removed
only after their consumers have migrated.

## Migration Order

1. Add the canonical `useDiscoveryInventory` query and key factory.
2. Derive VM and topology models from the shared inventory cache.
3. Migrate Virtual Machines, Infrastructure, and VM consumers to the canonical
   query.
4. Remove duplicate inventory fetching and `useVirtualMachinesUnified`.
5. Split VM mapping/filtering from network code.
6. Move discovery and vdisk clients into the discovery feature.
7. Move provider API, types, constants, and helpers into the provider feature.
8. Normalize query-key factories and imports.
9. Remove the now-empty global API and hook directories.
10. Run lint, typecheck, tests, and the production build after each migration
    checkpoint.

## Non-goals

- No changes to `recovery-plans`.
- No generic repository abstraction.
- No global API folder grouping unrelated domains.
- No movement of domain transformations into `shared`.
- No change to backend endpoints or payload contracts.
