# Recovery Group Rollback Orchestration API

## Overview

The `POST /api/rollback_from_orchestrator` endpoint enables clients to roll back orchestration for a recovery group. This operation removes the Airflow DAG, runs, task instances, and IBM FlashCopy objects associated with a group while preserving the group record itself.

**Status:** Server-side backend endpoint already exists; this spec documents the client-side TypeScript integration.

---

## Endpoint Contract

### Request

```http
POST /api/rollback_from_orchestrator?recovery_group_id={id}&provider_id={id}
```

**Query Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `recovery_group_id` | string | Yes | ID of the recovery group to roll back |
| `provider_id` | string | Yes | ID of the orchestration (AIRFLOW) provider that owns the DAG |

**Header:**
- `X-User: {username}` — Auto-injected by `apiFetch`
- `Accept: application/json` — Auto-injected by `apiFetch`

### Response

**Success (200 OK):**
```json
{ /* Opaque; client ignores and triggers refresh */ }
```

**Error (4xx / 5xx):**
- Follows standard error semantics via `requireOk(response, ...)` — throws on non-2xx status
- Caller handles in try/catch; error message derived from operation string

---

## TypeScript Implementation

### API Function

**File:** `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`

```typescript
export async function rollbackRecoveryGroupOrchestration(
  groupId: string,
  providerId: string,
): Promise<void>
```

**Behavior:**
- Takes group ID and provider ID
- Calls `apiFetch` with POST method and query parameters
- Throws on non-2xx response (via `requireOk`)
- Returns void; callers trigger group list refresh via React Query

### React Hook

**File:** `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts`

Added mutation:
```typescript
rollback: (groupId: string, providerId: string) => rollbackMutation.mutateAsync(...)
isRollingBack: boolean // Loading state
```

**Behavior:**
- Invalidates recovery group list query on success → forces refresh
- Caller awaits promise for UI feedback (loading state, error handling)

### Config

**File:** `src/config/apiEndpoints.ts`

```typescript
recoveryGroups: {
  list: '/api/get_recovery_groups',
  submit: '/api/submit_recovery_group',
  delete: '/api/delete_recovery_group',
  rollback: '/api/rollback_from_orchestrator',  // ← NEW
}
```

---

## Error Handling

Errors are propagated to the caller:

1. **Network / fetch failures** → `apiFetch` throws
2. **Non-2xx status codes** → `requireOk` throws with message: `"Rollback recovery group orchestration request failed with status {code}"`
3. **Caller responsibility** → try/catch and display user-friendly error message (e.g., via translation key)

---

## Data Flow

```
UI (Editor Page)
  ↓
Hook: useRecoveryGroups().rollback(groupId, providerId)
  ↓
Mutation: rollbackMutation.mutateAsync({ groupId, providerId })
  ↓
API: rollbackRecoveryGroupOrchestration(groupId, providerId)
  ↓
apiFetch(url, { method: 'POST' })
  ↓ (with X-User header locked)
→ Backend: POST /api/rollback_from_orchestrator
  ↓
[Success: delete Airflow DAG/runs; keep group with push_to_orchestrator = false]
  ↓
← Invalidate recovery group list
← Refresh UI
```

---

## Design Decisions

1. **Query parameters, not body** — Follows REST conventions for simple IDs (no complex payload)
2. **POST, not DELETE** — Operation is not idempotent (multiple calls = multiple deletions); POST is semantically correct
3. **Void return** — Response payload is opaque; client triggers refresh via React Query invalidation
4. **Locked X-User header** — Set last in `apiFetch`, cannot be overridden by caller
5. **Single mutation** — Reuses recovery group query cache; one truth

---

## Future Extensions

If the backend response evolves to return updated group state:
- Change return type from `Promise<void>` to `Promise<RecoveryGroup>`
- Update mutation to use response in cache update (skip invalidation)
- Pass new group data to caller if needed for immediate UI update

---

## Verification Checklist

- [x] Endpoint URL matches backend (`/api/rollback_from_orchestrator`)
- [x] Query parameters match backend signature (`recovery_group_id`, `provider_id`)
- [x] HTTP method is POST
- [x] Uses `apiFetch` wrapper (X-User header locked)
- [x] Error handling follows pattern (requireOk)
- [x] React Query mutation invalidates list on success
- [x] TypeScript types are correct
- [x] Hook exports simple, intuitive API
