# Implementation Plan: Orchestration Step for Recovery Groups

## Overview

Add a final **Orchestration** step to the Recovery Group Builder wizard that collects
two values and sends them to the backend as query parameters on
`POST /api/submit_recovery_group`:

1. A required tri-state toggle "Deploy to orchestrator" → `push_to_orchestrator`
2. A required dropdown of AIRFLOW platform providers → `provider_id`

`Next`/`Create` must stay disabled until both are answered.

**The read half of the goal is already done in the working tree (uncommitted).**
Verified at plan time:

- `src/features/recovery-plans/recovery-groups/api/schemas/recoveryGroupsSchema.ts:28-29`
  already has `airflow_run_id: z.string().nullable().optional()` and
  `push_to_orchestrator: z.boolean().optional()`.
- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts:53-56`
  already has `airflowRunId?: string | null | undefined` and
  `pushToOrchestrator?: boolean | undefined` on `RecoveryGroup`.
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts:77-78`
  (VM branch) and `:100-101` (volume branch) already map both fields.
- Four covering tests already exist and pass:
  `recoveryGroupsApi.test.ts:157-170`, `:172-181`,
  `mapRecoveryGroups.test.ts:116-134`, `:136-154`.
- Baseline verified green: `npx vitest run src/features/recovery-plans/recovery-groups`
  → **14 test files / 72 tests passed**.

This plan therefore covers only the **write** path (draft → validation → query
params), the **UI** (new step + wizard renumbering), **i18n**, and the **test
updates** the change forces. Do not re-add the schema/mapper/read-model fields.

## Architecture Decisions

### AD-1: `push_to_orchestrator` is restorable on edit; `airflow_run_id` is not the provider id

`GET /get_recovery_groups` returns `push_to_orchestrator` (boolean) and
`airflow_run_id` (e.g. `"260805112701-9f34e409"`). **`airflow_run_id` is a DAG run
identifier, not a provider id.** The real AIRFLOW provider id is `airflow-01`, from
`GET /get_platform_providers`. The comment already in
`recoveryGroupTypes.ts:53-55` states this.

Consequences, which this plan accepts explicitly:

- `RecoveryGroupDraft.pushToOrchestrator` **is** hydrated on edit from
  `initialData.pushToOrchestrator ?? null` (`RecoveryGroupBuilder.tsx:55-70`).
- `RecoveryGroupDraft.orchestrationProviderId` **cannot** be hydrated from any GET
  field. It initializes to `null` on both create and edit.
- `airflowRunId` stays **read-only**. It is never reverse-mapped to a provider id,
  never written to a draft, and never sent on POST.
- **Edit-flow behaviour:** because `orchestrationProviderId` starts `null` and
  `canCreate` requires it, `Save Recovery Group` would be disabled on every edit.
  Mitigation (AD-4): when exactly one eligible AIRFLOW provider exists, the builder
  auto-selects it without marking the form dirty. When two or more exist, the user
  must visit the Orchestration step and re-pick — this is a deliberate, documented
  UX cost of the missing backend field, not a bug.

### AD-2: The toggle is tri-state on the draft, boolean at the API boundary

A plain `boolean` is always "set", so `Next`/`Create` could never be gated on it.
- `RecoveryGroupDraft.pushToOrchestrator: boolean | null` (`null` = unanswered).
- `ValidatedRecoveryGroupDraft.pushToOrchestrator: boolean` (narrowed in validation,
  exactly as `providerId: string | null` → `providerId: string` is today at
  `recoveryGroupsValidation.ts:31, 43`).

The visible control is the existing `Toggle`
(`src/shared/components/toggle/Toggle.tsx:12-38`, `role="switch"`). It renders
`checked={draft.pushToOrchestrator === true}` and its `onChange` always writes a
`boolean`, so the first click answers `true`. Answering `false` from the unanswered
state requires two clicks (on, then off); the step renders the current answer as
text ("Not selected" / "Yes" / "No") so the state is never ambiguous. See Open
Question 1.

### AD-3: Both new values travel on the draft and leave as QUERY params, never in the JSON body

- They go on `RecoveryGroupDraft`, so **no mutation or page call site changes**:
  `useRecoveryGroups.ts:29` keeps `mutationFn: createRecoveryGroup`, `:50` keeps
  `update: (id, draft) => …`, `RecoveryGroupBuilder.tsx:19` keeps
  `onCreate: (draft: RecoveryGroupDraft) => void`.
- They are **not** added to `RecoveryGroupSubmitPayload`
  (`recoveryGroupsSchema.ts:39-48`). That interface is the JSON body **and** the
  user-visible preview rendered by
  `RecoveryGroupsTable.tsx:67` (`JSON.stringify(toRecoveryGroupJson(group), null, 2)`).
  Adding them there would both violate the body contract and leak query params into
  the preview modal.
- `toRecoveryGroupSubmitPayload` (`mapRecoveryGroups.ts:105-124`) and
  `toRecoveryGroupJson` (`:126-142`) are left unchanged.
- The query string is built in `submitRecoveryGroup`
  (`recoveryGroupsApi.ts:51-66`), mirroring
  `recoveryApplicationsApi.ts:34-44` and the local `deleteRecoveryGroup` precedent
  (`recoveryGroupsApi.ts:80-81`).

### AD-4: New draft fields are REQUIRED, not optional

`orchestrationProviderId: string | null` and `pushToOrchestrator: boolean | null`
are declared **without** `?`, matching `providerId: string | null` /
`policySetId: string | null` (`recoveryGroupTypes.ts:66-67`). This makes `tsc -b`
the safety net that catches every draft construction site — the alternative
(optional) would let the builder's edit initializer silently drop them.

**`exactOptionalPropertyTypes` convention (`tsconfig.app.json:17`,
`tsconfig.node.json:12`):** every *optional* field in this feature is written
`foo?: T | undefined` (e.g. `order?: number | undefined` in
`RecoveryGroupVmMetadata`, `vmMetadataByName?: Record<…> | undefined`). Any new
optional field added anywhere in this plan **must** repeat `| undefined`, or
assignment sites (the `updateDraft` spread, mapper returns) fail typecheck even
though the declaration compiles. The two new draft fields avoid the issue entirely
by being required with `| null`.

