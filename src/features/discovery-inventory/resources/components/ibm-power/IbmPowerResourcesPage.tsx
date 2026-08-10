import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useResourceInventoryQueries } from '../../../hooks/useResourceInventoryQueries'
import { MetricsSkeleton } from '../../skeletons'
import { ResourceInventoryShell } from '../ResourceInventoryShell'
import { ResourceInventoryLoading, ResourceInventoryState } from '../ResourceInventoryStates'
import type { SourceResourcesPageProps } from '../SourceResourcesPageProps'
import { PowerMetrics } from '../SourceInventoryMetrics'
import { PowerInventoryView } from './PowerInventoryView'

export function IbmPowerResourcesPage(props: SourceResourcesPageProps) {
  const {
    providers, providersPending, providersSuccess, providersFetching,
    providersError, onRefetchProviders, providerId, tabs, t,
  } = props
  const sourceProviders = providers.filter((provider) => provider.type === 'IBM_POWER')
  const sourceQuery = useResourceInventoryQueries(
    providersSuccess ? 'ibm-power' : null,
    providers,
    providerId ?? undefined,
  )
  const hasData = sourceQuery.powerResources.length > 0
  const requestFailed = sourceQuery.hasProviders && sourceQuery.failures.length > 0 && !hasData
  const sourceLoading = providersSuccess && sourceProviders.length > 0 && sourceQuery.isLoading
  const metrics = providersPending || sourceLoading
    ? <MetricsSkeleton />
    : providersError || sourceProviders.length === 0 || requestFailed
      ? null
      : (
          <PowerMetrics
            resources={sourceQuery.powerResources}
            labels={{
              total: t('resources.power.metrics.total'),
              active: t('resources.power.metrics.running'),
              third: t('resources.power.metrics.lpar'),
              fourth: t('resources.power.metrics.vios'),
              validated: t('resources.common.validated'),
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
      <PowerInventoryView
        resources={sourceQuery.powerResources}
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
        title={t('resources.power.title')}
        description={t('resources.power.description')}
        isFetching={providersFetching || sourceQuery.isFetching}
        onRefresh={() => {
          if (!providersSuccess || sourceProviders.length === 0) onRefetchProviders()
          else void sourceQuery.refetch()
        }}
      />
      <ResourceInventoryShell
        metrics={metrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={t('resources.power.inventoryDescription')}
        tabs={tabs}
        notice={notice}
      >
        {content}
      </ResourceInventoryShell>
    </div>
  )
}
