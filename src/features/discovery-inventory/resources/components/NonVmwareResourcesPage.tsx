import type { ReactNode } from 'react'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { useTranslation } from '@/hooks/useTranslation'
import { useResourceInventoryQueries } from '../../hooks/useResourceInventoryQueries'
import { MetricsSkeleton } from '../skeletons'
import { FlashSystemInventoryView } from './FlashSystemInventoryView'
import { PowerInventoryView } from './PowerInventoryView'
import { ResourceInventoryShell } from './ResourceInventoryShell'
import { ResourceInventoryLoading, ResourceInventoryState } from './ResourceInventoryStates'
import { FlashSystemMetrics, PowerMetrics } from './SourceInventoryMetrics'

type Translate = ReturnType<typeof useTranslation>['t']
type SourceTab = 'flashsystem' | 'ibm-power'

interface NonVmwareResourcesPageProps {
  resourceTab: SourceTab
  providers: ProviderRecord[]
  providersPending: boolean
  providersSuccess: boolean
  providersFetching: boolean
  providersError: Error | null
  onRefetchProviders: () => void
  tabs: ReactNode
  t: Translate
}

export function NonVmwareResourcesPage(props: NonVmwareResourcesPageProps) {
  const {
    resourceTab, providers, providersPending, providersSuccess, providersFetching,
    providersError, onRefetchProviders, tabs, t,
  } = props
  const isFlashSystem = resourceTab === 'flashsystem'
  const sourceProviders = providers.filter((provider) => provider.type === (isFlashSystem ? 'FLASHCOPY' : 'IBM_POWER'))
  const sourceQueries = useResourceInventoryQueries(providersSuccess ? resourceTab : null, providers)
  const hasData = isFlashSystem
    ? sourceQueries.flashSystemResources.length > 0
    : sourceQueries.powerResources.length > 0
  const allFailed = sourceQueries.hasProviders && sourceQueries.failures.length === sourceProviders.length && !hasData
  const sourceLoading = providersSuccess && sourceProviders.length > 0 && sourceQueries.isLoading
  const metrics = providersPending || sourceLoading || providersError
    ? <MetricsSkeleton />
    : isFlashSystem
      ? (
          <FlashSystemMetrics
            resources={sourceQueries.flashSystemResources}
            inventories={sourceQueries.flashSystemInventories}
            labels={{
              total: t('resources.flash.metrics.total'), active: t('resources.flash.metrics.online'),
              third: t('resources.flash.metrics.capacity'), fourth: t('resources.flash.metrics.free'),
              validated: t('resources.common.validated'),
            }}
          />
        )
      : (
          <PowerMetrics
            resources={sourceQueries.powerResources}
            labels={{
              total: t('resources.power.metrics.total'), active: t('resources.power.metrics.running'),
              third: t('resources.power.metrics.lpar'), fourth: t('resources.power.metrics.vios'),
              validated: t('resources.common.validated'),
            }}
          />
        )
  const notice = sourceQueries.failures.length > 0 && !allFailed ? (
    <FetchErrorAlert
      title={t('resources.common.partialFailure')}
      description={`${t('resources.common.failedProviders')}: ${sourceQueries.failures.map(({ provider }) => provider.name).join(', ')}`}
      isRetrying={sourceQueries.isFetching}
      onRetry={() => { void sourceQueries.refetch() }}
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
          description={providersError.message}
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
  } else if (allFailed) {
    content = (
      <ResourceInventoryState>
        <FetchErrorAlert
          title={t('resources.common.loadFailed')}
          description={sourceQueries.failures.map(({ error }) => error.message).join('; ')}
          retryLabel={t('pages.virtualMachines.error.retryButton')}
          variant="full"
          isRetrying={sourceQueries.isFetching}
          onRetry={() => { void sourceQueries.refetch() }}
        />
      </ResourceInventoryState>
    )
  } else {
    content = isFlashSystem
      ? <FlashSystemInventoryView resources={sourceQueries.flashSystemResources} providers={sourceProviders} t={t} />
      : <PowerInventoryView resources={sourceQueries.powerResources} providers={sourceProviders} t={t} />
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.virtualMachines.eyebrow')}
        title={t(isFlashSystem ? 'resources.flash.title' : 'resources.power.title')}
        description={t(isFlashSystem ? 'resources.flash.description' : 'resources.power.description')}
        isFetching={providersFetching || sourceQueries.isFetching}
        onRefresh={() => {
          if (!providersSuccess || sourceProviders.length === 0) onRefetchProviders()
          else void sourceQueries.refetch()
        }}
      />
      <ResourceInventoryShell
        metrics={metrics}
        inventoryTitle={t('pages.virtualMachines.inventory.title')}
        inventoryDescription={t(isFlashSystem ? 'resources.flash.inventoryDescription' : 'resources.power.inventoryDescription')}
        tabs={tabs}
        notice={notice}
      >
        {content}
      </ResourceInventoryShell>
    </div>
  )
}