### AD-5: The step is APPENDED after Policy Set, and every hardcoded step index becomes a named constant

`Create`/`Save` renders only when `step === lastStep`
(`RecoveryGroupBuilder.tsx:346-357`), so a step that gates Create must be last.
Today: `lastStep = hasRelatedStorageStep ? 6 : 5`, `relatedStorageStepIndex = 5`
(`:107-108`), plus bare literals `step === 4` at `:192` and `:261`, and
`step === lastStep` for Policy Set at `:327`.

New index block replacing `:106-108`:

```ts
const hasRelatedStorageStep = draft.resourceType === 'vm'
const resourcesStepIndex = 4
const relatedStorageStepIndex = 5
const policySetStepIndex = hasRelatedStorageStep ? 6 : 5
const orchestrationStepIndex = hasRelatedStorageStep ? 7 : 6
const lastStep = orchestrationStepIndex
```

Because the step is appended (not inserted), the related-volume discovery gating at
`:109-120` keeps working unchanged.

### AD-6: The step is presentational; the builder owns `usePlatformProviders()`

Mirrors the `AppMetadataForm` / `RecoveryAppBuilder` split
(`AppMetadataForm.tsx:17-20` props vs `RecoveryAppBuilder.tsx:92, 289-292` hook
ownership) and every existing recovery-groups step. The builder passes an
**already-filtered** list (`type === 'AIRFLOW' && credentialStatus === 'ok'`), since
it needs the same filtered list for `orchestrationValid`. The
`selectedPlatformIsMissing` synthetic-option trick
(`AppMetadataForm.tsx:44-46, 145-147`) is deliberately **not** copied: there is no
stored provider id to fall back to (AD-1).

### AD-7: Use the existing `platformProviders.*` i18n keys, not the broken `providers.platform.*` ones

`AppMetadataForm.tsx:143` and `:156` reference `providers.platform.loading` /
`providers.platform.loadFailed`, which exist in **no** locale file (verified:
`grep -rn "providers\.platform" src/locales/` → 0 hits), so that UI renders raw key
strings via `useTranslation.ts:8` (`translations[key] ?? key`). The new step uses
its own `pages.recoveryGroupBuilder.orchestration.*` keys. Fixing
`AppMetadataForm.tsx` is **out of scope** (CLAUDE.md §3) — flagged in Open
Question 3.

### AD-8: `Field` + `Select` dropdown, but recovery-groups loading/error/empty conventions

The goal asks for a dropdown, so use `Field` + `Select` from
`@/shared/components/form/FormControls` (`FormControls.tsx:41-48, 76-85`) rather
than the `SelectableCard` grid used by the four sibling steps. Loading, error and
empty states follow the **recovery-groups** conventions, not `AppMetadataForm`'s red
`<p>`:

- loading → disabled `Select` + placeholder option text
- error → `FetchErrorAlert title retryLabel onRetry variant="full"` inside
  `mt-4 max-w-4xl` (`RecoveryGroupTypeStep.tsx:88-96`)
- empty → `EmptyState title description` inside `mt-5 max-w-4xl`
  (`RecoveryGroupProviderStep.tsx:51-57`)

---

## Task List

### Task 1: Add the two orchestration fields to `RecoveryGroupDraft`

**Description:** Declare the draft fields and update every construction site so the
tree still typechecks. No behaviour change yet.

- `recoveryGroupTypes.ts` — in `RecoveryGroupDraft` (lines 59-72), after
  `policySetId: string | null` (line 67), add:
  ```ts
  orchestrationProviderId: string | null
  pushToOrchestrator: boolean | null
  ```
  Required, `| null`, no `?` (AD-4). Do **not** touch `RecoveryGroup`
  (lines 48-57) — `airflowRunId` / `pushToOrchestrator` are already there.
- `RecoveryGroupBuilder.tsx` — `INITIAL_DRAFT` (lines 28-40): add
  `orchestrationProviderId: null,` and `pushToOrchestrator: null,`. Edit
  initializer (lines 55-70): add `orchestrationProviderId: null,` (not restorable,
  AD-1) and `pushToOrchestrator: initialData.pushToOrchestrator ?? null,`.
- `recoveryGroupsApi.test.ts` — add `orchestrationProviderId: 'airflow-01'` and
  `pushToOrchestrator: false` to the five draft literals at lines **202-214**,
  **234-246**, **264-276**, **289-301**, **307-319**.
- `useRecoveryGroups.test.tsx` — add both fields to the `create({…})` literal at
  lines **110-120** (typecheck only; the api module is mocked).
- `RecoveryGroupEditorPage.test.tsx` — add both fields to the `onCreate({…})`
  literal at lines **57-67** inside the `RecoveryGroupBuilder` mock.

**Files:**
- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups.test.tsx`
- `src/features/recovery-plans/recovery-groups/pages/RecoveryGroupEditorPage.test.tsx`

**Acceptance criteria:**
- [ ] `RecoveryGroupDraft` has `orchestrationProviderId: string | null` and `pushToOrchestrator: boolean | null`, both non-optional.
- [ ] `RecoveryGroup` (lines 48-57) is unchanged.
- [ ] `INITIAL_DRAFT` sets both to `null`.
- [ ] The edit initializer sets `pushToOrchestrator: initialData.pushToOrchestrator ?? null` and `orchestrationProviderId: null`.
- [ ] `npx tsc -b` reports zero errors.
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups` still passes 72 tests.

**Dependencies:** None

**Estimated scope:** M (5 files, additive)

---

### Task 2: Narrow both fields in validation and carry them onto the optimistic group

**Description:** Collapse the nullables in `validateRecoveryGroupDraft`, reject
unanswered/blank values with the existing `invalid_draft` code, and surface
`pushToOrchestrator` on the object returned by `toRecoveryGroup`.

