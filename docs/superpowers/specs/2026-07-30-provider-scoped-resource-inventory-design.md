# Provider-Scoped Resource Inventory Design

## Goal

Provide one production-ready resource inventory architecture shared by the
Resources page and Recovery Groups while preserving clear source ownership,
efficient fetching, and unambiguous Airflow orchestration.

The expected inventory size is approximately 200 resources per provider and
resource source.

## Domain Invariants

A Recovery Group has exactly:

- one source type;
- one provider;
- one resource type;
- one or more resources owned by that provider.

All resources in a group are recovered as one unit. A Recovery Application may
combine multiple Recovery Groups, including groups owned by different
providers.

For example:

```text
Recovery Application
├── VMware group      → vcenter-prod
├── IBM Power group   → power-prod
└── FlashSystem group → flash-prod
```

This follows the IBM Storage Defender model:

- related resources in a Recovery Group are protected and recovered together;
- resources have a common resource type;
- IBM explicitly requires all VM resources in a group to belong to the same
  vCenter.

References:

- https://www.ibm.com/docs/en/storage-defender/base?topic=concepts-recovery-group
- https://www.ibm.com/docs/en/storage-defender/base?topic=groups-adding-removing-resources
- https://www.ibm.com/docs/en/storage-defender/base?topic=groups-creating-recovery-group
- https://www.ibm.com/docs/en/storage-defender/base?topic=applications-application-details

## Recovery Group Model

Replace name-only resource arrays with provider-scoped resource references:

```ts
type ResourceSourceType = 'vmware' | 'ibm-power' | 'flashsystem'
type RecoveryGroupResourceType = 'vm' | 'volume'

interface RecoveryGroupResourceRef {
  id: string
  displayName: string
}

interface RecoveryGroup {
  id: string
  sourceType: ResourceSourceType
  providerId: string
  resourceType: RecoveryGroupResourceType
  resources: RecoveryGroupResourceRef[]
}
```

`providerId` belongs to the group instead of every resource reference because
mixing providers inside one group is invalid. Resource `id` is the stable
backend identifier; `displayName` is presentation data and is not used as
identity.

The source type, provider, and resource type become immutable after group
creation. Changing any of them requires creating a new group because it changes
the recovery boundary.

## Query and Cache Architecture

Resource inventory is fetched lazily for the active source and provider.

Canonical query keys are:

```ts
['resource-inventory', sourceType, providerId]
```

The key includes only server-side request inputs. Search, UI filters, sorting,
and pagination remain client-side transformations and do not create additional
cache entries.

The flow is:

```text
active Resources tab or Recovery Group selection
  → sourceType
  → providerId
  → useResourceInventory(sourceType, providerId)
  → source-specific API client
  → shared React Query cache
  → Resources page or Recovery Group resource picker
```

The Providers query supplies the available providers. The Resources page
fetches only providers belonging to its active tab. When a tab contains
multiple providers, independent queries run in parallel so one provider failure
does not discard successful inventories from other providers.

Recovery Groups select the resource type first, then a compatible provider,
then resources from that provider. The resource picker consumes the same
source/provider query key as the Resources page. Navigating from Resources to
Groups therefore reuses fresh cached data without another request.

## Cache Policy

- `staleTime`: 15 minutes.
- `gcTime`: 60 minutes.
- `refetchOnWindowFocus`: disabled.
- `retry`: one retry for transient failures.
- Manual refresh targets only the active source/provider query.
- Tab hover or focus prefetch is optional polish, not required for the initial
  implementation.

The longer garbage-collection time preserves inventory while navigating
between Resources and the multi-step Recovery Group wizard.

## Loading and Error Handling

Each provider query owns its loading and error state.

- Initial loading shows a resource-table or resource-picker skeleton.
- A failed provider displays a retry action for that provider.
- Successful providers remain usable when another provider fails.
- Background refresh keeps cached data visible and shows a non-blocking stale
  data warning if refresh fails.
- Recovery Group creation cannot continue until its selected provider inventory
  has loaded successfully and at least one valid resource is selected.

## Airflow Contract Boundary

The submitted Recovery Application must keep provider ownership explicit for
every referenced group. It may reference a Recovery Group by stable group ID
when Airflow or the backend can resolve the authoritative group definition.
Otherwise the application payload must embed the group boundary:

```json
{
  "recovery_group_id": "database_group",
  "source_type": "vmware",
  "provider_id": "vcenter-prod",
  "resource_type": "vm",
  "resource_ids": ["vm-123", "vm-456"]
}
```

Display names are not sent as resource identity. The final payload shape must
match the backend contract, but it must preserve `provider_id` and stable
resource IDs.

## Legacy Data Migration

Existing local Recovery Groups store `resources: string[]` without provider
ownership. Provider identity cannot be inferred safely from a name because
different providers may contain resources with the same name.

Legacy groups must therefore be marked as requiring reassignment:

- preserve their names and other metadata;
- do not guess `providerId`;
- require the user to choose a provider and reselect resources before saving;
- prevent submission of unresolved legacy groups to Recovery Applications.

## Verification

- Query-key tests cover source and provider isolation.
- Resources tests prove that only the active source is fetched.
- Multi-provider tests prove partial success when one provider fails.
- Recovery Group tests enforce one provider and one resource type per group.
- Cache integration tests prove Resources and Groups reuse the same query entry.
- Migration tests prove legacy name-only resources are never assigned to a
  provider automatically.
- Airflow mapper tests prove provider and stable resource IDs are preserved.

## Non-Goals

- Fetching all source types on initial page load.
- Server-side pagination for the current inventory size.
- Mixing providers inside one Recovery Group.
- Inferring provider ownership from resource display names.
- Changing backend endpoint contracts before they are confirmed.
