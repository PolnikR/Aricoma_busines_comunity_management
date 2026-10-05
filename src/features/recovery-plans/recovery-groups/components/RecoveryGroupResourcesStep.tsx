import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components/button/Button'
import { useRecoveryGroupResourceInventory } from '../hooks/useRecoveryGroupResourceInventory'
import type {
  RecoveryGroupProviderScope,
  RecoveryGroupVmMetadata,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

interface RecoveryGroupResourcesStepProps {
  workloadType: RecoveryGroupWorkloadType | null
  providerId: string | null
  /** Fixed scope of the selected provider; omitted while the provider record is unknown. */
  providerScope?: RecoveryGroupProviderScope | null
  resources: string[]
  onAdd: (resource: string) => void
  onRemove: (resource: string) => void
  onMetadataAvailable?: (metadata: Record<string, RecoveryGroupVmMetadata>) => void
  renderItemContent?: ((resource: string) => ReactNode) | undefined
  selectionHint?: ReactNode
  compact?: boolean
  onClear?: () => void
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
  providerScope,
  resources,
  onAdd,
  onRemove,
  onMetadataAvailable,
  renderItemContent,
  selectionHint,
  compact = false,
  onClear,
}: RecoveryGroupResourcesStepProps) {
  const { t } = useTranslation()
  // The provider scope bounds the request; the sidebar search only filters that result locally.
  const query = useRecoveryGroupResourceInventory(
    workloadType,
    providerId,
    providerScope !== undefined ? { providerScope } : {},
  )
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
          {...(compact ? { renderItemAction: (resource: string) => <button type="button" disabled={resources.includes(resource)} aria-label={`${t('buttons.add')}: ${resource}`} onClick={() => { onAdd(resource) }} className="flex size-6 shrink-0 items-center justify-center rounded border border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:text-text-muted">{resources.includes(resource) ? '✓' : '+'}</button> } : {})}
        />
      </div>
      <div className={cn('flex h-72 min-h-0 min-w-0 flex-col rounded-lg border-border bg-surface lg:h-full', compact ? 'overflow-hidden border' : 'border-2 border-dashed p-4')}>
        <div className={cn('flex shrink-0 items-center justify-between gap-2', compact && 'border-b border-border px-3 py-2')}>
          <h2 className={cn('min-w-0 font-semibold text-text-primary', compact ? 'text-sm' : 'text-base')}>{t(key('selectedTitle'))}{compact ? <span className="ml-2 text-xs font-normal text-text-muted">{resources.length}</span> : null}</h2>
          {onClear ? <Button variant="ghost" size="xs" className="shrink-0 whitespace-nowrap" disabled={resources.length === 0} onClick={onClear}>{t('pages.recoveryGroupBuilder.resources.clearSelection')}</Button> : null}
        </div>
        {compact && renderItemContent ? (
          <div className="grid shrink-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_2rem] gap-3 border-b border-border bg-surface-muted px-3 py-1.5 text-xs text-text-secondary">
            <span>{t('pages.recoveryGroupBuilder.resources.sourceVolume')}</span><span>{t('pages.recoveryGroupBuilder.topology.auxiliary')} *</span>
          </div>
        ) : null}
        {!compact ? <><p className="mt-1 text-sm text-text-muted">{t(key('description'))}</p>{selectionHint}</> : null}
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
          className={compact ? 'flex-1' : 'mt-4 h-auto min-h-0 flex-1 rounded-lg border border-border'}
        />
        {compact ? <div className="shrink-0 border-t border-border bg-surface-subtle px-3 py-2 text-xs text-text-muted">{selectionHint ?? t(key('description'))}</div> : null}
      </div>
    </div>
  )
}