- `recoveryGroupsValidation.ts`:
  - `ValidatedRecoveryGroupDraft` (lines 27-38): add
    `orchestrationProviderId: string` and `pushToOrchestrator: boolean` (both
    narrowed, non-optional).
  - Normalization (after line 44): add
    `const orchestrationProviderId = draft.orchestrationProviderId?.trim() ?? ''`.
  - Guard (lines 57-72): add `|| !orchestrationProviderId` and
    `|| draft.pushToOrchestrator === null` to the single `if (…)`. Reuse the
    existing `RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')`
    — **no new `RecoveryGroupsErrorCode`** (`recoveryGroupsErrors.ts` untouched).
  - Return object (lines 74-85): add `orchestrationProviderId,` and
    `pushToOrchestrator: draft.pushToOrchestrator,`.
- `mapRecoveryGroups.ts` — `toRecoveryGroup` return (lines 150-163): add
  `pushToOrchestrator: draft.pushToOrchestrator,` and `airflowRunId: null,`
  (the POST response body is never parsed, so no run id is knowable at create
  time; `useRecoveryGroups.ts:30, 36` invalidate the list and the real value
  arrives on refetch). Leave `toRecoveryGroupSubmitPayload` (105-124) and
  `toRecoveryGroupJson` (126-142) untouched (AD-3).
- `mapRecoveryGroups.test.ts` — the `validatedVmDraft: ValidatedRecoveryGroupDraft`
  literal at lines **31-48** must gain `orchestrationProviderId: 'airflow-01'` and
  `pushToOrchestrator: false`, or lines 52, 61-71 and 82 fail typecheck.
  Add one assertion that `toRecoveryGroup(validatedVmDraft, 'database_group')`
  returns `pushToOrchestrator: false` and `airflowRunId: null`.

**Files:**
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.ts`
- `src/features/recovery-plans/recovery-groups/helpers/mapRecoveryGroups.test.ts`

**Acceptance criteria:**
- [ ] A draft with `orchestrationProviderId: null` or `''` throws `RecoveryGroupsError` with `code: 'invalid_draft'`.
- [ ] A draft with `pushToOrchestrator: null` throws `RecoveryGroupsError` with `code: 'invalid_draft'`.
- [ ] `pushToOrchestrator: false` is accepted (it is a valid answer, distinct from `null`).
- [ ] `orchestrationProviderId` is trimmed before being returned.
- [ ] `RecoveryGroupsErrorCode` is unchanged.
- [ ] `toRecoveryGroupSubmitPayload` and `toRecoveryGroupJson` outputs are byte-identical to before (existing tests at `mapRecoveryGroups.test.ts:50-90` pass untouched).
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups/helpers` passes.

**Dependencies:** Task 1

**Estimated scope:** S (3 files)

---

### Task 3: Send `provider_id` and `push_to_orchestrator` as query params on submit

**Description:** Build the query string in `submitRecoveryGroup` and update the one
URL assertion that breaks.

- `recoveryGroupsApi.ts` — `submitRecoveryGroup` (lines 51-66). Replace the bare
  endpoint at line 59 with:
  ```ts
  const params = new URLSearchParams({
    provider_id: validated.orchestrationProviderId,
    push_to_orchestrator: String(validated.pushToOrchestrator),
  })
  const response = await apiFetch(`${API_ENDPOINTS.recoveryGroups.submit}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRecoveryGroupSubmitPayload(validated, id)),
  })
  ```
  The JSON body stays exactly as-is. No extra empty-string guard: Task 2's
  validation already guarantees a non-empty trimmed id (unlike
  `recoveryApplicationsApi.ts:35-38`, which has no upstream validator).
  `API_ENDPOINTS.recoveryGroups.submit` is `'/api/submit_recovery_group'`
  (`src/config/apiEndpoints.ts:42`).
- `recoveryGroupsApi.test.ts` — **breaking assertion:** line **217**
  `expect(url).toBe('/api/submit_recovery_group')` (runs twice via the `it.each` at
  lines 192-195) must become
  `expect(url).toBe('/api/submit_recovery_group?provider_id=airflow-01&push_to_orchestrator=false')`.
  Lines 248 and 278 destructure `[, init]` and ignore the URL — they survive.
  Add two new cases:
  1. `push_to_orchestrator: true` on the draft produces
     `…&push_to_orchestrator=true` in the URL.
  2. A draft with `orchestrationProviderId: null` rejects with
     `{ code: 'invalid_draft' }` and `fetch` is never called.

**Files:**
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Acceptance criteria:**
- [ ] `POST` URL is `/api/submit_recovery_group?provider_id=<id>&push_to_orchestrator=<true|false>`.
- [ ] The JSON body still contains exactly `id, name, description, provider_id_vm, provider_id_volume, policy_set_id, vms, volumes` — the existing body assertions at lines 219-228 and 249-258 pass unchanged.
- [ ] `deleteRecoveryGroup`'s URL assertion at line **330** is unchanged and still passes.
- [ ] The 500-status test at lines **305-320** still reaches `fetch` and still throws `'Submit recovery group request failed with status 500'` (it needs the Task 1 draft fields to get past validation).
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups/api` passes.

**Dependencies:** Tasks 1, 2

**Estimated scope:** S (2 files)

---

### Task 4: Add the Orchestration i18n keys to all three locales

**Description:** Add flat dot-separated keys (`useTranslation.ts:4-11` resolves
`translations[key] ?? key`; no nesting, no interpolation helper). Tests resolve
real English strings through `src/test-utils/mockUseTranslation.ts`, so these
strings become the test selectors and must land before Tasks 5 and 7.

`src/locales/en.json` — insert the step label after line **364**
(`pages.recoveryGroupBuilder.steps.policySet`) and the panel block after line
**451** (`pages.recoveryGroupBuilder.policySet.policiesCount`):

