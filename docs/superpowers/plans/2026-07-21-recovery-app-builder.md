# Recovery Application Builder Implementation Plan

> **For agentic workers:** Use this plan to build Phase 1 of the disaster recovery feature. Each task should be implemented, tested, and verified before moving to the next. Tasks are sized for single focused sessions.

**Goal:** Implement Phase 1 of the Recovery Application Builder — a tier-based drag-and-drop UI that lets users define recovery applications with VMs organized into ordered tiers, stored as JSON files.

**Architecture:** Mirror the discovery-inventory feature structure (pages, components, api, model, types). Create types/model first (foundation), then API layer, then UI components, then page/routing. Follow vertical slicing: each task delivers working functionality end-to-end.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Query (for hooks pattern), JSON file storage (no database for Phase 1).

---

## Architecture Decisions

- **File location:** `src/features/providers-connectors/` — aligns with platform configuration features; recovery applications are orchestration configs
- **Data storage:** JSON files stored locally or in a designated directory; not database-backed for Phase 1
- **VM source:** Pull available VMs from existing `useInfrastructureTopology` hook (discovery-inventory feature)
- **Connections:** Fixed options (source: `vcenter_default`, target: `vcenter_default_destination`) — not user-configurable in Phase 1
- **Component structure:** Follow discovery-inventory patterns exactly (model/, api/, components/, pages/)
- **State management:** React Query hooks for consistency with existing codebase; local component state for UI (drag-drop, form state)

---

## Directory Structure

```
src/features/providers-connectors/
├── recovery-applications/        # New feature directory
│   ├── pages/
│   │   ├── RecoveryApplicationsListPage.tsx
│   │   └── RecoveryApplicationBuilderPage.tsx
│   ├── components/
│   │   ├── RecoveryAppBuilder.tsx
│   │   ├── TierCanvas.tsx
│   │   ├── VMSidebar.tsx
│   │   ├── TierCard.tsx
│   │   └── AppMetadataForm.tsx
│   ├── api/
│   │   └── useRecoveryApplications.ts
│   ├── helpers/
│   │   └── recoveryApplicationApi.ts
│   └── model/
│       └── recoveryApplicationTypes.ts
```

---

## Task List

### Phase 1: Foundation & Data Model

#### Task 1: Create TypeScript Types & Data Model

**Description:** Define all TypeScript types for recovery applications, tiers, VMs, and metadata. This is the foundation all other tasks depend on.

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/model/recoveryApplicationTypes.ts`

**Code:**

```typescript
export interface RecoveryVM {
  name: string
}

export interface RecoveryTier {
  name: string
  order: number
  description: string
  vms: RecoveryVM[]
}

export interface RecoveryApplicationData {
  application: {
    name: string
    description: string
    environment: 'dev' | 'staging' | 'prod'
    platform: 'VMware vCenter ESXi'
    source_connection: 'vcenter_default'
    target_connection: 'vcenter_default_destination'
    tiers: Record<string, RecoveryTier>
  }
}

export interface RecoveryApplication {
  id: string
  data: RecoveryApplicationData
  createdAt: string
  updatedAt: string
}

export interface RecoveryApplicationFormState {
  name: string
  description: string
  environment: 'dev' | 'staging' | 'prod'
  tiers: Map<string, RecoveryTier>
}
```

**Acceptance criteria:**
- [ ] All types compile without errors
- [ ] Types match the JSON structure from the design (application, tiers, VMs)
- [ ] Tier order is enforced (number type)
- [ ] Environment is restricted to enum values
- [ ] Connections are fixed as constants (not strings)

**Verification:**
- Run: `npm run build`
- Expected: TypeScript compilation succeeds, no type errors

**Dependencies:** None

**Estimated scope:** XS (1 file)

---

#### Task 2: Create API Helpers & Hooks

**Description:** Implement API functions to load/save recovery applications (JSON file operations for Phase 1) and React Query hooks for data fetching and caching.

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/helpers/recoveryApplicationApi.ts`
- Create: `src/features/providers-connectors/recovery-applications/api/useRecoveryApplications.ts`

**Code:**

**File 1: recoveryApplicationApi.ts**

```typescript
import type { RecoveryApplication, RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const RECOVERY_APPS_ENDPOINT = '/api/recovery-applications'

export async function fetchRecoveryApplications(): Promise<RecoveryApplication[]> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery applications: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchRecoveryApplication(id: string): Promise<RecoveryApplication> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery application: ${response.statusText}`)
  }
  return response.json()
}

