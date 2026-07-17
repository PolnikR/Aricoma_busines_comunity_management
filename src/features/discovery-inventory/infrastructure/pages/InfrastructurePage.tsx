import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useInfrastructureTopology } from '../api/useInfrastructureTopology'
import { InfrastructureTopologySkeleton } from '../components/InfrastructureTopologySkeleton'
import { InfrastructureTopologyWorkspace } from '../components/InfrastructureTopologyWorkspace'

export function InfrastructurePage() {
  const { data, error, isPending, isFetching, refetch } = useInfrastructureTopology()

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
        <EmptyState
          title="Infrastructure topology could not be loaded"
          description={message}
          action={<Button onClick={() => { void refetch() }}>Retry loading</Button>}
        />
      </>
    )
  }

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Discovery & Inventory"
        title="Infrastructure"
        description="Explore discovered cluster, host, virtual machine, and datastore relationships."
        actions={(
          <Button
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => { void refetch() }}
          >
            {isFetching ? 'Refreshing' : 'Refresh inventory'}
          </Button>
        )}
      />

      {error ? (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
          <span>Latest request failed. Showing the previous successful topology.</span>
          <button type="button" className="font-medium underline" onClick={() => { void refetch() }}>
            Retry
          </button>
        </div>
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
