# Orval full integration: one generated API layer

Status: draft for review, 2026-09-29.
Supersedes the "hand-written API module + hand-written hooks" part of ADR 0001.

## Problem

Orval is used only to generate types and zod schemas. Everything around them is
hand-written per feature: API modules that call the generated fetch functions and
parse responses, around 70 React Query hooks, hand-made query keys, invalidation in
every mutation, snake_case to camelCase view models, and spec fixes scattered as
local `SPEC GAP` schemas or applied by hand after each regeneration (access logs).
Every backend change therefore touches several layers, and the generated names
(`deleteRecoveryAppRouteDeleteRecoveryAppDelete`) make the code hard to read.

## Goal

After a backend change the only steps are:

```
npm run api:update
npm run typecheck
```

The typecheck lists exactly the code that uses a changed field. Nothing else needs
to be touched, and nothing about the spec is fixed by hand.

## Target architecture

```
openapi/abco-api.json            spec as pulled from the backend (unchanged file)
scripts/orval/specPatches/       one module per spec fix, applied by the input transformer
        │
        ▼  orval (input transformer)
src/generated/api/<tag>/         per tag: React Query hooks, fetch functions, query keys
src/generated/api/zod/<tag>/     per tag: zod schemas used for runtime validation
src/generated/api/models/        types
        │
        ▼
src/features/<feature>/          UI only: generated hooks + `select` where data is really derived
```

Layers that disappear from features: `api/*Api.ts` wrappers, `api/*QueryKeys.ts`,
`api/schemas/*`, hand-written query and mutation hooks, pure-rename view models.

## Decisions

### 1. Spec patches in one place

The existing input transformer (`scripts/orval/omitPubkey.mjs`) becomes a transformer
that runs every module in `scripts/orval/specPatches/`. Each patch:

- targets one location in the spec (for example `PowerVmRecord.lpar`),
- checks the precondition before patching: if the backend already provides the schema
  or type, the patch throws `Spec patch <name> is obsolete: <reason>` and the
  regeneration fails, so obsolete patches are removed instead of silently overriding
  the backend,
- is listed in `docs/api/openapi-spec-gaps.md`.

Initial patches: access-log schemas, `PowerVmRecord.lpar/vios`, `PowerVmsResponse.counts_by_type`
and top-level `provider_id`, `VolumesResponse` collections, `VdisksByVmResponse.vdisks`,
`VolumeTreeNode` kind/detail, `RollbackReport` sections, `RecoveryVM` metadata, and the
existing pubkey omission.

Result: all local `SPEC GAP` schemas and the manual access-log restore are deleted.

### 2. Generated React Query client

`client: 'react-query'` with `httpClient: 'fetch'`, the existing `orvalMutator`, and
`mode: 'tags-split'` (the spec has one tag per area, e.g. `Providers`, `Recovery Groups`).
Generated per operation: `useX` hook, `getXQueryKey`, `getXQueryOptions`, mutation hook.

### 3. Runtime validation in the generated client

Runtime validation enabled (strategy `throw`) with the zod schemas as the `schemas`
output. Orval 8.33 exposes it on the query options and on the fetch client
(`override.fetch.runtimeValidation`); which key applies to the react-query client with
the fetch http client is verified in migration step 1. Responses are validated inside the generated query function. A
response that does not match the spec becomes a query error naming the operation; the
last valid data stays in cache and on screen. All `parseGeneratedResponse` calls in
features are deleted.

### 4. Readable names

`override.operationName` derives the name from the route:

- routes that already start with a verb (`get_`, `submit_`, `delete_`, `test_`,
  `rollback_`) become camelCase of the route: `/get_providers` → `getProviders`,
  `/delete_recovery_app` → `deleteRecoveryApp`;
- other routes get the HTTP verb as prefix: `GET /vms` → `getVms`,
  `POST /vms/search` → `postVmsSearch`, `PUT /discovery/cache/config` → `putDiscoveryCacheConfig`.