```json
"pages.recoveryGroupBuilder.steps.orchestration": "Orchestration",
"pages.recoveryGroupBuilder.orchestration.title": "Orchestration",
"pages.recoveryGroupBuilder.orchestration.description": "Choose whether this recovery group is pushed to the orchestrator, and select the Airflow platform provider that will run it.",
"pages.recoveryGroupBuilder.orchestration.deployLabel": "Deploy to orchestrator",
"pages.recoveryGroupBuilder.orchestration.deployHint": "When enabled, saving this recovery group triggers an Airflow DAG run.",
"pages.recoveryGroupBuilder.orchestration.deployUnanswered": "Not selected",
"pages.recoveryGroupBuilder.orchestration.deployOn": "Yes",
"pages.recoveryGroupBuilder.orchestration.deployOff": "No",
"pages.recoveryGroupBuilder.orchestration.providerLabel": "Airflow platform provider *",
"pages.recoveryGroupBuilder.orchestration.providerPlaceholder": "Select platform provider",
"pages.recoveryGroupBuilder.orchestration.loading": "Loading platform providers",
"pages.recoveryGroupBuilder.orchestration.loadError": "Platform providers could not be loaded.",
"pages.recoveryGroupBuilder.orchestration.empty.title": "No platform provider available",
"pages.recoveryGroupBuilder.orchestration.empty.description": "Configure an Airflow platform provider with valid credentials before creating a recovery group.",
"pages.recoveryGroupBuilder.orchestration.notRestorable": "The orchestration provider is not stored on the recovery group, so it must be selected again for every edit."
```

`src/locales/cs.json` — same keys, after line **364** and line **451**:

```json
"pages.recoveryGroupBuilder.steps.orchestration": "Orchestrace",
"pages.recoveryGroupBuilder.orchestration.title": "Orchestrace",
"pages.recoveryGroupBuilder.orchestration.description": "Zvolte, zda se má tato skupina obnovy odeslat do orchestrátoru, a vyberte platformního poskytovatele Airflow, který ji spustí.",
"pages.recoveryGroupBuilder.orchestration.deployLabel": "Odeslat do orchestrátoru",
"pages.recoveryGroupBuilder.orchestration.deployHint": "Je-li zapnuto, uložení této skupiny obnovy spustí běh DAG v Airflow.",
"pages.recoveryGroupBuilder.orchestration.deployUnanswered": "Nevybráno",
"pages.recoveryGroupBuilder.orchestration.deployOn": "Ano",
"pages.recoveryGroupBuilder.orchestration.deployOff": "Ne",
"pages.recoveryGroupBuilder.orchestration.providerLabel": "Platformní poskytovatel Airflow *",
"pages.recoveryGroupBuilder.orchestration.providerPlaceholder": "Vyberte platformního poskytovatele",
"pages.recoveryGroupBuilder.orchestration.loading": "Načítání platformních poskytovatelů",
"pages.recoveryGroupBuilder.orchestration.loadError": "Platformní poskytovatele nelze načíst.",
"pages.recoveryGroupBuilder.orchestration.empty.title": "Není dostupný žádný platformní poskytovatel",
"pages.recoveryGroupBuilder.orchestration.empty.description": "Před vytvořením skupiny obnovy nastavte platformního poskytovatele Airflow s platnými přihlašovacími údaji.",
"pages.recoveryGroupBuilder.orchestration.notRestorable": "Orchestrační poskytovatel se u skupiny obnovy neukládá, proto je nutné jej při každé úpravě vybrat znovu."
```

`src/locales/sk.json` — same keys, after line **344**
(`pages.recoveryGroupBuilder.steps.policySet`) and line **431**
(`pages.recoveryGroupBuilder.policySet.policiesCount`) — sk line numbers are offset
from en/cs, so match by key, not position:

```json
"pages.recoveryGroupBuilder.steps.orchestration": "Orchestrácia",
"pages.recoveryGroupBuilder.orchestration.title": "Orchestrácia",
"pages.recoveryGroupBuilder.orchestration.description": "Zvoľte, či sa má táto skupina obnovy odoslať do orchestrátora, a vyberte platformového poskytovateľa Airflow, ktorý ju spustí.",
"pages.recoveryGroupBuilder.orchestration.deployLabel": "Odoslať do orchestrátora",
"pages.recoveryGroupBuilder.orchestration.deployHint": "Ak je zapnuté, uloženie tejto skupiny obnovy spustí beh DAG v Airflow.",
"pages.recoveryGroupBuilder.orchestration.deployUnanswered": "Nevybrané",
"pages.recoveryGroupBuilder.orchestration.deployOn": "Áno",
"pages.recoveryGroupBuilder.orchestration.deployOff": "Nie",
"pages.recoveryGroupBuilder.orchestration.providerLabel": "Platformový poskytovateľ Airflow *",
"pages.recoveryGroupBuilder.orchestration.providerPlaceholder": "Vyberte platformového poskytovateľa",
"pages.recoveryGroupBuilder.orchestration.loading": "Načítavanie platformových poskytovateľov",
"pages.recoveryGroupBuilder.orchestration.loadError": "Platformových poskytovateľov nie je možné načítať.",
"pages.recoveryGroupBuilder.orchestration.empty.title": "Nie je dostupný žiadny platformový poskytovateľ",
"pages.recoveryGroupBuilder.orchestration.empty.description": "Pred vytvorením skupiny obnovy nastavte platformového poskytovateľa Airflow s platnými prihlasovacími údajmi.",
"pages.recoveryGroupBuilder.orchestration.notRestorable": "Orchestračný poskytovateľ sa v skupine obnovy neukladá, preto ho treba pri každej úprave vybrať znova."
```

**Files:**
- `src/locales/en.json`
- `src/locales/cs.json`
- `src/locales/sk.json`

**Acceptance criteria:**
- [ ] All 15 keys exist in en.json, cs.json and sk.json with identical key names.
- [ ] No key uses the broken `providers.platform.*` namespace (AD-7).
- [ ] `grep -c "recoveryGroupBuilder.orchestration" src/locales/en.json src/locales/cs.json src/locales/sk.json` returns 14 for each (plus 1 `steps.orchestration`).
- [ ] All three files remain valid JSON (`node -e "require('./src/locales/cs.json')"` etc.).

**Dependencies:** None (do before Tasks 5 and 7)

**Estimated scope:** S (3 files)

---

### Task 5: Create the presentational `RecoveryGroupOrchestrationStep` component

**Description:** New step body — no data fetching, per the four sibling steps.

`src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.tsx`

