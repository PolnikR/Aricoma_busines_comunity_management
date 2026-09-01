import { useEffect, useState } from 'react'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { useTranslation } from '@/hooks/useTranslation'
import { useRecoveryGroupResourceInventory } from '../hooks/useRecoveryGroupResourceInventory'
import type { RecoveryGroupVmMetadata, RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourcesStepProps {
  workloadType: RecoveryGroupWorkloadType | null
  providerId: string | null
  resources: string[]
  onAdd: (resource: string) => void
  onRemove: (resource: string) => void
  onMetadataAvailable?: (metadata: Record<string, RecoveryGroupVmMetadata>) => void
}

export function RecoveryGroupResourcesStep(props: RecoveryGroupResourcesStepProps) {
  return (
    <RecoveryGroupResourcesStepContent
      key={`${props.workloadType ?? ''}|${props.providerId ?? ''}`}
      {...props}
    />
  )
}

function RecoveryGroupResourcesStepContent({
  workloadType,
  providerId,
  resources,
  onAdd,
  onRemove,
  onMetadataAvailable,
}: RecoveryGroupResourcesStepProps) {
  const { t } = useTranslation()
  const [vmwareNamePrefix, setVmwareNamePrefix] = useState('')
  const isVmware = workloadType === 'vmware_virtual_machines'
  const query = useRecoveryGroupResourceInventory(workloadType, providerId, { vmwareNamePrefix })
  const availableResources = query.data?.resourceNames ?? []
  const vmMetadataByName = query.data?.vmMetadataByName

  useEffect(() => {
    if (vmMetadataByName) {
      onMetadataAvailable?.(vmMetadataByName)
    }
  }, [vmMetadataByName, onMetadataAvailable])
  const resourceKind = workloadType === 'ibm_flashsystem' ? 'volumes' : 'virtualMachines'
  const key = (suffix: string) => `pages.recoveryGroupBuilder.resources.${resourceKind}.${suffix}`

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="h-72 min-h-0 overflow-hidden rounded-lg border border-border lg:h-full">
        <ResourceSidebar
          items={availableResources}
          title={t(key('available'))}
          searchPlaceholder={t(key('search'))}
          loadingLabel={t(key('loading'))}
          noItemsLabel={t(key('noItems'))}
          noMatchesLabel={t(key('noMatches'))}
          dragDataKey="recovery-group-resource-name"
          isLoading={query.isLoading}
          isSearching={query.isSearching}
          isRetrying={query.isFetching}
          error={query.error instanceof Error ? query.error : null}
          errorTitle={t('pages.recoveryGroupBuilder.resources.error.title')}
          staleErrorTitle={t('pages.recoveryGroupBuilder.resources.error.latestFailed')}
          staleErrorDescription={t('pages.recoveryGroupBuilder.resources.error.showingPrevious')}
          retryLabel={t('buttons.retry')}
          onRetry={() => { void query.refetch() }}
          {...(isVmware ? {
            searchValue: vmwareNamePrefix,
            onSearchChange: setVmwareNamePrefix,
          } : {})}
        />
      </div>
      <div className="flex h-72 min-h-0 flex-col rounded-lg border-2 border-dashed border-border bg-surface p-4 lg:h-full">
        <h2 className="text-base font-semibold text-text-primary">{t(key('selectedTitle'))}</h2>
        <p className="mt-1 text-sm text-text-muted">{t(key('description'))}</p>
        <ResourceSelectionCard
          items={resources}
          emptyText={t(key('empty'))}
          removeLabel={t(key('remove'))}
          ariaLabel={t(key('selectedAriaLabel'))}
          dropDataKey="recovery-group-resource-name"
          onResourceDrop={onAdd}
          onResourceRemove={onRemove}
          className="mt-4 h-auto min-h-0 flex-1 rounded-lg border border-border"
        />
      </div>
    </div>
  )
}
