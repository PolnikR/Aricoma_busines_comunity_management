# Recovery Group Rollback From Orchestrator — Implementation Plan

> **For agentic workers:** Implement task-by-task. Each task ends green (build passes) and is
> committed separately. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `POST /api/rollback_from_orchestrator` callable from the recovery group detail
drawer, parse its report, and surface partial failures instead of hiding them.

**Architecture:** The endpoint and hook mutation already exist. This plan changes the API function
to return its parsed report instead of discarding it, threads a new `orchestrationProviderId`
through the read model, and adds a confirm → call → result-modal flow inline on the drawer's
Orchestration row. The table owns both modals (matching how it already owns `JsonViewerModal` and
`ConfirmDialog`); the page owns the hook and passes one handler down.

**Tech Stack:** React 19, TypeScript, Zod 4, TanStack Query, Vitest + Testing Library, existing
shared UI (`Modal`, `ConfirmDialog`, `DetailDrawer`, `DetailRow`, `Badge`, `Button`).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-08-06-recovery-group-rollback-design.md`. Follow it for
  placement and scope decisions.
- **Editor diagnostics in this repo lag edits to `src/config/apiEndpoints.ts` and the schema
  files.** An `Invalid type "any" of template literal expression` squiggle on a freshly-added
  `API_ENDPOINTS` key is spurious. Verify with `npx tsc --noEmit` and `npx eslint` before changing
  code to satisfy the editor — coding around this exact false positive is how a hardcoded URL got
  committed once already.
- Locale files `src/locales/{en,cs,sk}.json` are **flat dot-notation keys** and must stay in exact
  key-parity. All three currently hold **1135** keys; every key added to one goes into all three.
- Only one sample rollback response is known, and every array in it was empty. Schemas stay
  permissive (see Task 1). Do not invent enum members or typed array elements for shapes nobody has
  observed.
- `platform_provider_id` does not exist in the backend read model yet. Everything here is built to
  activate when it lands; until then the Roll back button renders disabled. **Do not** add a
  client-side fallback that guesses the provider — that was explicitly rejected in the spec.
- Do not fix `RecoveryGroupBuilder.tsx`'s `orchestrationProviderId: null` on edit-load. Out of
  scope, noted in the spec.

**Verification commands** (run the narrow ones per step, the full gate per task):

```
npx tsc --noEmit
npx eslint <changed files> --max-warnings 0
npx vitest run <test file>
npm run build          # lint → typecheck → test → vite build
```

---

### Task 1: Parse the rollback report

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- Modify: `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.ts`
- Create: `src/features/recovery-plans/recovery-groups/utils/rollbackReport.ts`
- Test: `src/features/recovery-plans/recovery-groups/utils/rollbackReport.test.ts`
- Test: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts` (extend)

**Interfaces produced:** `rollbackResponseSchema`, `rollbackReportSchema`, `RollbackReport`,
`isRollbackClean(report): boolean`, and
`rollbackRecoveryGroupOrchestration(groupId, providerId): Promise<RollbackReport>`.

- [ ] **Step 1: Add the report schemas**

In `recoveryGroupsSchema.ts`. Statuses are `z.string()`, not enums, so an unrecognised value warns
instead of throwing. Unobserved arrays are `z.array(z.unknown())`. Report objects are
`z.looseObject()` — Zod 4's replacement for `.passthrough()` — so unknown keys survive into the raw
JSON view instead of being stripped. This is the first loose object in the repo.

```ts
const rollbackAirflowSchema = z.looseObject({
  status: z.string(),
  dag_id: z.string().optional(),
  paused: z.string().optional(),
  failed_runs: z.array(z.unknown()).optional(),
  dag_file: z.string().optional(),
  dag_record: z.string().optional(),
})

const rollbackIbmSchema = z.looseObject({
  status: z.string(),
  consistency_groups: z.array(z.unknown()).optional(),
  fcmaps: z.array(z.unknown()).optional(),
  volumes: z.array(z.unknown()).optional(),
  errors: z.array(z.unknown()).optional(),
})

export const rollbackReportSchema = z.looseObject({
  status: z.string(),
  airflow: rollbackAirflowSchema.optional(),
  ibm: rollbackIbmSchema.optional(),
})

export const rollbackResponseSchema = z.object({
  recovery_groups: z.array(recoveryGroupApiSchema),
  rollback: rollbackReportSchema,
})

export type RollbackReport = z.infer<typeof rollbackReportSchema>
```

- [ ] **Step 2: Write failing tests for `isRollbackClean`**

Create `utils/rollbackReport.test.ts`. Cover, from the spec's rule:

- all statuses `ok` and `errors: []` → clean
- `rollback.status` not `ok` → not clean
- `airflow.status` not `ok` → not clean
- `ibm.status` not `ok` → not clean
- `ibm.errors` non-empty while every status is `ok` → **not clean** (this is the case the current
  code gets wrong and the whole design exists to catch)