export async function createRecoveryApplication(data: RecoveryApplicationData): Promise<RecoveryApplication> {
  const response = await fetch(RECOVERY_APPS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create recovery application: ${response.statusText}`)
  }
  return response.json()
}

export async function updateRecoveryApplication(id: string, data: RecoveryApplicationData): Promise<RecoveryApplication> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to update recovery application: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteRecoveryApplication(id: string): Promise<void> {
  const response = await fetch(`${RECOVERY_APPS_ENDPOINT}/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete recovery application: ${response.statusText}`)
  }
}
```

**File 2: useRecoveryApplications.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRecoveryApplications,
  fetchRecoveryApplication,
  createRecoveryApplication,
  updateRecoveryApplication,
  deleteRecoveryApplication,
} from '../helpers/recoveryApplicationApi'
import type { RecoveryApplication, RecoveryApplicationData } from '../model/recoveryApplicationTypes'

export const recoveryApplicationsQueryKey = ['recovery-applications'] as const
export const recoveryApplicationQueryKey = (id: string) => ['recovery-applications', id] as const

export function useRecoveryApplications() {
  return useQuery({
    queryKey: recoveryApplicationsQueryKey,
    queryFn: fetchRecoveryApplications,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecoveryApplication(id: string) {
  return useQuery({
    queryKey: recoveryApplicationQueryKey(id),
    queryFn: () => fetchRecoveryApplication(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  })
}

export function useCreateRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecoveryApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}

export function useUpdateRecoveryApplication(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RecoveryApplicationData) => updateRecoveryApplication(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationQueryKey(id) })
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}

export function useDeleteRecoveryApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecoveryApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })
    },
  })
}
```

**Acceptance criteria:**
- [ ] All fetch/CRUD functions implemented
- [ ] React Query hooks follow discovery-inventory patterns
- [ ] Hooks use consistent query keys
- [ ] Mutations invalidate cache properly
- [ ] Error handling includes meaningful error messages
- [ ] Build succeeds with no TypeScript errors

**Verification:**
- Run: `npm run build`
- Expected: No errors

**Dependencies:** Task 1

**Estimated scope:** S (2 files, standard patterns)

---

### Phase 2: UI Components

#### Task 3: Create Core UI Components (Sidebar & Form)

**Description:** Build the left sidebar (available VMs) and top metadata form components. These are simpler, independent components that don't depend on complex state management.

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/components/VMSidebar.tsx`
- Create: `src/features/providers-connectors/recovery-applications/components/AppMetadataForm.tsx`

**Code:**

**File 1: VMSidebar.tsx**

```typescript
import { useState, useMemo } from 'react'
import { useInfrastructureTopology } from '@/features/discovery-inventory/infrastructure/api/useInfrastructureTopology'

interface VMSidebarProps {
  onVMSelect?: (vmName: string) => void
}

export function VMSidebar({ onVMSelect }: VMSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: topology, isLoading } = useInfrastructureTopology()

  const availableVMs = useMemo(() => {
    if (!topology) return []
    return topology.nodes
      .filter(node => node.kind === 'virtualMachine')
      .map(node => node.label)
      .sort()
  }, [topology])

  const filteredVMs = useMemo(() => {
    return availableVMs.filter(vm =>
      vm.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableVMs, searchQuery])

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading VMs...</div>
  }

  return (
    <div className="w-80 bg-white border border-[#e3edf6] rounded-lg flex flex-col overflow-hidden shadow-sm">
      <div className="p-3 border-b border-[#edf2f7] bg-[#fbfdff]">
        <h3 className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider mb-2">
          Available VMs
        </h3>
        <input
          type="text"
          placeholder="Search VMs..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-[#cfdaea] rounded-md focus:outline-none focus:border-[#0ba5ec]"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredVMs.length === 0 ? (
          <div className="text-xs text-[#91a4bc] text-center py-4">
            {searchQuery ? 'No VMs match your search' : 'No VMs available'}
          </div>
        ) : (
          filteredVMs.map(vm => (
            <div
              key={vm}
              draggable
              onDragStart={e => {
                e.dataTransfer?.setData('vm-name', vm)
                onVMSelect?.(vm)
              }}
              className="p-2 mb-1 bg-[#f0f5fa] border border-[#d9e6f1] rounded-md text-xs text-[#18253d] cursor-grab hover:bg-[#e3edf6] hover:border-[#b9d5e8] transition-all"
            >
              {vm}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

**File 2: AppMetadataForm.tsx**

```typescript
import { useState } from 'react'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface AppMetadataFormProps {
  onMetadataChange?: (metadata: Partial<RecoveryApplicationFormState>) => void
  initialValues?: { name: string; description: string; environment: 'dev' | 'staging' | 'prod' }
}

