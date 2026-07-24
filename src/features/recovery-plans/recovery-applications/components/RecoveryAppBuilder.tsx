import { useState, useCallback } from 'react'
import { AppMetadataForm } from './AppMetadataForm'
import { VMSidebar } from './VMSidebar'
import { TierCanvas } from './TierCanvas'
import type { RecoveryTier, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
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

export function RecoveryAppBuilder({ onSave, isSaving, initialData }: RecoveryAppBuilderProps) {
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    initialData ?? {
      name: '',
      description: '',
      environment: 'dev',
      provider: '',
      tiers: new Map(Object.entries(DEFAULT_TIERS)),
    }
  )

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

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: { name: string; description: string }) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const oldTier = newTiers.get(tierId)

      if (!oldTier) return prev

      // If ID changed, delete old and create new
      if (newTierId !== tierId) {
        newTiers.delete(tierId)
      }

      newTiers.set(newTierId, {
        ...oldTier,
        name: updates.name,
        description: updates.description,
      })

      return { ...prev, tiers: newTiers }
    })
  }, [])

  const handleTierAdd = useCallback((tierId: string, tier: RecoveryTier) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, tier)
      return { ...prev, tiers: newTiers }
    })
  }, [])

  const handleTierDelete = useCallback((tierId: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.delete(tierId)
      return { ...prev, tiers: newTiers }
    })
  }, [])

  const handleTierReorder = useCallback((reorderedTiers: Record<string, RecoveryTier>) => {
    setFormState(prev => ({
      ...prev,
      tiers: new Map(Object.entries(reorderedTiers)),
    }))
  }, [])

  const handleSave = () => {
    if (!formState.name.trim()) {
      alert('Please enter an application name')
      return
    }
    if (!formState.description.trim()) {
      alert('Please enter a description')
      return
    }
    onSave?.(formState)
  }

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 flex-1 p-4">
      {/* Metadata Form Card */}
      <div className="bg-white border border-[#e3edf6] rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#17233d] mb-4">Application Details</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
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
            className="px-4 py-2 bg-[#0d91d7] text-white font-semibold rounded-md hover:bg-[#0a7ab5] disabled:bg-gray-400 transition-colors whitespace-nowrap"
          >
            {isSaving ? 'Saving...' : 'Save Application'}
          </button>
        </div>
      </div>

      {/* Builder Card */}
      <div className="flex-1 bg-white border border-[#e3edf6] rounded-lg overflow-hidden shadow-sm lg:min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 h-full lg:min-h-0">
          {/* VM Sidebar */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#e3edf6] overflow-y-auto custom-scrollbar">
            <VMSidebar />
          </div>

          {/* Tier Canvas */}
          <div className="overflow-y-auto custom-scrollbar p-4">
            <TierCanvas
              tiers={Object.fromEntries(formState.tiers)}
              onVMAdded={handleVMAdded}
              onVMRemoved={handleVMRemoved}
              onTierEdit={handleTierEdit}
              onTierAdd={handleTierAdd}
              onTierDelete={handleTierDelete}
              onTierReorder={handleTierReorder}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
