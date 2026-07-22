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

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        <VMSidebar />

        <TierCanvas
          tiers={Object.fromEntries(formState.tiers)}
          onVMAdded={handleVMAdded}
          onVMRemoved={handleVMRemoved}
        />
      </div>
    </div>
  )
}
