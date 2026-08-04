# Recovery Group Provider Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Recovery Group resource types derive from healthy connected providers, add a dedicated provider step, and load selectable resources only from the chosen provider.

**Architecture:** Keep `WizardSteps` generic and implement provider-aware behavior inside the Recovery Group feature. A feature-owned registry maps supported provider types to Recovery Group configuration and presentation metadata; `useProviders()` determines runtime availability, while a provider-scoped inventory hook normalizes VMware, IBM Power, and FlashSystem inventories into selectable resource names.

**Tech Stack:** React 19, TypeScript 6, TanStack Query 5, Zod 4, Vitest, Testing Library.

## Global Constraints

- Display a resource-type card only when at least one matching provider has `credentialStatus === "ok"`.
- `VMWARE` and `IBM_POWER` appear under **Compute workloads**; `FLASHCOPY` appears under **Storage systems**.
- Multiple providers of one type produce one resource-type card.
- A Recovery Group selects exactly one provider before resources are loaded.
- Changing resource type clears provider and resources; changing provider clears resources.
- Do not request inventory until both workload type and provider ID are selected.
- Preserve the existing shared `WizardSteps`; provider-specific logic stays feature-owned.
- Do not add dependencies.
- Do not create git commits; the user requested uncommitted changes for review.

---

## File Structure

**Create**

- `src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.ts` — supported provider/resource registry and runtime availability helpers.
- `src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.test.ts` — registry filtering and deduplication tests.
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.tsx` — provider selection UI.
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx` — provider-step behavior tests.
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts` — provider-scoped inventory dispatch and normalization.
- `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx` — fetcher dispatch tests.

**Modify**

- `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsLocalStorage.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupQueryKeys.ts`
- `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`
- `src/features/recovery-plans/recovery-groups/utils/recoveryGroupTypeLabels.ts`
- `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- `src/locales/en.json`
- `src/locales/sk.json`

---

### Task 1: Extend the Recovery Group domain model and provider/resource registry

**Files:**

- Create: `src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.ts`
- Create: `src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.test.ts`
- Modify: `src/features/recovery-plans/recovery-groups/model/recoveryGroupTypes.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsValidation.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsLocalStorage.ts`
- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.ts`
- Test: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`

**Interfaces:**

- Produces:
  - `RecoveryGroupWorkloadType = 'vmware_virtual_machines' | 'ibm_power_virtual_machines' | 'ibm_flashsystem'`
  - `RecoveryGroupDraft.providerId: string | null`
  - `RecoveryGroup.providerId: string | null`
  - `RECOVERY_GROUP_RESOURCE_OPTIONS: readonly RecoveryGroupResourceOption[]`
  - `getAvailableRecoveryGroupResourceOptions(providers: ProviderRecord[]): RecoveryGroupResourceOption[]`
  - `getRecoveryGroupResourceOption(workloadType): RecoveryGroupResourceOption | undefined`

- [ ] **Step 1: Write failing registry and persistence tests**

Add registry tests with these provider fixtures:

```ts
const provider = (
  id: string,
  type: ProviderType,
  credentialStatus: ProviderCredentialStatus = 'ok',
): ProviderRecord => ({
  id,
  name: id,
  description: '',
  type,
  ipAddress: '10.0.0.1',
  credentialId: credentialStatus === 'ok' ? 'credential-1' : null,
  credentialStatus,
})

it('derives one option per healthy supported provider type', () => {
  const options = getAvailableRecoveryGroupResourceOptions([
    provider('vmware-1', 'VMWARE'),
    provider('vmware-2', 'VMWARE'),
    provider('power-1', 'IBM_POWER'),
    provider('flash-1', 'FLASHCOPY', 'missing'),
  ])

  expect(options.map(option => option.workloadType)).toEqual([
    'vmware_virtual_machines',
    'ibm_power_virtual_machines',
  ])
})
```

Update API tests so every newly created draft contains `providerId`, assert it is persisted, add an IBM Power creation case, and add this legacy case:

```ts
it('keeps a stored group without provider ID readable as a draft', async () => {
  localStorage.setItem('abcm.recovery-groups', JSON.stringify([{
    id: 'legacy_group',
    name: 'Legacy group',
    description: 'Stored before provider selection',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    resources: ['VM-01'],
  }]))

  await expect(fetchRecoveryGroups()).resolves.toEqual([
    expect.objectContaining({ providerId: null, status: 'Draft' }),
  ])
})
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts
```

Expected: FAIL because the registry, IBM Power workload type, and `providerId` do not exist.

- [ ] **Step 3: Extend the types and add the registry**

Extend the resource configuration union:

```ts
export type RecoveryGroupResourceConfiguration =
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: 'vmware_virtual_machines'
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: 'ibm_power_virtual_machines'
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'storage_system'
      workloadType: 'ibm_flashsystem'
      resourceType: 'volume'
    }
```

Add `providerId: string | null` to `RecoveryGroupBase` and `RecoveryGroupDraft`. Add an IBM Power branch to `recoveryGroupConfigurationSchema`. Trim and validate provider ID in `validateRecoveryGroupDraft`:

```ts
const providerId = draft.providerId?.trim() ?? ''

if (!providerId || /* existing invalid conditions */) {
  throw new RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')
}

return {
  id: draft.id,
  name,
  description,
  providerId,
  resources,
  configuration: configuration.data,
}
```

Create the registry:

```ts
export interface RecoveryGroupResourceOption {
  providerType: ProviderType
  sourceCategory: RecoveryGroupSourceCategory
  workloadType: RecoveryGroupWorkloadType
  resourceType: RecoveryGroupResourceType
  titleKey: string
  descriptionKey: string
  metaKey: string
  brand: 'VMware' | 'IBM'
}

export const RECOVERY_GROUP_RESOURCE_OPTIONS = [
  {
    providerType: 'VMWARE',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.vm',
    brand: 'VMware',
  },
  {
    providerType: 'IBM_POWER',
    sourceCategory: 'backup_system_workload',
    workloadType: 'ibm_power_virtual_machines',
    resourceType: 'vm',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.ibmPower.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.ibmPower.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.vm',
    brand: 'IBM',
  },
  {
    providerType: 'FLASHCOPY',
    sourceCategory: 'storage_system',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.volume',
    brand: 'IBM',
  },
] as const satisfies readonly RecoveryGroupResourceOption[]
```

Implement availability by building a `Set` of healthy provider types and filtering the registry. This naturally deduplicates multiple providers of one type.

- [ ] **Step 4: Make local storage backward-compatible**

Allow stored `providerId` to be optional or nullable:

```ts
const storedBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  providerId: z.string().min(1).nullable().optional(),
  resources: z.array(z.string().min(1)).min(1),
})
```

Normalize in `deriveGroup`:

```ts
const providerId = group.providerId ?? null

return {
  ...group,
  providerId,
  resources: [...new Set(group.resources)],
  resourceCount: new Set(group.resources).size,
  status: providerId ? 'Active' : 'Draft',
}
```

Persist `validated.providerId` from both `createRecoveryGroup` and `updateRecoveryGroup`. New saves are always `Active` because validation requires the provider.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/config/recoveryGroupResourceOptions.test.ts src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts
```

Expected: PASS.

- [ ] **Step 6: Review the uncommitted diff**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; do not commit.

---

### Task 2: Render dynamic resource-type cards from healthy providers

**Files:**

- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`

**Interfaces:**

- Consumes:
  - `getAvailableRecoveryGroupResourceOptions(providers)`
  - `ProviderRecord[]`
- Produces:
  - `RecoveryGroupTypeStep` props for `providers`, provider query state, and retry.

- [ ] **Step 1: Replace static-card tests with provider-driven tests**

Pass providers explicitly and assert:

```ts
expect(screen.getByRole('button', { name: /VMware virtual machines/i })).toBeInTheDocument()
expect(screen.getByRole('button', { name: /IBM Power virtual machines/i })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: /Oracle databases/i })).not.toBeInTheDocument()
```

Add tests that:

- duplicate VMware providers still render one VMware card;
- `credentialStatus: "missing"` and `"none"` do not enable cards;
- the FlashSystem card appears only under `Storage systems`;
- loading shows a status;
- provider failure shows a retry button;
- no healthy supported providers shows an empty state.

- [ ] **Step 2: Run the type-step test and verify failure**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx
```

Expected: FAIL because the component still owns a static six-card list and does not accept providers.

- [ ] **Step 3: Implement dynamic cards**

Change the component contract to:

```ts
interface RecoveryGroupTypeStepProps {
  providers: ProviderRecord[]
  isLoadingProviders: boolean
  providerError: Error | null
  onRetryProviders: () => void
  sourceCategory: RecoveryGroupSourceCategory | null
  selected: RecoveryGroupWorkloadType | null
  readOnly?: boolean
  onCategoryChange: (sourceCategory: RecoveryGroupSourceCategory) => void
  onSelect: (
    sourceCategory: RecoveryGroupSourceCategory,
    workloadType: RecoveryGroupWorkloadType,
    resourceType: RecoveryGroupResourceType,
  ) => void
}
```

Use `getAvailableRecoveryGroupResourceOptions(providers)` and filter by the active category. Remove `BACKUP_WORKLOADS`, `STORAGE_WORKLOADS`, and all unavailable placeholder cards from the component.

Render loading, retryable error, and empty states before the card grid. Keep selection locked during edit through the existing `readOnly` behavior.

- [ ] **Step 4: Update category and IBM Power copy**

Add or change these English values:

```json
"pages.recoveryGroupBuilder.type.categories.backupWorkload": "Compute workloads",
"pages.recoveryGroupBuilder.type.categories.storageSystem": "Storage systems",
"pages.recoveryGroupBuilder.type.workloads.ibmPower.title": "IBM Power virtual machines",
"pages.recoveryGroupBuilder.type.workloads.ibmPower.description": "Group virtual machines discovered from IBM Power providers.",
"pages.recoveryGroupBuilder.type.noAvailable.title": "No resource types available",
"pages.recoveryGroupBuilder.type.noAvailable.description": "Configure a supported provider with valid credentials before creating a recovery group.",
"pages.recoveryGroupBuilder.type.loading": "Loading available resource types",
"pages.recoveryGroupBuilder.type.loadError": "Providers could not be loaded."
```

Add equivalent Slovak values:

```json
"pages.recoveryGroupBuilder.type.categories.backupWorkload": "Výpočtové workloady",
"pages.recoveryGroupBuilder.type.categories.storageSystem": "Storage systémy",
"pages.recoveryGroupBuilder.type.workloads.ibmPower.title": "Virtuálne stroje IBM Power",
"pages.recoveryGroupBuilder.type.workloads.ibmPower.description": "Zoskupte virtuálne stroje objavené z IBM Power providerov.",
"pages.recoveryGroupBuilder.type.noAvailable.title": "Nie sú dostupné žiadne typy zdrojov",
"pages.recoveryGroupBuilder.type.noAvailable.description": "Pred vytvorením skupiny obnovy nakonfigurujte podporovaného providera s platnými prihlasovacími údajmi.",
"pages.recoveryGroupBuilder.type.loading": "Načítavajú sa dostupné typy zdrojov",
"pages.recoveryGroupBuilder.type.loadError": "Providerov sa nepodarilo načítať."
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupTypeStep.test.tsx
```

Expected: PASS.

---

### Task 3: Add the dedicated Provider step and four-step wizard state

**Files:**

- Create: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.tsx`
- Create: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`

**Interfaces:**

- Produces:

```ts
interface RecoveryGroupProviderStepProps {
  workloadType: RecoveryGroupWorkloadType
  providers: ProviderRecord[]
  selectedProviderId: string | null
  onSelect: (providerId: string) => void
}
```

- [ ] **Step 1: Write provider-step component tests**

Cover exact filtering and selection:

```ts
render(
  <RecoveryGroupProviderStep
    workloadType="vmware_virtual_machines"
    providers={[
      provider('vmware-1', 'VMWARE'),
      provider('power-1', 'IBM_POWER'),
      provider('vmware-broken', 'VMWARE', 'missing'),
    ]}
    selectedProviderId={null}
    onSelect={onSelect}
  />,
)