export function AppMetadataForm({ onMetadataChange, initialValues }: AppMetadataFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(
    initialValues?.environment ?? 'dev'
  )

  const handleChange = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setName(value)
        onMetadataChange?.({ name: value })
        break
      case 'description':
        setDescription(value)
        onMetadataChange?.({ description: value })
        break
      case 'environment':
        setEnvironment(value as 'dev' | 'staging' | 'prod')
        onMetadataChange?.({ environment: value as 'dev' | 'staging' | 'prod' })
        break
    }
  }

  return (
    <form className="grid grid-cols-3 gap-4 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Application Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="e.g., SampleAppRecovery2"
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-[#0ba5ec]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="e.g., Recovery of FinanceTBApp2"
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-[#0ba5ec]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase text-[#7b8ca4] tracking-wider">
          Environment
        </label>
        <select
          value={environment}
          onChange={e => handleChange('environment', e.target.value)}
          className="px-3 py-2 border border-[#cfdaea] rounded-md text-sm focus:outline-none focus:border-[#0ba5ec]"
        >
          <option value="dev">dev</option>
          <option value="staging">staging</option>
          <option value="prod">prod</option>
        </select>
      </div>
    </form>
  )
}
```

**Acceptance criteria:**
- [ ] VMSidebar loads VMs from useInfrastructureTopology hook
- [ ] VM search/filter works correctly
- [ ] VMs are draggable (drag-drop ready)
- [ ] AppMetadataForm collects name, description, environment
- [ ] Styling matches discovery-inventory design system
- [ ] No errors in build

**Verification:**
- Run: `npm run build`
- Expected: No errors

**Dependencies:** Task 1, 2 (for hook imports)

**Estimated scope:** S (2 files, straightforward form components)

---

#### Task 4: Create Tier Canvas & Card Components

**Description:** Build the tier visualization components — the drag-drop zones where VMs are organized. This includes TierCard (individual tier) and TierCanvas (grid of all tiers).

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/components/TierCard.tsx`
- Create: `src/features/providers-connectors/recovery-applications/components/TierCanvas.tsx`

**Code:**

**File 1: TierCard.tsx**

```typescript
import { useState } from 'react'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCardProps {
  tier: RecoveryTier
  onVMAdded?: (vmName: string) => void
  onVMRemoved?: (vmName: string) => void
}

export function TierCard({ tier, onVMAdded, onVMRemoved }: TierCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const vmName = e.dataTransfer?.getData('vm-name')
    if (vmName) {
      onVMAdded?.(vmName)
    }
  }

  return (
    <div className="bg-white border-2 border-dashed border-[#d9e6f1] rounded-lg flex flex-col overflow-hidden min-w-[280px] shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#edf2f7] bg-[#fbfdff]">
        <div className="text-xs text-[#7b8ca4] font-semibold uppercase tracking-wider mb-1">
          Order: <span className="font-bold">{tier.order}</span>
        </div>
        <div className="text-sm font-semibold text-[#18253d] mb-1">{tier.name}</div>
        <div className="text-xs text-[#71819a]">{tier.description}</div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-3 min-h-[300px] flex flex-col gap-2 transition-all ${
          isDragOver ? 'bg-[#e3edf6] border-t border-[#0ba5ec]' : 'bg-[#f8fbfe]'
        }`}
      >
        {tier.vms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-[#91a4bc]">
            Drag VMs here
          </div>
        ) : (
          tier.vms.map(vm => (
            <div
              key={vm.name}
              className="p-2 bg-white border border-[#d9e6f1] rounded-md text-xs text-[#18253d] flex items-center justify-between group hover:border-[#b9d5e8]"
            >
              <span>{vm.name}</span>
              <button
                onClick={() => onVMRemoved?.(vm.name)}
                className="text-[#91a4bc] hover:text-[#d4353d] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove VM"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

**File 2: TierCanvas.tsx**

```typescript
import { useMemo } from 'react'
import { TierCard } from './TierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

interface TierCanvasProps {
  tiers: Record<string, RecoveryTier>
  onVMAdded?: (tierId: string, vmName: string) => void
  onVMRemoved?: (tierId: string, vmName: string) => void
}

export function TierCanvas({ tiers, onVMAdded, onVMRemoved }: TierCanvasProps) {
  const sortedTiers = useMemo(() => {
    return Object.entries(tiers)
      .map(([id, tier]) => ({ id, tier }))
      .sort((a, b) => a.tier.order - b.tier.order)
  }, [tiers])

  return (
    <div className="flex-1 grid grid-cols-4 gap-4 overflow-x-auto overflow-y-hidden pr-2">
      {sortedTiers.map(({ id, tier }) => (
        <TierCard
          key={id}
          tier={tier}
          onVMAdded={vmName => onVMAdded?.(id, vmName)}
          onVMRemoved={vmName => onVMRemoved?.(id, vmName)}
        />
      ))}
    </div>
  )
}
```

**Acceptance criteria:**
- [ ] TierCard displays tier info (order, name, description)
- [ ] Drop zones accept dragged VMs
- [ ] VMs can be removed from tiers
- [ ] Tiers are sorted by order number
- [ ] Visual feedback on drag-over
- [ ] Styling matches design mockup
- [ ] Build succeeds

**Verification:**
- Run: `npm run build`
- Expected: No errors

**Dependencies:** Task 1, 3 (for form state integration)

**Estimated scope:** S (2 files, drag-drop components)

---

#### Task 5: Create Recovery App Builder Component

**Description:** Combine all UI components into the main RecoveryAppBuilder component. This orchestrates metadata form, VM sidebar, and tier canvas into a cohesive interface.

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/components/RecoveryAppBuilder.tsx`

**Code:**

```typescript
import { useState, useCallback } from 'react'
import { AppMetadataForm } from './AppMetadataForm'
import { VMSidebar } from './VMSidebar'
import { TierCanvas } from './TierCanvas'
import type { RecoveryTier, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  isSaving?: boolean
}

const DEFAULT_TIERS: Record<string, RecoveryTier> = {
  database: {
    name: 'Database',
    order: 1,
    description: 'Database server group',
    vms: [],
  },
  db_cluster: {
    name: 'DB Cluster',
    order: 2,
    description: 'DB Cluster Master Node',
    vms: [],
  },
  application: {
    name: 'Application',
    order: 3,
    description: 'Application server group',
    vms: [],
  },
  web: {
    name: 'Web',
    order: 4,
    description: 'Web server group',
    vms: [],
  },
}

export function RecoveryAppBuilder({ onSave, isSaving }: RecoveryAppBuilderProps) {
  const [formState, setFormState] = useState<RecoveryApplicationFormState>({
    name: '',
    description: '',
    environment: 'dev',
    tiers: new Map(Object.entries(DEFAULT_TIERS)),
  })

  const handleMetadataChange = useCallback((metadata: Partial<RecoveryApplicationFormState>) => {
    setFormState(prev => ({ ...prev, ...metadata }))
  }, [])

  const handleVMAdded = useCallback((tierId: string, vmName: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (tier && !tier.vms.find(vm => vm.name === vmName)) {
        tier.vms.push({ name: vmName })
      }
      return { ...prev, tiers: newTiers }
    })
  }, [])

  const handleVMRemoved = useCallback((tierId: string, vmName: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (tier) {
        tier.vms = tier.vms.filter(vm => vm.name !== vmName)
      }
      return { ...prev, tiers: newTiers }
    })
  }, [])

  const handleSave = () => {
    if (!formState.name.trim()) {
      alert('Please enter an application name')
      return
    }
    onSave?.(formState)
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fbfe]">
      {/* Header with Metadata */}
      <div className="bg-white border-b border-[#e3edf6] p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-[#18253d] mb-4">Create Recovery Application</h1>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <AppMetadataForm
              onMetadataChange={handleMetadataChange}
              initialValues={{
                name: formState.name,
                description: formState.description,
                environment: formState.environment,
              }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0d91d7] text-white font-semibold rounded-md hover:bg-[#0a7ab5] disabled:bg-gray-400 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Application'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Sidebar */}
        <VMSidebar />

        {/* Canvas */}
        <TierCanvas
          tiers={Object.fromEntries(formState.tiers)}
          onVMAdded={handleVMAdded}
          onVMRemoved={handleVMRemoved}
        />
      </div>
    </div>
  )
}
```

**Acceptance criteria:**
- [ ] All sub-components render correctly
- [ ] Metadata form changes update state
- [ ] Drag-drop adds/removes VMs from tiers
- [ ] Form validation (name required) works
- [ ] Save button triggers callback with complete app state
- [ ] Save button disabled while saving
- [ ] Build succeeds

**Verification:**
- Run: `npm run build`
- Expected: No errors

**Dependencies:** Task 1, 2, 3, 4

**Estimated scope:** S (1 file, orchestration)

---

### Phase 3: Pages & Routing

#### Task 6: Create Pages & Router Integration

**Description:** Create the page components for listing and building recovery applications. Integrate with the application router.

**Files:**
- Create: `src/features/providers-connectors/recovery-applications/pages/RecoveryApplicationsListPage.tsx`
- Create: `src/features/providers-connectors/recovery-applications/pages/RecoveryApplicationBuilderPage.tsx`
- Modify: Application router configuration

**Code:**

**File 1: RecoveryApplicationsListPage.tsx**

```typescript
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useRecoveryApplications } from '../api/useRecoveryApplications'

