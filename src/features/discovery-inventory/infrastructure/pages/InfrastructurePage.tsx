import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useVirtualMachinesUnified } from '@/features/hooks/useVirtualMachinesUnified'
import { InfrastructureTopologySkeleton } from '../components/InfrastructureTopologySkeleton'
import { InfrastructureTopologyWorkspace } from '../components/InfrastructureTopologyWorkspace'

export function InfrastructurePage() {
  const { topology: data, error, isLoading: isPending, isFetching, refetch } = useVirtualMachinesUnified()

  if (isPending) {
    return (
      <div className="flex min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Discovery & Inventory"
          title="Infrastructure"
          description="Explore discovered cluster, host, virtual machine, and datastore relationships."
        />
        <InfrastructureTopologySkeleton />
      </div>
    )
  }

  if (!data) {
    const message = error instanceof Error ? error.message : 'Unknown discovery error.'

    return (
      <>
        <PageHeader
          eyebrow="Discovery & Inventory"
          title="Infrastructure"
          description="Explore discovered cluster, host, virtual machine, and datastore relationships."
        />
        <FetchErrorAlert
          title="Infrastructure topology could not be loaded"
          description={message}
          retryLabel="Retry loading"
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
        eyebrow="Discovery & Inventory"
        title="Infrastructure"
        description="Explore discovered cluster, host, virtual machine, and datastore relationships."
        actions={(
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={refetch}
          >
            {isFetching ? 'Refreshing' : 'Refresh inventory'}
          </Button>
        )}
      />

      {error ? (
        <FetchErrorAlert
          className="mb-4"
          title="Latest request failed"
          description="Showing the previous successful topology."
          isRetrying={isFetching}
          onRetry={refetch}
        />
      ) : null}

      {data.nodes.length > 0 ? (
        <InfrastructureTopologyWorkspace topology={data} />
      ) : (
        <EmptyState
          title="No infrastructure discovered"
          description="The discovery response does not contain infrastructure records."
        />
      )}
    </div>
  )
}
