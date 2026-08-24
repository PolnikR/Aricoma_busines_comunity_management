# Recovery Group Rollback From Orchestrator — Design

**Date:** 2026-08-06
**Supersedes:** `2026-08-06-rollback-orchestration-endpoint.md` (documented a `void` return; superseded by the report-parsing contract below)

## Problem

`POST /rollback_from_orchestrator` deletes a recovery group's Airflow DAG (file, record, every run
and task instance) and every IBM FlashCopy object it created. The group record survives; only
`push_to_orchestrator` flips to `false`.

The endpoint is wired into the API layer and the `useRecoveryGroups` hook, but nothing calls it.
This design settles where the action lives in the UI, how its result is surfaced, and what has to
change to make it callable at all.

## Decisions

### 1. The action lives in the detail drawer, not the edit wizard

The rollback response returns the group with `"push_to_orchestrator": false` **already persisted**.
The action is committed server-side the moment it returns.

The wizard's contract is the opposite: draft → validate → Save. If rollback lived in the
Orchestration step, the Save button afterward would submit `push_to_orchestrator=true` from the
still-dirty draft and **re-push the DAG the user just deleted**. `submitRecoveryGroup` passes
`push_to_orchestrator` as a query param built from `validated.pushToOrchestrator`
(`recoveryGroupsApi.ts`), so this is a live path, not a hypothetical.

That makes the wizard a correctness trap, not merely awkward. The `DetailDrawer` in
`RecoveryGroupsTable.tsx` has no draft/save semantics and already displays the exact two fields
rollback changes — the Orchestration badge and the Airflow Run ID. It is the correct home.

### 2. The button sits inline on the Orchestration row, not in the drawer footer

The drawer footer holds Delete + Edit, each `flex-1`. A conditional third button there shifts
Edit's position depending on which group is selected, breaking muscle memory, and crowds a
resizable panel.

Inline on the Orchestration row instead:

```
Orchestration      [Yes]  [Roll back]
Airflow Run ID     260806104153_5d069d9a
```

The action sits against the state it changes; conditionality costs nothing (no button when
`pushToOrchestrator` is false, and the row still reads `No` with no layout hole); the footer stays
stable.

**Not** in the table rows. A destructive, irreversible action one click away in a dense list
invites accidents. Drawer-only also guarantees the user has opened and looked at the group first.

### 3. Rollback is not binary — a 200 can describe a partial failure

The response carries per-section statuses and an error list:

```json
"rollback": {
  "status": "ok",
  "airflow": { "status": "ok", ... },
  "ibm":     { "status": "ok", ..., "errors": [] }
}
```

Airflow cleanup can succeed while FlashCopy cleanup leaves objects behind. The current
implementation returns `Promise<void>` and discards the body, so that case renders as a clean
success and the operator never learns about the orphaned objects — the one piece of state the UI
cannot otherwise show them.

Rollback is therefore treated as fully successful only when **all** of these hold:

- `rollback.status === 'ok'`
- `rollback.airflow.status === 'ok'`
- `rollback.ibm.status === 'ok'`
- `rollback.ibm.errors` is absent or empty

An absent section or absent `errors` array counts as "nothing to report", not as a failure — the
schema marks them optional and a backend that omits an untouched section must not read as an error.
A section that is *present* with a non-`ok` status always does.

Otherwise the result modal renders in a warning state listing what did not complete. The HTTP
status is not consulted for this; a 200 with a non-`ok` section is a partial failure.

### 4. On success the drawer closes, then the modal opens

No modal-over-drawer stacking. This mirrors the delete flow, which already calls
`setSelectedId(null)` on confirm. The list is invalidated behind the modal, so dismissing it
reveals the row with Orchestration flipped to `No`.

On a thrown error (network failure, non-2xx) the drawer **stays open** so the user can retry, and
the error surfaces through the existing `mutationError` banner on the list page.

## Backend dependency

Rollback requires `provider_id` — the AIRFLOW provider the group was pushed to. **The group record
does not carry it.** `recoveryGroupApiSchema` has only `provider_id_vm` and `provider_id_volume`.
This is also why `RecoveryGroupBuilder` hardcodes `orchestrationProviderId: null` when loading a
group for edit: the information isn't there to load.

The backend already *receives* this value — `submitRecoveryGroup` sends it as the `provider_id`
query param. It simply is not persisted back into the read model.

**Required change:** the recovery group record gains `platform_provider_id`, returned by
`/get_recovery_groups`. No change to the submit payload; the read path alone is affected.

Alternatives rejected: inferring the sole eligible AIRFLOW provider client-side works today
(`PLATFORM_PROVIDER_TYPES` has one member) but silently breaks when a second provider is added;
asking the user to pick a provider in a confirm dialog asks for something the system should know.

### Transitional behaviour

`platform_provider_id` is parsed as optional, so responses without it validate today and the field
activates when the backend ships. Until then `orchestrationProviderId` is `null` and the Roll back
button renders **disabled**, with a `title` explaining the orchestration provider is unknown.

Disabled rather than hidden is deliberate: a hidden button makes the feature silently inert, and
nobody notices the backend change never landed. The tradeoff is a visible disabled control on every
orchestrated group until it does.

## Wire contract

```
POST /api/rollback_from_orchestrator?recovery_group_id={id}&provider_id={id}
```

`X-User` and `Accept` are injected by `apiFetch`; `X-User` is set last and cannot be overridden.

Response:

