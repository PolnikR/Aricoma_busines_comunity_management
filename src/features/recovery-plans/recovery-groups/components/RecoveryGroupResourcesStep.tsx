import { useDiscoveryInventory } from '@/features/discovery-inventory/api/useDiscoveryInventory'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'
import type { RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupResourcesStepProps {
  workloadType: RecoveryGroupWorkloadType | null
  resources: string[]
  onAdd: (resource: string) => void
  onRemove: (resource: string) => void
}

export function RecoveryGroupResourcesStep({
  workloadType,
  resources,
  onAdd,
  onRemove,
}: RecoveryGroupResourcesStepProps) {
  const { t } = useTranslation()
  const { data: inventory, error, isLoading, isFetching, refetch } = useDiscoveryInventory()
  const virtualMachines = inventory?.virtualMachines.map(vm => vm.name) ?? []

  if (workloadType === 'IBM FlashSystem') {
    return (
      <EmptyState
        title={t('pages.recoveryGroupBuilder.resources.flashEmptyTitle')}
        description={t('pages.recoveryGroupBuilder.resources.flashEmptyDescription')}
      />
    )
  }

  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="h-72 min-h-0 overflow-hidden rounded-lg border border-[#e3edf6] lg:h-full">
        <ResourceSidebar
          items={virtualMachines}
          title={t('recovery.sidebar.availableVms')}
          searchPlaceholder={t('recovery.sidebar.searchPlaceholder')}
          loadingLabel={t('recovery.sidebar.loadingVms')}
          noItemsLabel={t('recovery.sidebar.noVmsAvailable')}
          noMatchesLabel={t('recovery.sidebar.noMatching')}
          dragDataKey="vm-name"
          isLoading={isLoading}
          isRetrying={isFetching}
          error={error instanceof Error ? error : null}
          errorTitle={t('pages.virtualMachines.error.title')}
          staleErrorTitle={t('pages.virtualMachines.error.latestFailed')}
          staleErrorDescription={t('pages.virtualMachines.error.showingPrevious')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          onRetry={() => { void refetch() }}
        />
      </div>
      <div className="flex h-72 min-h-0 flex-col rounded-lg border-2 border-dashed border-[#d9e6f1] bg-white p-4 lg:h-full">
        <h2 className="text-base font-semibold text-[#17233d]">{t('pages.recoveryGroupBuilder.resources.title')}</h2>
        <p className="mt-1 text-sm text-[#71819a]">{t('pages.recoveryGroupBuilder.resources.description')}</p>
        <ResourceSelectionCard
          items={resources}
          emptyText={t('pages.recoveryGroupBuilder.resources.empty')}
          removeLabel={t('pages.recoveryGroupBuilder.resources.remove')}
          ariaLabel={t('pages.recoveryGroupBuilder.resources.selectedAriaLabel')}
          dropDataKey="vm-name"
          onResourceDrop={onAdd}
          onResourceRemove={onRemove}
          className="mt-4 h-auto min-h-0 flex-1 rounded-lg border border-[#edf2f7]"
        />
      </div>
    </div>
  )
}