- `airflow`/`ibm` absent entirely → clean (absent means nothing to report, not failure)
- `ibm` present but `errors` absent → clean

- [ ] **Step 3: Implement `isRollbackClean`**

```ts
export function isRollbackClean(report: RollbackReport): boolean {
  const sectionOk = (section: { status: string } | undefined) => !section || section.status === 'ok'
  return report.status === 'ok'
    && sectionOk(report.airflow)
    && sectionOk(report.ibm)
    && (report.ibm?.errors?.length ?? 0) === 0
}
```

Verify: `npx vitest run src/features/recovery-plans/recovery-groups/utils/rollbackReport.test.ts`

- [ ] **Step 4: Return the report from the API function**

Change the signature to `Promise<RollbackReport>` and parse:

```ts
requireOk(response, 'Rollback recovery group orchestration')
const payload: unknown = await response.json()
return rollbackResponseSchema.parse(payload).rollback
```

Leave the existing `apiFetch(`${API_ENDPOINTS.recoveryGroups.rollback}?...`)` call as-is.

- [ ] **Step 5: Extend the API tests**

Add to `recoveryGroupsApi.test.ts`, using the exact sample response from the spec as the fixture:

- request goes to `/api/rollback_from_orchestrator` with `recovery_group_id` and `provider_id`
  query params and `method: 'POST'`
- the `X-User` header is present (assert via `new Headers(init.headers).get('X-User')`, matching how
  the other API tests in this repo assert it)
- resolves with the `rollback` object, not the whole envelope
- an unrecognised `status` string parses without throwing
- unknown keys inside `rollback.airflow` survive parsing (proves `looseObject`)
- a non-2xx response throws

- [ ] **Step 6: Widen the hook's return**

`useRecoveryGroups`'s `rollback` already delegates to `mutateAsync`, so its type widens from the
mutation automatically. Confirm `rollback` is typed `(groupId, providerId) => Promise<RollbackReport>`
and that `isRollingBack` is still exported.

**Acceptance:** `isRollbackClean` returns false for a 200 whose `ibm.errors` is non-empty. The API
function resolves with a parsed report. `npm run build` passes. Commit.

---

### Task 2: Thread the orchestration provider through the read model

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts`
- Modify: `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- Modify: `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- Test: `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts` (extend, or
  create if absent)

**Interfaces produced:** `RecoveryGroup.orchestrationProviderId`.

- [ ] **Step 1: Add the wire field**

`platform_provider_id: z.string().optional()` on `recoveryGroupApiSchema`. Optional so today's
responses — which lack it — still validate.

- [ ] **Step 2: Add the model field**

`orchestrationProviderId?: string | null | undefined` on `RecoveryGroup`. Optional deliberately, to
match its sibling read-model fields `airflowRunId?` and `pushToOrchestrator?`, so no existing
`RecoveryGroup` fixture needs touching.

- [ ] **Step 3: Write failing mapping tests**

- `platform_provider_id: 'airflow-01'` → `orchestrationProviderId: 'airflow-01'`
- field absent → `orchestrationProviderId: null`
- both the VM-group and volume-group paths, since `mapRecoveryGroupApiRecord` has **two** returns

- [ ] **Step 4: Map it**

Add `orchestrationProviderId: record.platform_provider_id ?? null` to **both** return objects in
`mapRecoveryGroupApiRecord` (the VM path and the volume path — easy to update one and miss the
other). Also set it in `toRecoveryGroup` from `draft.orchestrationProviderId`, so a group built from
a draft carries it too.

Do **not** add it to `toRecoveryGroupSubmitPayload` or `toRecoveryGroupJson` — the orchestration
provider travels as a query param on submit, not in the body, so the payload shape is unchanged.

**Acceptance:** A group record with `platform_provider_id` maps to `orchestrationProviderId` on both
paths; without it, `null`. `npm run build` passes. Commit.

---

### Task 3: Build the result modal in isolation

Built and tested before any wiring, so its states are proven independently of the drawer.

**Files:**
- Create: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`
- Modify: `src/locales/en.json`, `src/locales/cs.json`, `src/locales/sk.json`

**Interfaces produced:**

```ts
interface RecoveryGroupRollbackResultModalProps {
  open: boolean
  onClose: () => void
  groupName: string
  report: RollbackReport | null
}
```

- [ ] **Step 1: Add locale keys to all three files**

Under `recoveryGroups.rollback.*` — button label, disabled-state title, confirm title/message/label,
and result modal aria-label, success and warning title/description, DAG id, section labels, errors
label, raw-details label. Keep en/cs/sk in exact parity; re-count after editing:

```
node -e "['en','cs','sk'].forEach(l=>console.log(l,Object.keys(require('./src/locales/'+l+'.json')).length))"
```

All three must still match.

