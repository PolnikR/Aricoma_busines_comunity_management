import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { useVirtualMachinesUnified } from '@/features/hooks/useVirtualMachinesUnified'
import { InfrastructureTopologySkeleton } from '../components/InfrastructureTopologySkeleton'
import { InfrastructureTopologyWorkspace } from '../components/InfrastructureTopologyWorkspace'

export function InfrastructurePage() {
  const { t } = useTranslation()
  const { topology: data, error, isLoading: isPending, isFetching, refetch } = useVirtualMachinesUnified()

  if (isPending) {
    return (
      <div className="flex min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow={t('pages.infrastructure.eyebrow')}
          title={t('pages.infrastructure.title')}
          description={t('pages.infrastructure.description')}
        />
        <InfrastructureTopologySkeleton />
      </div>
    )
  }

  if (!data) {
    const message = error instanceof Error ? error.message : t('messages.unknownError')

    return (
      <>
        <PageHeader
          eyebrow={t('pages.infrastructure.eyebrow')}
          title={t('pages.infrastructure.title')}
          description={t('pages.infrastructure.description')}
        />
        <FetchErrorAlert
          title={t('pages.infrastructure.error.title')}
          description={message}
          retryLabel={t('pages.infrastructure.error.retryButton')}
          variant="full"
          isRetrying={isFetching}
          onRetry={refetch}
        />
      </>
    )
  }

  return (
    <div className="flex flex-1 min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.infrastructure.eyebrow')}
        title={t('pages.infrastructure.title')}
        description={t('pages.infrastructure.description')}
        actions={(
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={refetch}
          >
            {isFetching ? t('buttons.refreshing') : t('buttons.refreshInventory')}
          </Button>
        )}
      />

      {error ? (
        <FetchErrorAlert
          className="mb-4"
          title={t('pages.infrastructure.latestRequestFailed')}
          description={t('pages.infrastructure.showingPrevious')}
          isRetrying={isFetching}
          onRetry={refetch}
        />
      ) : null}

      {data.nodes.length > 0 ? (
        <InfrastructureTopologyWorkspace topology={data} />
      ) : (
        <EmptyState
          title={t('pages.infrastructure.empty.title')}
          description={t('pages.infrastructure.empty.description')}
        />
      )}
    </div>
  )
}