Props:
```ts
interface RecoveryGroupOrchestrationStepProps {
  platformProviders: PlatformProviderRecord[]   // already filtered by the builder
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  pushToOrchestrator: boolean | null
  selectedProviderId: string | null
  onPushToOrchestratorChange: (value: boolean) => void
  onProviderSelect: (providerId: string) => void
}
```

Markup:
- Header identical to the siblings:
  `<h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.orchestration.title')}</h2>`
  then `<p className="mt-1 text-sm text-text-muted">{t('…orchestration.description')}</p>`
  (`RecoveryGroupPolicySetStep.tsx:24-25`).
- Toggle row (`mt-5 max-w-4xl`): a visible `<span>` with
  `t('…orchestration.deployLabel')`, the answer text
  (`pushToOrchestrator === null ? t('…deployUnanswered') : pushToOrchestrator ? t('…deployOn') : t('…deployOff')`),
  `t('…orchestration.deployHint')` as helper text, and
  ```tsx
  <Toggle
    checked={pushToOrchestrator === true}
    onChange={onPushToOrchestratorChange}
    label={t('pages.recoveryGroupBuilder.orchestration.deployLabel')}
  />
  ```
  imported from `@/shared/components/toggle/Toggle` (no barrel exists;
  `Toggle` takes no `id` prop — it generates its own via `useId` at
  `Toggle.tsx:13, 17` — so `label` supplies the accessible name and the visible
  `<span>` is separate).
- Provider picker (`mt-5 max-w-4xl`), `Field` + `Select` from
  `@/shared/components/form/FormControls`:
  ```tsx
  <Field label={t('…orchestration.providerLabel')} htmlFor="recovery-group-orchestration-provider">
    <Select
      id="recovery-group-orchestration-provider"
      value={selectedProviderId ?? ''}
      onChange={e => { onProviderSelect(e.target.value) }}
      disabled={isLoading || error !== null}
      required
    >
      <option value="">
        {isLoading
          ? t('pages.recoveryGroupBuilder.orchestration.loading')
          : t('pages.recoveryGroupBuilder.orchestration.providerPlaceholder')}
      </option>
      {platformProviders.map(provider => (
        <option key={provider.id} value={provider.id}>{provider.name} - {provider.type}</option>
      ))}
    </Select>
  </Field>
  ```
  (option label format `{name} - {type}` matches `AppMetadataForm.tsx:150`).
- Error branch instead of the Select: `<div className="mt-4 max-w-4xl">` +
  `<FetchErrorAlert title={t('…orchestration.loadError')} retryLabel={t('buttons.retry')} onRetry={onRetry} variant="full" />`
  (`RecoveryGroupTypeStep.tsx:88-96`).
- Empty branch (`!isLoading && !error && platformProviders.length === 0`):
  `<div className="mt-5 max-w-4xl">` + `<EmptyState title={t('…orchestration.empty.title')} description={t('…orchestration.empty.description')} />`
  (`RecoveryGroupProviderStep.tsx:51-57`).
- A `<p className="mt-2 text-xs text-text-muted">{t('…orchestration.notRestorable')}</p>`
  under the picker, so the edit-flow cost of AD-1 is visible in the UI.

`src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx`
(every other step component has a colocated test). Use
`vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))`
— the recovery-groups convention (`RecoveryGroupBuilder.test.tsx:8`) — not the
`LanguageProvider` wrapper that `AppMetadataForm.test.tsx` uses. Provider fixture
shape from `platformProviderTypes.ts:12-25`:
`{ id: 'airflow-01', name: 'Primary Airflow', description: '…', type: 'AIRFLOW', ipAddress: '10.99.99.60', port: 8080, dagDir: '/opt/airflow/dags', credentialId: 'airflow-admin', credentialStatus: 'ok' }`.

**Files:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.tsx` (new)
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx` (new)

