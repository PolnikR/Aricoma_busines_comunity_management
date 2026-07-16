import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'

export function ProvidersConnectorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Providers and connectors"
        description="Configuration area for VMware, infrastructure providers, discovery connectors, and future integration endpoints."
      />
      <EmptyState
        title="Provider configuration is not implemented yet"
        description="The first functional vertical slice uses a controlled VMware discovery fixture. Provider setup will be introduced once the backend contract is confirmed."
      />
    </>
  )
}