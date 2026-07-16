import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'

export function InfrastructurePage() {
  return (
    <>
      <PageHeader
        eyebrow="Discovery & Inventory"
        title="Infrastructure"
        description="Hosts, clusters, datastores, folders, and derived infrastructure context from the discovery model."
      />
      <EmptyState
        title="Infrastructure inventory is not implemented yet"
        description="The current discovery response is VM-centric. Infrastructure entities will be promoted into a dedicated view after the authoritative backend model is available."
      />
    </>
  )
}