**Acceptance criteria:**
- [ ] `getByRole('switch', { name: 'Deploy to orchestrator' })` exists and has `aria-checked="false"` when `pushToOrchestrator` is `null`, `"true"` when `true`.
- [ ] Clicking the switch calls `onPushToOrchestratorChange(true)` when `pushToOrchestrator` is `null`.
- [ ] `getByText('Not selected')` renders when `pushToOrchestrator` is `null`; `getByText('No')` when `false`; `getByText('Yes')` when `true`.
- [ ] `getByLabelText('Airflow platform provider *')` is a `<select>`; `findByRole('option', { name: 'Primary Airflow - AIRFLOW' })` resolves.
- [ ] Selecting an option calls `onProviderSelect('airflow-01')`.
- [ ] `isLoading` renders the `Select` disabled with placeholder text `'Loading platform providers'`.
- [ ] `error !== null` renders `getByText('Platform providers could not be loaded.')` and a retry control that calls `onRetry`.
- [ ] `platformProviders: []` renders `getByText('No platform provider available')`.
- [ ] The component contains no `usePlatformProviders` / `useQuery` call.
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupOrchestrationStep.test.tsx` passes.

**Dependencies:** Task 4

**Estimated scope:** S (2 new files)

---

### Task 6: Wire the step into the wizard and renumber every step index

**Description:** All changes in `RecoveryGroupBuilder.tsx`.

1. Imports: add `usePlatformProviders` from
   `@/features/platform-administration/platform-providers/hooks/usePlatformProviders`
   and `RecoveryGroupOrchestrationStep` from `./RecoveryGroupOrchestrationStep`.
2. After line 104 (`const policySets = policySetQuery.data ?? []`):
   ```ts
   const platformProvidersQuery = usePlatformProviders()
   const eligiblePlatformProviders = (platformProvidersQuery.data ?? []).filter(
     provider => provider.type === 'AIRFLOW' && provider.credentialStatus === 'ok',
   )
   const orchestrationValid = Boolean(
     draft.pushToOrchestrator !== null
     && draft.orchestrationProviderId
     && eligiblePlatformProviders.some(provider => provider.id === draft.orchestrationProviderId),
   )
   ```
   (mirrors `providerValid` at lines 94-102.)
3. Replace lines **106-108** with the named-index block from AD-5
   (`resourcesStepIndex`, `relatedStorageStepIndex`, `policySetStepIndex`,
   `orchestrationStepIndex`, `lastStep`). Leave lines 109-120 (discovery gating)
   untouched.
4. Auto-select the sole eligible provider, using **`setDraft` directly (not
   `updateDraft`)** so the form is not marked dirty — the same technique as
   `handleMetadataAvailable` at lines 75-80, and the same render-phase-setState
   shape as the discovery block at lines 123-133. Note
   `noUncheckedIndexedAccess: true` (`tsconfig.app.json:16`), so index with `?.`:
   ```ts
   const soleEligibleProviderId = eligiblePlatformProviders.length === 1
     ? (eligiblePlatformProviders[0]?.id ?? null)
     : null
   if (soleEligibleProviderId && draft.orchestrationProviderId === null) {
     setDraft(current => ({ ...current, orchestrationProviderId: soleEligibleProviderId }))
   }
   ```
5. `steps` array (lines 134-157): append **after** the `policy-set` entry
   (lines 152-156) — array order is the step number
   (`WizardSteps.tsx:28, 42`), and the `related-storage` entry is a conditional
   spread, so appending after policy-set is the only placement that keeps both the
   5-step and 6-step numberings correct:
   ```ts
   {
     id: 'orchestration',
     label: t('pages.recoveryGroupBuilder.steps.orchestration'),
     disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0 || !policySetValid,
   },
   ```
6. `canContinue` (lines 159-165): insert a `policySetValid` branch before the
   fallback. Without this, Policy Set stops being the last step and its new `Next`
   button would be enabled by `draft.resources.length > 0` alone:
   ```ts
   const canContinue = step === 1
     ? detailsValid
     : step === 2
       ? typeValid
       : step === 3
         ? providerValid
         : step === policySetStepIndex
           ? policySetValid
           : draft.resources.length > 0
   ```
7. `canCreate` (lines 166-177): append `&& orchestrationValid`.
8. Line **192**: `step === 4` → `step === resourcesStepIndex` (behaviour-preserving;
   `RecoveryGroupResourcesStep`'s root is `grid h-full min-h-0`, so it needs
   `overflow-hidden`).
9. Line **261**: `{step === 4 ? (` → `{step === resourcesStepIndex ? (`.
10. Line **327**: `{step === lastStep ? (` → `{step === policySetStepIndex ? (`.
    Skipping this makes the Policy Set panel disappear.
11. After line **334**, add the new render block:
    ```tsx
    {step === orchestrationStepIndex ? (
      <RecoveryGroupOrchestrationStep
        platformProviders={eligiblePlatformProviders}
        isLoading={platformProvidersQuery.isLoading}
        error={platformProvidersQuery.error instanceof Error ? platformProvidersQuery.error : null}
        onRetry={() => { void platformProvidersQuery.refetch() }}
        pushToOrchestrator={draft.pushToOrchestrator}
        selectedProviderId={draft.orchestrationProviderId}
        onPushToOrchestratorChange={value => { updateDraft({ pushToOrchestrator: value }) }}
        onProviderSelect={providerId => { updateDraft({ orchestrationProviderId: providerId }) }}
      />
    ) : null}
    ```
    (`.error instanceof Error ? … : null` matches lines 210 and
    `RecoveryAppBuilder.tsx:291`.)

**Files:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`

**Acceptance criteria:**
- [ ] Zero bare integer step comparisons remain except `step === 1`, `step === 2`, `step === 3` and `resourcesStepIndex = 4` / `relatedStorageStepIndex = 5` declarations.
- [ ] VM groups show 7 sidebar steps; volume groups show 6; `Orchestration` is last in both.
- [ ] `Next` on the Policy Set step is disabled until a policy set is selected.
- [ ] `Create Recovery Group` / `Save Recovery Group` renders only on the Orchestration step and is disabled until `pushToOrchestrator !== null` **and** a provider matching an eligible AIRFLOW record is selected.
- [ ] The related-volume discovery hook still fires only on `relatedStorageStepIndex` (5) for VM groups.
- [ ] The resources step still gets `overflow-hidden`; every other step gets `overflow-y-auto`.
- [ ] Auto-selecting the sole eligible provider does **not** call `onDirtyChange`.
- [ ] `npx tsc -b` and `npm run lint` pass.

**Dependencies:** Tasks 1, 4, 5

**Estimated scope:** S (1 file, ~11 edits)

---

### Task 7: Update `RecoveryGroupBuilder.test.tsx` for the new final step

**Description:** This file has the largest blast radius. It renders **without** a
`QueryClientProvider` and `src/test-utils/setup.ts` adds none, so the new
`usePlatformProviders()` call would throw `No QueryClient set` in **all 9** tests
until mocked.

Required changes, all in
`src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`:

1. Add after the `usePolicySets` mock (line 76), copying the shape of
   `RecoveryAppBuilder.test.tsx:46-47`:
   ```ts
   vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
     usePlatformProviders: () => ({
       data: [{
         id: 'airflow-01', name: 'Primary Airflow', description: 'Primary orchestrator',
         type: 'AIRFLOW', ipAddress: '10.99.99.60', port: 8080,
         dagDir: '/opt/airflow/dags', credentialId: 'airflow-admin', credentialStatus: 'ok',
       }],
       isLoading: false, error: null, refetch: vi.fn(),
     }),
   }))
   ```
   With a single eligible provider, the Task 6 auto-select fills the dropdown, so
   each flow only needs to answer the toggle.
2. **Line 124** — extend the step-inventory test with
   `expect(screen.getByRole('button', { name: 'Orchestration' })).toBeInTheDocument()`.
   (This test currently passes while silently not covering the new step.)
3. **Line 147** (`allows a virtual-machine group to be created without optional related storage`)
   — `user.click(getByRole('button', { name: 'Create Recovery Group' }))` now finds
   a `Next` button instead. Insert before it:
   ```ts
   await user.click(screen.getByRole('button', { name: 'Orchestration' }))
   await user.click(screen.getByRole('switch', { name: 'Deploy to orchestrator' }))
   ```
   and extend the `objectContaining` at lines 149-153 with
   `orchestrationProviderId: 'airflow-01', pushToOrchestrator: true`.
4. **Line 179** (`auto-populates related storage discovered for the selected virtual machines`) — same two inserted clicks; extend lines 181-185.
5. **Line 212** (`lets the user add FlashSystem volumes beyond what was auto-discovered`) — same; extend lines 214-218.
6. **Line 238** (`keeps a FlashSystem volume group on the five-step flow`) —
   `expect(getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()`
   breaks. Add the Orchestration navigation + switch click first. Also **rename the
   test at line 221** — a FlashSystem volume group is now a **six**-step flow.
7. **Line 266** (`can clear the optional FlashSystem mapping before saving`) — same; extend lines 268-272.
8. Add two new tests:
   - `Create Recovery Group` is **disabled** on the Orchestration step while
     `pushToOrchestrator` is unanswered, and becomes enabled after the switch is
     clicked.
   - Edit-flow regression guard: with
     `initialData={{ ...existingGroup, pushToOrchestrator: true }}`, the switch
     starts `aria-checked="true"` (restorable, AD-1) while the provider dropdown
     value comes only from auto-select, never from `initialData`.

**Files:**
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`

**Acceptance criteria:**
- [ ] A `usePlatformProviders` mock exists; no test throws `No QueryClient set`.
- [ ] All 9 pre-existing tests pass, with the 5 submit-button flows (lines 147, 179, 212, 238, 266) driving through the Orchestration step.
- [ ] The step-inventory test asserts 6 step buttons including `Orchestration`.
- [ ] The test title at line 221 no longer says "five-step".
- [ ] Both new tests pass.
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx` passes.

**Dependencies:** Tasks 4, 5, 6

**Estimated scope:** S (1 file)

---

### Checkpoint: Full Verification

Run in order; each must pass before the next.

- [ ] `npx tsc -b` — zero errors. Confirms every `RecoveryGroupDraft` /
      `ValidatedRecoveryGroupDraft` literal in production and test code carries the
      new required fields, and that no new optional field violates
      `exactOptionalPropertyTypes` (`foo?: T | undefined`).
- [ ] `npm run lint` — zero warnings (`eslint . --max-warnings 0`).
- [ ] `npx vitest run src/features/recovery-plans/recovery-groups` — all previously
      passing tests still pass (baseline was **14 files / 72 tests**), plus the new
      `RecoveryGroupOrchestrationStep.test.tsx` file and the new cases in
      `recoveryGroupsApi.test.ts`, `mapRecoveryGroups.test.ts` and
      `RecoveryGroupBuilder.test.tsx`.
- [ ] `npm run test` — full suite; specifically confirms
      `src/features/recovery-plans/recovery-applications/api/recoveryApplicationsApi.test.ts`
      (lines 252, 268 assert `&is_final=`) is untouched, and
      `RecoveryGroupsTable.test.tsx:135-138` still asserts the same JSON-preview
      payload keys (proof that `provider_id` / `push_to_orchestrator` did not leak
      into `RecoveryGroupSubmitPayload`).
- [ ] `npm run build` — `lint && typecheck && test && vite build`.
- [ ] `git diff --stat` — the changed set is exactly: `recoveryGroupTypes.ts`,
      `recoveryGroupsValidation.ts`, `recoveryGroupsApi.ts`, `mapRecoveryGroups.ts`,
      `RecoveryGroupBuilder.tsx`, `RecoveryGroupOrchestrationStep.tsx` (new),
      `RecoveryGroupOrchestrationStep.test.tsx` (new), `RecoveryGroupBuilder.test.tsx`,
      `recoveryGroupsApi.test.ts`, `mapRecoveryGroups.test.ts`,
      `useRecoveryGroups.test.tsx`, `RecoveryGroupEditorPage.test.tsx`,
      `en.json`, `cs.json`, `sk.json`. Plus the already-modified
      `recoveryGroupsSchema.ts` from the landed read-path work. **No changes to**
      `AppMetadataForm.tsx`, `recoveryApplicationsApi.ts`, `useRecoveryGroups.ts`,
      `RecoveryGroupBuilderPage.tsx`, `RecoveryGroupEditorPage.tsx`,
      `RecoveryGroupsTable.tsx`, `recoveryGroupsErrors.ts`, `apiEndpoints.ts`.
- [ ] Manual check in the running app: create a VM group end-to-end and confirm the
      network tab shows
      `POST /api/submit_recovery_group?provider_id=airflow-01&push_to_orchestrator=true`
      with a body containing only the eight `RecoveryGroupSubmitPayload` keys.
- [ ] Manual check: open an existing group for edit, confirm the toggle reflects the
      stored `push_to_orchestrator`, and confirm `Save Recovery Group` is reachable
      (auto-selected provider) rather than permanently disabled.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Edit flow cannot restore the orchestration provider — `airflow_run_id` is a DAG run id, not a provider id, and there is no per-group GET (`RecoveryGroupEditorPage.tsx:30` picks the group out of the list query), so `Save` would be permanently disabled | High | AD-1 + AD-4: auto-select the sole eligible AIRFLOW provider via `setDraft` (no dirty flag); surface `orchestration.notRestorable` copy in the step; new edit-flow test in Task 7 item 8 |
| Someone reverse-maps `airflow_run_id` onto `provider_id` because both look like ids | High | `airflowRunId` is never written to a draft and never read by `submitRecoveryGroup`; the comment at `recoveryGroupTypes.ts:53-55` and the "read-only" wording in AD-1 stay in place |
| Adding `provider_id` / `push_to_orchestrator` to `RecoveryGroupSubmitPayload` ships them in the POST body **and** leaks them into the user-visible JSON preview (`RecoveryGroupsTable.tsx:67`) | High | AD-3: `recoveryGroupsSchema.ts:39-48` untouched; verification asserts `RecoveryGroupsTable.test.tsx:135-138` still passes |
| Missing `usePlatformProviders` mock makes all 9 `RecoveryGroupBuilder.test.tsx` tests fail with an opaque `No QueryClient set` (no `QueryClientProvider` wrapper; `setup.ts` adds none) | High | Task 7 item 1 adds the mock as the first edit in that file |
| Forgetting line **327** (`step === lastStep` → `step === policySetStepIndex`) makes the Policy Set panel silently vanish and Orchestration render in its place | High | Task 6 item 10 names the line; acceptance criterion checks both panels render |
| Silent index breakage: `step === 4` at lines **192** and **261** and `relatedStorageStepIndex = 5` are magic numbers; inserting rather than appending would break the resources `h-full` container and fire related-volume discovery on the wrong step, with no compile error | High | AD-5 appends the step and converts every literal to a named constant; Task 6 items 3, 8, 9 |
| Policy Set's `Next` becomes enabled with no policy set selected — `canContinue` (lines 159-165) falls through to `draft.resources.length > 0` for every step ≥ 4, and Policy Set was shielded only by being last | Medium | Task 6 item 6 adds the explicit `step === policySetStepIndex ? policySetValid` branch |
| A plain `boolean` toggle defeats the "required" requirement — `push_to_orchestrator` defaults to `false` server-side, so "chose No" is indistinguishable from "unanswered" | Medium | AD-2: `boolean \| null` on the draft, `boolean` only in `ValidatedRecoveryGroupDraft`; validation rejects `null` |
| Making `airflow_run_id` / `push_to_orchestrator` **required** in `recoveryGroupApiSchema` would break GET *and* DELETE — `deleteRecoveryGroup` re-parses the same `recoveryGroupsResponseSchema` (`recoveryGroupsApi.ts:86`), and `databaseGroupPayload` (`recoveryGroupsApi.test.ts:41-50`) omits both | Medium | Already `.optional()` in the landed work (`recoveryGroupsSchema.ts:28-29`); this plan does not touch the schema |
| `exactOptionalPropertyTypes: true` — a bare `foo?: T` is not assignable from an explicit `undefined`, so an optional field written without `\| undefined` compiles at declaration but fails at the `updateDraft` spread and mapper returns | Medium | AD-4: new draft fields are required `\| null`; any optional field added elsewhere must be `foo?: T \| undefined` |
| Copying `AppMetadataForm`'s `providers.platform.loading` / `providers.platform.loadFailed` keys would render raw key strings — they exist in no locale file | Medium | AD-7: the step uses its own `pages.recoveryGroupBuilder.orchestration.*` keys added in Task 4 |
| `push_to_orchestrator=true` triggers a real Airflow run, but `submitRecoveryGroup` never parses the POST response (`recoveryGroupsApi.ts:64`), so a new `airflow_run_id` or orchestrator-side failure is invisible until refetch | Medium | `toRecoveryGroup` sets `airflowRunId: null` (honest); `useRecoveryGroups.ts:30, 36` invalidate the list so the real value arrives on the next GET |
| Missing cs/sk keys degrade silently to raw key strings — no locale-parity test exists | Low | Task 4 supplies all three files with concrete translations; acceptance criteria include per-file `grep -c` counts |
| `Toggle` has zero existing consumers in `src` and no test file — untested code | Low | Task 5's new test exercises `role="switch"`, `aria-checked` and the `aria-label` accessible name |
| Group vanishing from the list is blamed on the new step — `fetchRecoveryGroups` already filters out records whose data provider does not resolve (`recoveryGroupsApi.ts:47`) and `mapRecoveryGroupApiRecord` throws on an unknown VM provider (`mapRecoveryGroups.ts:59-63`) | Low | Pre-existing behaviour, orthogonal to platform providers; documented here so it is not misdiagnosed |
| Concurrent uncommitted work in the same tree (`git status --short` shows 5 modified recovery-groups files) | Low | Re-read `recoveryGroupsSchema.ts`, `recoveryGroupTypes.ts`, `mapRecoveryGroups.ts` and both modified test files immediately before editing; do not re-add the landed read-path fields |

---

## Open Questions

1. **Toggle vs. two `SelectableCard`s for the required tri-state answer.** The goal
   text says "toggle", and this plan implements `Toggle` with tri-state gating
   (AD-2). The cost: from the unanswered state, "Yes" takes one click but "No" takes
   two (on, then off). Every sibling step in this wizard uses a `SelectableCard`
   grid, which is naturally tri-state and would make both answers one click
   ("Deploy to orchestrator" / "Do not deploy"). Recommendation: keep `Toggle` as
   specified; switch to two `SelectableCard`s if the two-click "No" is judged
   unacceptable in review. Only `RecoveryGroupOrchestrationStep.tsx` and its test
   change either way.

2. **Should the AIRFLOW provider still be required when the toggle is off?** This
   plan says **yes** — `POST /submit_recovery_group` requires `provider_id`
   unconditionally per the stated contract, so the dropdown gates `Create` in both
   toggle states. If the backend accepts an omitted `provider_id` when
   `push_to_orchestrator=false`, `orchestrationValid` can be relaxed to
   `draft.pushToOrchestrator === false || (provider selected)` — a one-line change
   in `RecoveryGroupBuilder.tsx` plus the guard in `recoveryGroupsValidation.ts`.

3. **Out-of-scope defect worth a separate change:** `AppMetadataForm.tsx:143` and
   `:156` reference `providers.platform.loading` / `providers.platform.loadFailed`,
   which exist in no locale file, so the recovery-applications form renders literal
   key strings. The correct keys already exist as `platformProviders.loading` /
   `platformProviders.loadFailed` (`en.json:734-735`). Not fixed here per CLAUDE.md
   §3 (surgical changes).

4. **Out-of-scope naming inconsistency:** `submit_recovery_dag` still sends
   `is_final` (`recoveryApplicationsApi.ts:42`, asserted at
   `recoveryApplicationsApi.test.ts:252, 268`) while its response schema was already
   renamed to `push_to_orchestrator`
   (`recoveryApplicationsSchema.ts:37`). After this plan lands,
   `submit_recovery_group` will send `push_to_orchestrator` while its sibling
   endpoint sends `is_final`. Confirm with the backend owner whether
   `submit_recovery_dag`'s query param should also be renamed.