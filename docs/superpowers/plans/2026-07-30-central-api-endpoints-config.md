# Implementation Plan: Central API Endpoints Configuration

## Overview

Create one domain-grouped TypeScript configuration for every frontend
`/api/...` endpoint and migrate all real backend API clients to consume it.
Request construction and behavior remain feature-owned.

## Architecture Decisions

- `src/config/apiEndpoints.ts` is the only production source of backend endpoint
  path literals.
- The readonly object is grouped into `discovery`, `providers`, `credentials`,
  and `recoveryApplications`.
- Query parameters remain in API clients and continue to use
  `URLSearchParams`.
- The Vite proxy target and rewrite remain unchanged.
- Generic `/api/example` literals in `apiClient.test.ts` remain test fixtures,
  not configured backend endpoints.

## Dependency Graph

```text
API_ENDPOINTS config
├── discovery inventory and tags clients
├── virtual disks client
├── providers client
├── credentials API and public-key client
└── recovery applications client
    └── production-source literal audit
```

## Task 1: Add the central endpoint configuration

**Description:** Create the readonly domain-grouped endpoint object and a
focused invariant test.

**Acceptance criteria:**

- [ ] Every currently used backend endpoint is represented exactly once.
- [ ] Every endpoint value begins with `/api/`.
- [ ] Endpoint values are unique.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/config/apiEndpoints.test.ts`
- [ ] TypeScript infers literal readonly endpoint values.

**Dependencies:** None.

**Files likely touched:**

- `src/config/apiEndpoints.ts`
- `src/config/apiEndpoints.test.ts`

**Estimated scope:** Small — 2 files.

## Task 2: Migrate discovery inventory and tags

**Description:** Replace local discovery and tags endpoint literals with
references to the central discovery configuration.

**Acceptance criteria:**

- [ ] VMware, tag-filtered, Power, FlashSystem, and tags requests use
  `API_ENDPOINTS.discovery`.
- [ ] Existing query-string behavior is unchanged.
- [ ] Existing tests continue to assert the same final request URLs.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/features/discovery-inventory/api/discoveryInventoryApi.test.ts src/features/discovery-inventory/api/tagsApi.test.ts`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/discovery-inventory/api/discoveryInventoryApi.ts`
- `src/features/discovery-inventory/api/discoveryInventoryApi.test.ts`
- `src/features/discovery-inventory/api/tagsApi.ts`
- `src/features/discovery-inventory/api/tagsApi.test.ts`

**Estimated scope:** Medium — 4 files.

## Task 3: Migrate the virtual-disks client

**Description:** Replace the local virtual-disks endpoint constant while
preserving required and optional query parameters.

**Acceptance criteria:**

- [ ] The client uses `API_ENDPOINTS.discovery.virtualDisksByVm`.
- [ ] `vm_name` and optional `provider_id` serialization is unchanged.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/features/discovery-inventory/resources/api/vdisksApi.test.ts`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/discovery-inventory/resources/api/vdisksApi.ts`
- `src/features/discovery-inventory/resources/api/vdisksApi.test.ts`

**Estimated scope:** Small — 2 files.

## Checkpoint: Discovery migration

- [ ] Tasks 1–3 focused tests pass.
- [ ] Type checking passes.
- [ ] No discovery `/api/...` literal remains outside the central config or
  request assertions in tests.

## Task 4: Migrate the providers client

**Description:** Replace list, submit, and delete provider constants with the
central provider endpoint group.

**Acceptance criteria:**

- [ ] All three provider operations use `API_ENDPOINTS.providers`.
- [ ] Delete query encoding and all HTTP methods remain unchanged.
- [ ] Provider API tests assert the same request contracts.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/features/providers-connectors/providers/api/providersApi.test.ts`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/providers-connectors/providers/api/providersApi.ts`
- `src/features/providers-connectors/providers/api/providersApi.test.ts`

**Estimated scope:** Small — 2 files.

## Task 5: Migrate credentials endpoints

**Description:** Replace credential CRUD and public-key endpoint constants with
the central credentials group.

**Acceptance criteria:**

- [ ] List, submit, delete, and public-key calls use
  `API_ENDPOINTS.credentials`.
- [ ] Public-key loading continues using its existing PEM `Accept` header and
  encryption flow.
- [ ] Credential request URLs and HTTP behavior remain unchanged.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/features/providers-connectors/credentials/api/credentialsApi.test.ts src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/providers-connectors/credentials/api/credentialsApi.ts`
- `src/features/providers-connectors/credentials/api/credentialsApi.test.ts`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.ts`
- `src/features/providers-connectors/credentials/api/credentialsCrypto.test.ts`

**Estimated scope:** Medium — 4 files.

## Task 6: Migrate recovery application endpoints

**Description:** Replace the list constant and inline DAG submit path with the
central recovery-application endpoint group.

**Acceptance criteria:**

- [ ] List and submit requests use `API_ENDPOINTS.recoveryApplications`.
- [ ] `filename` and `is_final` query parameters remain encoded through
  `URLSearchParams`.
- [ ] Network and HTTP error messages retain the resolved request URL.

**Verification:**

- [ ] Tests pass:
  `npm test -- src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Dependencies:** Task 1.

**Files likely touched:**

- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.ts`
- `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`

**Estimated scope:** Small — 2 files.

## Checkpoint: Complete migration

- [ ] All focused config and API tests pass.
- [ ] Production-source search finds no hardcoded backend `/api/...` endpoint
  outside `src/config/apiEndpoints.ts`.
- [ ] Type checking passes.
- [ ] Linting passes with zero warnings.
- [ ] Production build succeeds.
- [ ] Final code review finds no behavior, security, or performance regression.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---:|---|
| An endpoint is omitted | High | Inventory all production `/api/...` literals before and after migration |
| Query parameters move into config | Medium | Keep only path strings in config; retain `URLSearchParams` in feature clients |
| Public-key request behavior changes | High | Change only the path reference and run crypto API tests |
| Generic API client test is treated as production config | Low | Explicitly allow `/api/example` only in `apiClient.test.ts` |
| Concurrent work overlaps API files | Medium | Check worktree before edits and preserve unrelated staged changes |

## Open Questions

None. The backend host and port remain explicitly out of scope.