Hooks follow: `useGetProviders`, `useSubmitProvider`, `useDeleteRecoveryApp`.
The generator fails on a name collision.

### 5. No pure-rename view models

Features use the generated types directly, in snake_case where the API is snake_case.
A mapper exists only where data is really derived (for example the recovery group
builder draft, derived status or counts), and it runs in the generated hook's
`select`. `select` functions are module-level so they are not recreated per render.

Consequence: a new optional field is visible to the UI immediately; nothing can drop it
silently.

### 6. Caching

- The cache policy stays global in `QueryClient` (`STANDARD_QUERY_OPTIONS`: stale 15 min,
  gc 60 min, focus/reconnect refetch, retry 1). Generated hooks use the same client.
- Exceptions (active recovery run polling) are passed through the hook's `query` option.
- Query keys are only the generated `getXQueryKey`. Hand-made keys are forbidden.
- Invalidation after mutations is declared once in `mutationInvalidates` in
  `orval.config.ts` (for example `deleteProvider` → `getProviders`). Where a mutation
  returns the full list (submit/delete of providers, policies, credentials), its
  `onSuccess` writes the response to the list query with `setQueryData` using the
  generated key, so the list updates without an extra request.
- Query parameters are always passed complete through one small builder per endpoint,
  so default-valued parameters never create two cache entries for the same data.
- The cache stores validated API data; `select` produces UI data.

### 7. Guards

ESLint in `src/features/**`:

- no imports from `zod`,
- no import of `@tanstack/react-query`'s `useQuery`/`useMutation` for API data
  (generated hooks only); `useQueryClient` stays allowed for `setQueryData`,

A check script (run in `npm run lint`) fails on files named `*QueryKeys.ts` or under
`api/schemas/` in `src/features`, which ESLint cannot express.

GitLab CI job `api-drift` (manual or scheduled): pulls the spec from the backend,
regenerates, runs the typecheck, and fails if the spec differs from the committed one
or the typecheck breaks.

## What happens on a backend change

| Change | Effect | Work |
|---|---|---|
| New optional field | appears in types and data | none unless the UI should show it |
| New required request field | typecheck points at call sites | fill it in |
| Removed or renamed field | typecheck points at every use | fix those uses |
| New endpoint | new hook | use it |
| Backend types a patched gap | regeneration fails naming the obsolete patch | delete the patch |
| Backend drops something the FE patches in | patch keeps it | none |
| Response differs from spec | runtime validation error naming the operation | report to backend |

Not covered by any tool: a field that keeps its name and type but changes meaning.

## Migration

Vertical slices, one feature per slice, each slice leaves the app working:

1. Generator setup: transformer with patches, react-query client, runtime validation,
   operation names, tags-split. Old `client.gen.ts`/`zod.gen.ts` are generated in
   parallel until the last slice so unmigrated features keep compiling.
2. One slice per feature, smallest first: credentials, policy sets, the three policies,
   discovery cache, providers, platform providers, audit, discovery inventory, recovery
   groups, recovery applications, recovery runs. Each slice replaces the feature's API
   module, hooks, query keys and view models, moves its invalidations to
   `mutationInvalidates`, and keeps its tests green.
3. Remove the parallel old output, extend the ESLint guards, add the CI drift job,
   update ADR 0001.

## Testing

- Per slice: the feature's existing tests, adjusted to generated hooks; a test per
  mutation that the list query refreshes (guards against key mismatches).
- Generator: a test per spec patch that it applies, and that it throws when obsolete.
- Before merge: manual check against the test backend for every slice.
- Not in scope: generated MSW mocks (needs a new dependency, `msw`); can follow later.

## Out of scope

- Backend changes; the spec-gap report remains the channel for those.
- Changing cache timings.
- UI redesign; screens keep their behavior, only the data layer changes.

## Open points for review

- Decision 5 (no pure-rename view models) touches every component that reads
  camelCase fields. It is the biggest part of the work and the one that removes the
  silent-drop problem. Confirm or reject.
- The `api-drift` CI job needs network access from the runner to the backend.