export function RecoveryApplicationsListPage() {
  const { data: applications, isLoading, error } = useRecoveryApplications()

  if (isLoading) {
    return <div className="p-6">Loading recovery applications...</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          Failed to load recovery applications
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Recovery Applications"
        description="Manage disaster recovery application definitions"
        actions={
          <Link to="/recovery-applications/create">
            <Button>Create Application</Button>
          </Link>
        }
      />

      <div className="p-6">
        {!applications || applications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No recovery applications defined yet</p>
            <Link to="/recovery-applications/create">
              <Button>Create Your First Application</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">{app.data.application.name}</h3>
                <p className="text-gray-600 text-sm">{app.data.application.description}</p>
                <div className="mt-2 flex gap-2">
                  <Link to={`/recovery-applications/${app.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
```

**File 2: RecoveryApplicationBuilderPage.tsx**

```typescript
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useCreateRecoveryApplication } from '../api/useRecoveryApplications'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const navigate = useNavigate()
  const createMutation = useCreateRecoveryApplication()

  const handleSave = async (appState: RecoveryApplicationFormState) => {
    const applicationData = {
      application: {
        name: appState.name,
        description: appState.description,
        environment: appState.environment,
        platform: 'VMware vCenter ESXi' as const,
        source_connection: 'vcenter_default' as const,
        target_connection: 'vcenter_default_destination' as const,
        tiers: Object.fromEntries(
          Array.from(appState.tiers.entries()).map(([id, tier]) => [id, tier])
        ),
      },
    }

    try {
      await createMutation.mutateAsync(applicationData)
      navigate('/recovery-applications')
    } catch (error) {
      console.error('Failed to save recovery application:', error)
      alert('Failed to save application. Please try again.')
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Create Recovery Application"
      />
      <RecoveryAppBuilder
        onSave={handleSave}
        isSaving={createMutation.isPending}
      />
    </>
  )
}
```

**Router Configuration:**

Add these routes to your main router configuration:

```typescript
{
  path: '/recovery-applications',
  children: [
    {
      index: true,
      element: <RecoveryApplicationsListPage />,
    },
    {
      path: 'create',
      element: <RecoveryApplicationBuilderPage />,
    },
  ],
}
```

**Acceptance criteria:**
- [ ] RecoveryApplicationsListPage loads and displays applications
- [ ] Create button navigates to builder page
- [ ] RecoveryApplicationBuilderPage renders RecoveryAppBuilder
- [ ] Save successfully creates application and redirects to list
- [ ] Error handling works
- [ ] Router integration complete

**Verification:**
- Run: `npm run build`
- Manual: Navigate to `/recovery-applications`, then `/recovery-applications/create`
- Expected: Pages load, builder component renders, save works

**Dependencies:** Task 1, 2, 5

**Estimated scope:** S (2 pages + router config)

---

## Checkpoint: Phase 1 Complete

- [ ] All tasks implemented
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] Manual testing complete:
  - [ ] Navigate to recovery applications list
  - [ ] Create new application
  - [ ] Fill in metadata (name, description, environment)
  - [ ] Search and drag VMs into tiers
  - [ ] Remove VMs from tiers
  - [ ] Save application (verify JSON structure matches target)
  - [ ] Verify saved application appears in list
- [ ] Code review before merging

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| JSON file storage not persistent across sessions | Medium | Phase 1 limitation; backend/database integration in Phase 2 |
| Drag-drop might not work across browsers | Medium | Test on Chrome, Firefox, Safari; use browser-standard drag API |
| VM list very large (1000+ VMs) | Medium | Add pagination or virtual scrolling in sidebar if needed |
| Tier ordering complexity | Low | Fixed 4 tiers for Phase 1; user can't customize |

---

## Open Questions

- Where should recovery application JSON files be stored? (local file system, S3, shared drive?)
- Should there be a validation step before save? (e.g., require at least 1 VM per tier?)
- Do you want to support editing existing applications in Phase 1, or only creation?
