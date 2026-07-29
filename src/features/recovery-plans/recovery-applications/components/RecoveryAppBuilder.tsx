import { useState, useCallback } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { useRecoveryGroups } from '../../recovery-groups/hooks/useRecoveryGroups'
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
  },
  db_cluster: {
    order: 2,
    description: 'DB Cluster Master Node',
  },
  application: {
    order: 3,
    description: 'Application server group',
  },
  web: {
    order: 4,
    description: 'Web server group',
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
  const { groups } = useRecoveryGroups()
  const availableGroups = groups.filter(
    group => (
      group.sourceCategory === 'backup_system_workload'
      && group.workloadType === 'vmware_virtual_machines'
      && group.resourceType === 'vm'
    ),
  )
  const groupLabels = Object.fromEntries(
    availableGroups.map(group => [group.id, group.name]),
  )
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => createInitialFormState(initialData),
  )

  const handleMetadataChange = useCallback((metadata: Partial<RecoveryApplicationFormState>) => {
    setFormState(prev => ({ ...prev, ...metadata }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleRecoveryGroupAdded = useCallback((tierId: string, groupId: string) => {
    const selectedGroup = availableGroups.find(group => group.id === groupId)
    if (!selectedGroup) return

    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (tier) {
        newTiers.set(tierId, {
          ...tier,
          recovery_group: {
            name: selectedGroup.id,
            description: selectedGroup.description,
            vms: selectedGroup.resources.map(name => ({ name })),
          },
        })
      }
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [availableGroups, onDirtyChange])

  const handleRecoveryGroupRemoved = useCallback((tierId: string) => {
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, {
        order: tier.order,
        description: tier.description,
      })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: {
    tierDescription: string
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
    if (Array.from(formState.tiers.values()).some(tier => !tier.recovery_group)) {
      alert(t('recovery.application.validation.recoveryGroupRequired'))
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
          {/* Recovery Group Sidebar */}
          <div className="border-b lg:border-b-0 lg:border-r border-[#e3edf6] overflow-y-auto custom-scrollbar">
            <ResourceSidebar
              items={availableGroups.map(group => group.id)}
              itemLabels={groupLabels}
              title={t('recovery.sidebar.availableGroups')}
              searchPlaceholder={t('recovery.sidebar.searchGroupsPlaceholder')}
              loadingLabel={t('recovery.sidebar.loadingGroups')}
              noItemsLabel={t('recovery.sidebar.noGroupsAvailable')}
              noMatchesLabel={t('recovery.sidebar.noMatchingGroups')}
              dragDataKey="recovery-group-id"
              errorTitle={t('recovery.sidebar.groupsError')}
              staleErrorTitle={t('recovery.sidebar.groupsError')}
              staleErrorDescription={t('recovery.sidebar.groupsError')}
              retryLabel={t('buttons.retry')}
            />
          </div>

          {/* Tier Canvas */}
          <div className="overflow-y-auto custom-scrollbar p-4">
            <TierCanvas
              tiers={Object.fromEntries(formState.tiers)}
              onRecoveryGroupAdded={handleRecoveryGroupAdded}
              onRecoveryGroupRemoved={handleRecoveryGroupRemoved}
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
