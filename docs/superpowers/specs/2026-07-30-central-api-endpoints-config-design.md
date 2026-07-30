# Central API Endpoints Configuration Design

## Goal

Move every frontend `/api/...` endpoint path into one structured TypeScript
configuration file so endpoint changes require editing a single location.

The backend host and port in the Vite development proxy remain out of scope.

## Configuration Structure

Create `src/config/apiEndpoints.ts` with one readonly `API_ENDPOINTS` object.
Endpoints are grouped by the domain that owns them:

```ts
export const API_ENDPOINTS = {
  discovery: {
    virtualMachines: '/api/vms',
    virtualMachinesByTag: '/api/vms_by_tag',
    powerVirtualMachines: '/api/get_power_vm',
    flashSystemVolumes: '/api/get_volumes',
    virtualDisksByVm: '/api/vdisks_by_vm',
    tags: '/api/tags',
  },
  providers: {
    list: '/api/get_providers',
    submit: '/api/submit_provider',
    delete: '/api/delete_provider',
  },
  credentials: {
    publicKey: '/api/credentials/pubkey',
    list: '/api/get_credentials',
    submit: '/api/submit_credential',
    delete: '/api/delete_credential',
  },
  recoveryApplications: {
    list: '/api/get_recovery_apps',
    submitDag: '/api/submit_recovery_dag',
  },
} as const
```

Property names describe the frontend operation or resource instead of copying
backend naming conventions into constant names.

## Consumer Migration

Feature API clients will import `API_ENDPOINTS` and select the endpoint from
their domain:

- discovery inventory;
- tags;
- virtual disks;
- providers;
- credentials and credential public-key loading;
- recovery applications.

Query-string construction remains inside each feature API client because query
parameters are part of that operation's request logic, not endpoint
configuration.

## Boundaries

This refactor does not change:

- the Vite proxy target, rewrite, or development server behavior;
- HTTP methods, headers, bodies, or query parameters;
- `apiFetch` behavior;
- backend contracts, parsing, mapping, caching, or UI behavior.

No environment-variable layer or URL builder abstraction is introduced.

## Verification

- Add a focused config test verifying that every configured value begins with
  `/api/` and that endpoint values are unique.
- Keep feature API tests asserting their final request URLs.
- Search production source files to ensure no backend `/api/...` literal remains
  outside the central config and intentional generic API-client tests.
- Run focused API tests, type checking, linting, and the production build.
