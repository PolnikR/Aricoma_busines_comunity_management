import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useResourceInventoryQueries } from '../../../hooks/useResourceInventoryQueries'
import { MetricsSkeleton } from '../../skeletons'
import { ResourceInventoryShell } from '../ResourceInventoryShell'
import { ResourceInventoryLoading, ResourceInventoryState } from '../ResourceInventoryStates'
import type { SourceResourcesPageProps } from '../SourceResourcesPageProps'
import { FlashSystemMetrics } from '../SourceInventoryMetrics'
import { FlashSystemInventoryView } from './FlashSystemInventoryView'

export function FlashSystemResourcesPage(props: SourceResourcesPageProps) {
  const {
    providers, providersPending, providersSuccess, providersFetching,
    providersError, onRefetchProviders, providerId, tabs, t,
  } = props
  const sourceProviders = providers.filter((provider) => provider.type === 'FLASHCOPY')
  const sourceQuery = useResourceInventoryQueries(
    providersSuccess ? 'flashsystem' : null,
    providers,
    providerId || undefined,
  )
  const hasData = sourceQuery.flashSystemResources.length > 0
  const requestFailed = sourceQuery.hasProviders && sourceQuery.failures.length > 0 && !hasData
  const sourceLoading = providersSuccess && sourceProviders.length > 0 && sourceQuery.isLoading
  const metrics = providersPending || sourceLoading
    ? <MetricsSkeleton />
    : providersError || sourceProviders.length === 0 || requestFailed
      ? null
      : (
          <FlashSystemMetrics
            resources={sourceQuery.flashSystemResources}
            inventories={sourceQuery.flashSystemInventories}
            labels={{
              total: t('resources.flash.metrics.total'),
              active: t('resources.flash.metrics.online'),
              third: t('resources.flash.metrics.capacity'),
              fourth: t('resources.flash.metrics.free'),
              validated: t('resources.common.validated'),
            }}
            helperLabels={{
              pools: t('resources.flash.metrics.pools'),
              hosts: t('resources.flash.metrics.hosts'),
            }}
          />
        )
  const notice = sourceQuery.failures.length > 0 && !requestFailed ? (
    <FetchErrorAlert
      title={t('resources.common.partialFailure')}
      description={`${t('resources.common.failedProviders')}: ${sourceQuery.failures.map(({ provider }) => provider.name).join(', ')}`}
      isRetrying={sourceQuery.isFetching}
      onRetry={() => { void sourceQuery.refetch() }}
    />
  ) : null

  let content
  if (providersPending) {
    content = <ResourceInventoryLoading ariaLabel={t('providers.loading')} />
  } else if (providersError) {
    content = (
      <ResourceInventoryState>
        <FetchErrorAlert
          title={t('providers.loadFailed')}
          description={t('providers.loadFailed')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={providersFetching}
          onRetry={onRefetchProviders}
        />
      </ResourceInventoryState>
    )
  } else if (sourceProviders.length === 0) {
    content = (
      <ResourceInventoryState>
        <EmptyState title={t('resources.common.noProviderTitle')} description={t('resources.common.noProviderDescription')} />
      </ResourceInventoryState>
    )
  } else if (sourceLoading) {
    content = <ResourceInventoryLoading ariaLabel={t('status.loading')} />
  } else {
    content = (
      <FlashSystemInventoryView
        resources={sourceQuery.flashSystemResources}
        providers={sourceProviders}
        providerId={providerId ?? sourceProviders[0]?.id ?? ''}
        error={requestFailed ? {
          title: t('resources.common.loadFailed'),
          description: t('resources.common.loadFailed'),
          retryLabel: t('pages.virtualMachines.error.retryButton'),
          isRetrying: sourceQuery.isFetching,
          onRetry: () => { void sourceQuery.refetch() },
        } : null}
        t={t}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.virtualMachines.eyebrow')}
        title={t('resources.flash.title')}
        description={t('resources.flash.description')}
        isFetching={providersFetching || sourceQuery.isFetching}
        onRefresh={() => {
          if (!providersSuccess || sourceProviders.length === 0) onRefetchProviders()
          else void sourceQuery.refetch()
        }}
      />
      <ResourceInventoryShell
        metrics={metrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={t('resources.flash.inventoryDescription')}
        tabs={tabs}
        notice={notice}
      >
        {content}
      </ResourceInventoryShell>
    </div>
  )
}
