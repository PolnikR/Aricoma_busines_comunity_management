import { useState, useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { AppMetadataForm } from './AppMetadataForm'
import { TierCanvas } from './TierCanvas'
import { isValidRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'
import type { RecoveryTier, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  onDirtyChange?: (isDirty: boolean) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
  disableFileName?: boolean
}

const DEFAULT_TIERS: Record<string, RecoveryTier> = {
  database: {
    order: 1,
    description: 'Database server group',
    recovery_group: {
      name: 'database_group',
      description: 'Recovery group containing the database tier VMs',
      vms: [],
    },
  },
  db_cluster: {
    order: 2,
    description: 'DB Cluster Master Node',
    recovery_group: {
      name: 'db_cluster_group',
      description: 'Recovery group containing the DB cluster VMs',
      vms: [],
    },
  },
  application: {
    order: 3,
    description: 'Application server group',
    recovery_group: {
      name: 'application_group',
      description: 'Recovery group containing the application tier VMs',
      vms: [],
    },
  },
  web: {
    order: 4,
    description: 'Web server group',
    recovery_group: {
      name: 'web_group',
      description: 'Recovery group containing the web tier VMs',
      vms: [],
    },
  },
}

function cloneTier(tier: RecoveryTier): RecoveryTier {
  if (!tier.recovery_group) {
    return { ...tier }
  }

  return {
    ...tier,
    recovery_group: {
      ...tier.recovery_group,
      vms: tier.recovery_group.vms.map(vm => ({ ...vm })),
    },
  }
}

function createInitialFormState(
  initialData?: RecoveryApplicationFormState,
): RecoveryApplicationFormState {
  if (initialData) {
    return {
      ...initialData,
      tiers: new Map(
        Array.from(
          initialData.tiers,
          ([id, tier]): [string, RecoveryTier] => [id, cloneTier(tier)],
        ),
      ),
    }
  }

  return {
    fileName: '',
    name: '',
    description: '',
    environment: 'dev',
    tiers: new Map(
      Object.entries(DEFAULT_TIERS).map(
        ([id, tier]): [string, RecoveryTier] => [id, cloneTier(tier)],
      ),
    ),
  }
}

export function RecoveryAppBuilder({
  onSave,
  onDirtyChange,
  isSaving,
  initialData,
  disableFileName = false,
}: RecoveryAppBuilderProps) {
  const { t } = useTranslation()
  const { data: inventory, error: inventoryError, isLoading: inventoryLoading, isFetching, refetch } = useDiscoveryInventory()
  const virtualMachines = inventory?.virtualMachines.map(vm => vm.name) ?? []
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => createInitialFormState(initialData),
  )

  const handleMetadataChange = useCallback((metadata: Partial<RecoveryApplicationFormState>) => {
    setFormState(prev => ({ ...prev, ...metadata }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleVMAdded = useCallback((tierId: string, vmName: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      const recoveryGroup = tier?.recovery_group
      if (recoveryGroup && !recoveryGroup.vms.find(vm => vm.name === vmName)) {
        newTiers.set(tierId, {
          ...tier,
          recovery_group: {
            ...recoveryGroup,
            vms: [...recoveryGroup.vms, { name: vmName }],
          },
        })
      }
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleVMRemoved = useCallback((tierId: string, vmName: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (tier?.recovery_group) {
        newTiers.set(tierId, {
          ...tier,
          recovery_group: {
            ...tier.recovery_group,
            vms: tier.recovery_group.vms.filter(vm => vm.name !== vmName),
          },
        })
      }
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: {
    tierDescription: string
    recoveryGroupName: string
    recoveryGroupDescription: string
  }) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const oldTier = newTiers.get(tierId)

      if (!oldTier) return prev

      // If ID changed, delete old and create new
      if (newTierId !== tierId) {
        newTiers.delete(tierId)
      }

      const updatedTier: RecoveryTier = {
        ...oldTier,
        description: updates.tierDescription,
      }

      updatedTier.recovery_group = {
        name: updates.recoveryGroupName,
        description: updates.recoveryGroupDescription,
        vms: oldTier.recovery_group?.vms ?? [],
      }

      newTiers.set(newTierId, updatedTier)

      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierAdd = useCallback((tierId: string, tier: RecoveryTier) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, tier)
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierDelete = useCallback((tierId: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.delete(tierId)
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierReorder = useCallback((reorderedTiers: Record<string, RecoveryTier>) => {
    setFormState(prev => ({
      ...prev,
      tiers: new Map(Object.entries(reorderedTiers)),
    }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleSave = () => {
    if (!isValidRecoveryApplicationFileName(formState.fileName)) {
      alert(t('recovery.application.validation.fileNameRequired'))
      return
    }
    if (!formState.name.trim()) {
      alert(t('alerts.pleaseEnterName'))
      return
    }
    if (!formState.description.trim()) {
      alert(t('alerts.pleaseEnterDescription'))
      return
    }
    onSave?.(formState)
  }

  return (
    <div className="flex flex-col gap-4 lg:min-h-0 flex-1 p-4">
      {/* Metadata Form Card */}
      <div className="bg-white border border-[#e3edf6] rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-semibold text-[#17233d] mb-4">{t('pages.recovery.applicationDetails')}</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <AppMetadataForm
              onMetadataChange={handleMetadataChange}
              disableFileName={disableFileName}
              initialValues={{
                fileName: formState.fileName,
                name: formState.name,
                description: formState.description,
                environment: formState.environment,
              }}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="whitespace-nowrap"
          >
            {isSaving ? t('messages.saving') : t('buttons.saveApplication')}
          </Button>
        </div>
      </div>

      {/* Builder Card */}
      <div className="flex-1 bg-white border border-[#e3edf6] rounded-lg overflow-hidden shadow-sm lg:min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 h-full lg:min-h-0">
          {/* VM Sidebar */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#e3edf6] overflow-y-auto custom-scrollbar">
            <ResourceSidebar
              items={virtualMachines}
              title={t('recovery.sidebar.availableVms')}
              searchPlaceholder={t('recovery.sidebar.searchPlaceholder')}
              loadingLabel={t('recovery.sidebar.loadingVms')}
              noItemsLabel={t('recovery.sidebar.noVmsAvailable')}
              noMatchesLabel={t('recovery.sidebar.noMatching')}
              dragDataKey="vm-name"
              isLoading={inventoryLoading}
              isRetrying={isFetching}
              error={inventoryError instanceof Error ? inventoryError : null}
              errorTitle={t('pages.virtualMachines.error.title')}
              staleErrorTitle={t('pages.virtualMachines.error.latestFailed')}
              staleErrorDescription={t('pages.virtualMachines.error.showingPrevious')}
              retryLabel={t('pages.virtualMachines.error.retryButton')}
              onRetry={() => { void refetch() }}
            />
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