expect(screen.getByRole('button', { name: /vmware-1/i })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: /power-1/i })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: /vmware-broken/i })).not.toBeInTheDocument()
```

Click the healthy VMware provider and expect `onSelect('vmware-1')`.

- [ ] **Step 2: Write failing four-step builder tests**

Mock `useProviders()` with healthy VMware, Power, and FlashSystem providers. Assert the step navigation contains:

```ts
expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Resource type' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Provider' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Resources' })).toBeInTheDocument()
```

Add interaction tests proving:

- choosing VMware enables navigation to Provider;
- Resources remains disabled until a VMware provider is selected;
- changing resource type resets `providerId` and `resources`;
- changing provider resets `resources`;
- create remains disabled without `providerId`;
- an existing legacy group with `providerId: null` can select a provider before saving.

- [ ] **Step 3: Run tests and verify failure**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx
```

Expected: FAIL because the provider step and four-step state do not exist.

- [ ] **Step 4: Implement `RecoveryGroupProviderStep`**

Resolve the provider type through the registry:

```ts
const option = getRecoveryGroupResourceOption(workloadType)
const matchingProviders = option
  ? providers.filter(provider => (
      provider.type === option.providerType
      && provider.credentialStatus === 'ok'
    ))
  : []
```

Render one `SelectableCard` per matching provider:

```tsx
<SelectableCard
  key={provider.id}
  selected={provider.id === selectedProviderId}
  title={provider.name}
  description={provider.description}
  meta={`${provider.type} · ${provider.ipAddress}`}
  icon={<span className="text-sm font-bold">{option?.brand}</span>}
  onClick={() => { onSelect(provider.id) }}
/>
```

- [ ] **Step 5: Convert `RecoveryGroupBuilder` to four steps**

Call `useProviders()` once in the builder. Initialize `providerId: null` for new drafts and copy `initialData.providerId` for edits.

Use these validity rules:

```ts
const selectedOption = draft.workloadType
  ? getRecoveryGroupResourceOption(draft.workloadType)
  : undefined

const providerValid = Boolean(
  draft.providerId
  && selectedOption
  && providers.some(provider => (
    provider.id === draft.providerId
    && provider.type === selectedOption.providerType
    && provider.credentialStatus === 'ok'
  )),
)
```

Define the steps:

```ts
const steps = [
  { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
  { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type'), disabled: !detailsValid },
  { id: 'provider', label: t('pages.recoveryGroupBuilder.steps.provider'), disabled: !detailsValid || !typeValid },
  { id: 'resources', label: t('pages.recoveryGroupBuilder.steps.resources'), disabled: !detailsValid || !typeValid || !providerValid },
]
```

Render `RecoveryGroupProviderStep` at step 3 and move `RecoveryGroupResourcesStep` to step 4. Pass provider query loading/error/retry props into `RecoveryGroupTypeStep`.

Reset dependent state:

```ts
// Resource type changes
updateDraft({
  sourceCategory,
  workloadType,
  resourceType,
  providerId: draft.workloadType === workloadType ? draft.providerId : null,
  resources: draft.workloadType === workloadType ? draft.resources : [],
})

// Provider changes
updateDraft({
  providerId,
  resources: draft.providerId === providerId ? draft.resources : [],
})
```

Require `providerValid` in `canCreate`.

- [ ] **Step 6: Add provider-step translations**

Add English and Slovak keys for:

- `pages.recoveryGroupBuilder.steps.provider`
- `pages.recoveryGroupBuilder.provider.title`
- `pages.recoveryGroupBuilder.provider.description`
- `pages.recoveryGroupBuilder.provider.empty`

Use copy that states the provider controls which resources load in the next step.

