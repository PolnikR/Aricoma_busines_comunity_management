import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PageHeader } from '@/shared/components/page/PageHeader'

export function PlatformAdministrationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Platform Administration"
        title="Platform administration"
        description="Administration area for users, roles, operational settings, and platform-level governance."
      />
      <EmptyState
        title="Platform administration is not implemented yet"
        description="This section is visible in the navigation because it belongs to the first ABCO information architecture slice. Detailed administration workflows will be added after the Discovery foundation is stable."
      />
    </>
  )
}