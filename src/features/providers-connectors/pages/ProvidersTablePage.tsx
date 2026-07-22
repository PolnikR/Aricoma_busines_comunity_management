import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useRecoveryApplications } from '../recovery-applications/api/useRecoveryApplications'
import { RecoveryApplicationsTable } from '../recovery-applications/components/RecoveryApplicationsTable'

export function ProvidersTablePage() {
  const { data: applications, isLoading, error } = useRecoveryApplications()

  if (isLoading) {
    return (
      <>
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Providers"
          description="Provider registry workspace"
          actions={
            <Link to="/providers-connectors/recovery-applications/create">
              <Button>Create Application</Button>
            </Link>
          }
        />
        <div className="p-6">Loading applications...</div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Providers"
          description="Provider registry workspace"
          actions={
            <Link to="/providers-connectors/recovery-applications/create">
              <Button>Create Application</Button>
            </Link>
          }
        />
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Failed to load applications
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Providers"
        description="Provider registry workspace"
        actions={
          <Link to="/providers-connectors/recovery-applications/create">
            <Button>Create Application</Button>
          </Link>
        }
      />

      <div className="p-6">
        <Card className="overflow-hidden">
          <RecoveryApplicationsTable applications={applications ?? []} />
        </Card>
      </div>
    </>
  )
}