- [ ] **Step 7: Run focused tests**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupProviderStep.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx
```

Expected: PASS.

---

### Task 4: Load and normalize resources for the selected provider

**Files:**

- Modify: `src/features/recovery-plans/recovery-groups/api/recoveryGroupQueryKeys.ts`
- Create: `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.ts`
- Create: `src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx`
- Modify: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`

**Interfaces:**

- Produces:

```ts
export interface RecoveryGroupResourceInventoryResult {
  resourceNames: string[]
}

export function useRecoveryGroupResourceInventory(
  workloadType: RecoveryGroupWorkloadType | null,
  providerId: string | null,
  enabled?: boolean,
): UseQueryResult<RecoveryGroupResourceInventoryResult>
```

- [ ] **Step 1: Write failing hook dispatch tests**

Mock the three existing fetchers and verify:

```ts
it.each([
  ['vmware_virtual_machines', 'vmware-1', fetchVmwareInventory],
  ['ibm_power_virtual_machines', 'power-1', fetchPowerInventory],
  ['ibm_flashsystem', 'flash-1', fetchFlashSystemInventory],
] as const)('loads %s from the selected provider', async (workloadType, providerId, fetcher) => {
  const { result } = renderHook(
    () => useRecoveryGroupResourceInventory(workloadType, providerId),
    { wrapper: createWrapper() },
  )

  await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
  expect(fetcher).toHaveBeenCalledWith(providerId)
})
```

Return fixtures that normalize to:

- VMware: `virtualMachines[].name`
- IBM Power: `partitions[].partitionName`
- FlashSystem: `resources[].name`

Add a test proving no fetcher runs when `providerId` is `null`.

- [ ] **Step 2: Run hook tests and verify failure**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the provider-scoped hook**

Add a query key:

```ts
resourceOptions: (
  workloadType: RecoveryGroupWorkloadType | null,
  providerId: string | null,
) => [...recoveryGroupKeys.all, 'resource-options', workloadType, providerId] as const,
```

Dispatch and normalize inside the query:

```ts
async function fetchResourceNames(
  workloadType: RecoveryGroupWorkloadType,
  providerId: string,
): Promise<string[]> {
  switch (workloadType) {
    case 'vmware_virtual_machines': {
      const inventory = await fetchVmwareInventory(providerId)
      return inventory.virtualMachines.map(resource => resource.name)
    }
    case 'ibm_power_virtual_machines': {
      const inventory = await fetchPowerInventory(providerId)
      return inventory.partitions.map(resource => resource.partitionName)
    }
    case 'ibm_flashsystem': {
      const inventory = await fetchFlashSystemInventory(providerId)
      return inventory.resources.map(resource => resource.name)
    }
  }
}
```

Trim empty names and deduplicate with `Array.from(new Set(names.filter(Boolean)))`. Set:

```ts
enabled: enabled && Boolean(workloadType && providerId)
refetchOnWindowFocus: false
retry: 1
```

- [ ] **Step 4: Write failing generic Resources step tests**

Replace the VMware-only mock with the new hook mock. Add tests for all three workload types and verify that the component:

- passes `workloadType` and `providerId` to the hook;
- renders returned names in `ResourceSidebar`;
- uses VM copy for VMware and IBM Power;
- uses volume copy for FlashSystem;
- shows retryable loading/error/empty states;
- never renders the old FlashSystem “not available yet” placeholder.

- [ ] **Step 5: Generalize `RecoveryGroupResourcesStep`**

Change its props:

```ts
interface RecoveryGroupResourcesStepProps {
  workloadType: RecoveryGroupWorkloadType | null
  providerId: string | null
  resources: string[]
  onAdd: (resource: string) => void
  onRemove: (resource: string) => void
}
```

Call:

```ts
const query = useRecoveryGroupResourceInventory(workloadType, providerId)
```

Use one shared two-column selection layout for all three workload types. Select translated copy from `workloadType`, but keep `ResourceSidebar` and `ResourceSelectionCard` shared.

- [ ] **Step 6: Add workload-aware resource copy**

Add English and Slovak keys for:

- available VMware VMs;
- available IBM Power VMs;
- available FlashSystem volumes;
- selected VM/volume headings;
- search, loading, empty, no-match, remove, and retry labels.

