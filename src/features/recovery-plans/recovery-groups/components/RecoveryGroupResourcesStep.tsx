import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/shared/utils/cn'
import { useRecoveryGroupResourceInventory } from '../hooks/useRecoveryGroupResourceInventory'
import type { RecoveryGroupVmMetadata, RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourcesStepProps {
  workloadType: RecoveryGroupWorkloadType | null
  providerId: string | null
  resources: string[]
  onAdd: (resource: string) => void
  onRemove: (resource: string) => void
  onMetadataAvailable?: (metadata: Record<string, RecoveryGroupVmMetadata>) => void
  renderItemContent?: ((resource: string) => ReactNode) | undefined
  selectionHint?: ReactNode
  compact?: boolean
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
  renderItemContent,
  selectionHint,
  compact = false,
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
    <div className={cn('grid min-h-64 min-w-0 gap-4', compact ? 'flex-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]' : 'lg:h-full lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]')}>
      <div className="h-72 min-h-0 min-w-0 overflow-hidden rounded-lg border border-border lg:h-full">
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
      <div className={cn('flex h-72 min-h-0 min-w-0 flex-col rounded-lg border-2 border-dashed border-border bg-surface lg:h-full', compact ? 'p-2' : 'p-4')}>
        <h2 className="text-base font-semibold text-text-primary">{t(key('selectedTitle'))}</h2>
        <p className={cn('mt-1 text-text-muted', compact ? 'text-xs' : 'text-sm')}>{t(key('description'))}</p>
        {selectionHint}
        <ResourceSelectionCard
          density={compact ? 'compact' : 'default'}
          items={resources}
          emptyText={t(key('empty'))}
          removeLabel={t(key('remove'))}
          ariaLabel={t(key('selectedAriaLabel'))}
          dropDataKey="recovery-group-resource-name"
          onResourceDrop={onAdd}
          onResourceRemove={onRemove}
          renderItemContent={renderItemContent}
          className={compact ? 'mt-2 flex-1 rounded-lg' : 'mt-4 h-auto min-h-0 flex-1 rounded-lg border border-border'}
        />
      </div>
    </div>
  )
}