- [ ] **Step 2: Write failing modal tests**

- clean report → success heading and icon
- report with non-empty `ibm.errors` → warning heading, and the errors are rendered
- report with `airflow.status: 'error'` → warning heading
- `dag_id` renders when present, omitted when absent
- absent `airflow`/`ibm` sections render without crashing
- `report: null` renders nothing

- [ ] **Step 3: Implement the modal**

Structure it on `RecoveryGroupOrchestratorSuccessModal` — same `Modal` + header-icon + `DetailRow`
`<dl>` shape — so the rollback result reads as the mirror of the push result the user already knows.
Switch icon and tone off `isRollbackClean(report)`.

Render the raw report JSON in a `<pre>` block reusing `JsonViewerModal`'s presentation
(`text-xs font-mono ... whitespace-pre-wrap`). This is deliberate: the populated shape of
`ibm.errors`, `fcmaps` and `failed_runs` has never been observed, so typed rows would be guesses.

Verify: `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupRollbackResultModal.test.tsx`

**Acceptance:** Modal renders success and warning states from fixture reports, with locale parity
intact. `npm run build` passes. Commit.

---

### Task 4: Wire the drawer

**Files:**
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupsListPage.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
  (extend, or create if absent)

**Interfaces produced:** two new `RecoveryGroupsTable` props:

```ts
onRollback: (groupId: string, providerId: string) => Promise<RollbackReport>
isRollingBack?: boolean
```

- [ ] **Step 1: Write the failing table tests**

- no Roll back button when `pushToOrchestrator` is false
- button present when `pushToOrchestrator` is true
- button **disabled** when `orchestrationProviderId` is null/absent
- button enabled when both are set
- clicking it does **not** call `onRollback` until the confirm dialog is confirmed
- confirming calls `onRollback(group.id, group.orchestrationProviderId)`
- on resolve: drawer closes and the result modal opens
- on reject: drawer stays open and no result modal appears

- [ ] **Step 2: Add the inline button**

In the Orchestration `DetailRow`'s `value`, wrap the existing `Badge` and the new `Button` in a flex
row. Render the button only when `selected.pushToOrchestrator` is true; disable it when
`selected.orchestrationProviderId` is falsy, with a `title` explaining the orchestration provider is
unknown. Drive its spinner from `isRollingBack`.

Leave the drawer `footer` untouched — Delete and Edit keep their positions.

- [ ] **Step 3: Add the confirm dialog**

A second `ConfirmDialog` with `tone="danger"`, keyed off its own `rollbackTarget` state, mirroring
the existing `deleteTarget` dialog. The message names the group, states what is destroyed (DAG file
and record, every run and task instance, all FlashCopy objects), **and states the group itself
survives** — otherwise "roll back" reads as "delete" and the two drawer actions become
indistinguishable.

- [ ] **Step 4: Handle the result**

On confirm: `await onRollback(...)`, then `setSelectedId(null)` to close the drawer, then store the
report to open the result modal. On throw: clear `rollbackTarget`, leave `selectedId` alone, and let
the error surface through the page's existing `mutationError` banner.

- [ ] **Step 5: Pass the handler from the page**

`RecoveryGroupsListPage` pulls `rollback` and `isRollingBack` off `useRecoveryGroups` and forwards
them. The table must not import the API layer.

**Acceptance:** All table tests pass, including drawer-closes-on-success and stays-open-on-error.
`npm run build` passes. Commit.

---

### Task 5: Final gate

- [ ] **Step 1: Full suite**

`npm run build` clean from a cold start. No uncommitted changes.

- [ ] **Step 2: Manual check of what is reachable today**

With `platform_provider_id` still absent from the backend, verify in the browser that an
orchestrated group's drawer shows the Roll back button **disabled** with its explanatory title, and
that a non-orchestrated group shows no button and no layout hole on the Orchestration row.

- [ ] **Step 3: Record what remains blocked**

The enabled path cannot be exercised end-to-end against the real endpoint until
`platform_provider_id` ships. Unit tests cover it by setting `orchestrationProviderId` directly on a
fixture, but that is not the same as a real round-trip. State this plainly when reporting the task
complete rather than implying full verification.

**Acceptance:** Build green, disabled state confirmed in-browser, residual backend dependency
reported honestly and not glossed over.

---

## Post-backend follow-up

Once `platform_provider_id` is returned by `/api/get_recovery_groups`:

1. Confirm the button enables with no code change (the mapping already handles it).
2. Exercise a real rollback and compare the live report against `rollbackReportSchema` — this is the
   first chance to see the arrays populated, and the schema's permissiveness exists precisely
   because that shape is currently a guess.
3. Consider tightening the schema and replacing the raw-JSON block with typed rows, now informed by
   real data.
4. Separately, fix `RecoveryGroupBuilder.tsx`'s `orchestrationProviderId: null` on edit-load.