Do not reuse `pages.virtualMachines.error.*` for FlashSystem or IBM Power errors; add Recovery Group-specific inventory error keys.

- [ ] **Step 7: Run focused tests**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/hooks/useRecoveryGroupResourceInventory.test.tsx src/features/recovery-plans/recovery-groups/components/RecoveryGroupResourcesStep.test.tsx
```

Expected: PASS.

---

### Task 5: Complete IBM Power labels and end-to-end Recovery Group coverage

**Files:**

- Modify: `src/features/recovery-plans/recovery-groups/utils/recoveryGroupTypeLabels.ts`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx`
- Test: `src/features/recovery-plans/recovery-groups/components/RecoveryGroupBuilder.test.tsx`
- Test: `src/features/recovery-plans/recovery-groups/api/recoveryGroupsApi.test.ts`
- Modify: `src/locales/en.json`
- Modify: `src/locales/sk.json`

**Interfaces:**

- Consumes all model, registry, provider-step, and resource-hook interfaces from Tasks 1–4.

- [ ] **Step 1: Add a failing IBM Power list-label test**

Add an IBM Power group fixture:

```ts
{
  id: 'power_group',
  name: 'Power group',
  description: 'IBM Power workloads',
  sourceCategory: 'backup_system_workload',
  workloadType: 'ibm_power_virtual_machines',
  resourceType: 'vm',
  providerId: 'ibm-power-01',
  resourceCount: 2,
  status: 'Active',
}
```

Assert the table displays `IBM Power virtual machines`, not the FlashSystem label.

- [ ] **Step 2: Run the table test and verify failure**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups/components/RecoveryGroupsTable.test.tsx
```

Expected: FAIL because `getWorkloadTypeLabelKey` currently treats every non-VMware type as FlashSystem.

- [ ] **Step 3: Make type labels exhaustive**

Replace ternaries with exhaustive switches:

```ts
export function getWorkloadTypeLabelKey(workloadType: RecoveryGroupWorkloadType): string {
  switch (workloadType) {
    case 'vmware_virtual_machines':
      return 'pages.recoveryGroupBuilder.type.workloads.vmware.title'
    case 'ibm_power_virtual_machines':
      return 'pages.recoveryGroupBuilder.type.workloads.ibmPower.title'
    case 'ibm_flashsystem':
      return 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title'
  }
}
```

Keep source-category and resource-type helpers exhaustive as well.

- [ ] **Step 4: Add a complete wizard interaction test**

Exercise the real sequence with mocked provider and inventory hooks:

```text
Details
→ Resource type: IBM Power virtual machines
→ Provider: IBM Power Source
→ Resources: VIOS-01
→ Create
```

Assert `onCreate` receives:

```ts
expect.objectContaining({
  sourceCategory: 'backup_system_workload',
  workloadType: 'ibm_power_virtual_machines',
  resourceType: 'vm',
  providerId: 'ibm-power-01',
  resources: ['VIOS-01'],
})
```

- [ ] **Step 5: Run the entire Recovery Group feature test set**

Run:

```powershell
npx vitest run src/features/recovery-plans/recovery-groups
```

Expected: PASS.

---

### Task 6: Production verification

**Files:**

- Verify all files listed above.

- [ ] **Step 1: Run lint**

Run:

```powershell
npm run lint
```

Expected: exit code 0 with no warnings.

- [ ] **Step 2: Run TypeScript checks**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 3: Run the full test suite**

Run:

```powershell
npm run test
```

Expected: all tests pass.

- [ ] **Step 4: Run the production build**

Run:

```powershell
npm run build
```

Expected: lint, typecheck, tests, and Vite production build all complete successfully.

- [ ] **Step 5: Inspect final uncommitted scope**

Run:

```powershell
git diff --check
git status --short
git diff -- src/features/recovery-plans/recovery-groups src/locales/en.json src/locales/sk.json
```

Expected: only approved Recovery Group/provider-step files plus the uncommitted design and plan documents are part of this task. Do not commit.