```json
{
  "recovery_groups": [ { "...": "group record, push_to_orchestrator: false" } ],
  "rollback": {
    "status": "ok",
    "airflow": {
      "status": "ok",
      "dag_id": "dag_260806104153_5d069d9a",
      "paused": "paused",
      "failed_runs": [],
      "dag_file": "removed",
      "dag_record": "deleted"
    },
    "ibm": {
      "status": "ok",
      "consistency_groups": [],
      "fcmaps": [],
      "volumes": [],
      "errors": []
    }
  }
}
```

### Schema strategy

Only one sample response is known, and every array in it is empty — so element types are
unobserved. The schema is deliberately permissive:

- `status` fields are `z.string()`, not enums. An unrecognised status must not throw; it is
  compared against `'ok'` and anything else is a warning.
- Unobserved arrays are `z.array(z.unknown())`.
- Report objects use `z.looseObject()` (Zod 4's replacement for `.passthrough()`) so unknown keys
  survive into the raw-JSON view instead of being stripped. No existing schema in the repo uses
  loose objects; this is the first.

The modal renders counts and known scalars, plus the raw report JSON in a `<pre>` block reusing the
`JsonViewerModal` presentation. Rendering raw JSON is honest about fields whose populated shape has
never been seen, rather than inventing typed rows that may not match.

## Frontend changes

| File | Change |
|---|---|
| `api/schemas/recoveryGroupsSchema.ts` | Add `platform_provider_id` (optional) to `recoveryGroupApiSchema`; add `rollbackResponseSchema` + report schemas |
| `model/recoveryGroupTypes.ts` | Add `orchestrationProviderId?: string \| null` to `RecoveryGroup` — optional, matching its sibling read-model fields `airflowRunId?` and `pushToOrchestrator?`, so existing `RecoveryGroup` fixtures need no churn |
| `helpers/mapRecoveryGroups.ts` | Map `platform_provider_id` → `orchestrationProviderId`, absent → `null` |
| `api/recoveryGroupsApi.ts` | Change return type from `Promise<void>` to the parsed report |
| `hooks/useRecoveryGroups.ts` | `rollback` resolves with the report instead of `void` |
| `components/RecoveryGroupRollbackResultModal.tsx` | **New.** Success/warning result modal |
| `components/RecoveryGroupsTable.tsx` | Inline Roll back button on the Orchestration row; danger `ConfirmDialog`; result modal; close drawer on success |
| `pages/RecoveryGroupsListPage.tsx` | Pass `onRollback` down |
| `src/locales/{en,cs,sk}.json` | New flat dot-notation keys under `recoveryGroups.rollback.*` |

### Component boundary

The table already owns `JsonViewerModal` and `ConfirmDialog` locally, so it owns the rollback
confirm and result modals too. The page owns the hook and passes one prop:

```ts
onRollback: (groupId: string, providerId: string) => Promise<RollbackReport>
```

The table never touches the API layer. `isRollingBack` drives the button's spinner.

### Confirm dialog

Reuses `ConfirmDialog` with `tone="danger"`, matching the delete flow. The message names the group
and states what is destroyed: the DAG file and record, every run and task instance, and all
FlashCopy objects. It must also say the group itself survives — otherwise "rollback" reads as
"delete" and the user cannot tell the two actions apart.

## Testing

- **API:** correct URL, query params, `POST` method, `X-User` header; parses the sample report;
  throws on non-2xx.
- **Schema:** unknown `status` values parse without throwing; unknown report keys survive
  `z.looseObject()`; `platform_provider_id` absent → `orchestrationProviderId: null`.
- **Mapping:** `platform_provider_id` maps through to `orchestrationProviderId`.
- **Table:** button renders only when `pushToOrchestrator === true`; disabled when
  `orchestrationProviderId` is `null`; confirm is required before any call; drawer closes on
  success; drawer stays open on throw.
- **Partial failure:** a 200 whose `ibm.errors` is non-empty renders the warning state, not a clean
  success. This is the regression that matters most — it is the case the current code gets wrong.

## Resolved: endpoint constant

`rollbackRecoveryGroupOrchestration` briefly hardcoded `/api/rollback_from_orchestrator`, leaving
`API_ENDPOINTS.recoveryGroups.rollback` dead. Now fixed — it uses the constant, matching the
`submit` and `delete` calls beside it.

The original `Invalid type "any" of template literal expression` error was spurious: the editor's
language server held a view of `apiEndpoints.ts` predating the added `rollback` key, so the property
read as a nonexistent-property error type. Two things confirm this rather than assume it — the
adjacent `${API_ENDPOINTS.recoveryGroups.delete}` on the same object never errored, and both
`tsc --noEmit` and `eslint --max-warnings 0` pass clean on the template-literal form.

Worth remembering while implementing the rest of this design: **the editor diagnostics in this repo
can lag edits to `apiEndpoints.ts` and the schema files.** Trust `npm run build` over the inline
squiggle, and do not code around an editor error without first reproducing it in the real
toolchain — that is exactly how the hardcoded URL got committed.

## Out of scope

- **Fixing `RecoveryGroupBuilder.tsx`'s `orchestrationProviderId: null` on edit-load.** The
  `platform_provider_id` change makes this fixable, but loading a real provider changes wizard
  behaviour and carries its own testing burden. Noted so it is not silently forgotten; it is a
  separate change.
- Rollback from the recovery **applications** feature.
- Bulk rollback across multiple groups.
