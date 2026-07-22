import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useRecoveryApplications } from '../api/useRecoveryApplications'

export function RecoveryApplicationsListPage() {
  const { data: applications, isLoading, error } = useRecoveryApplications()

  if (isLoading) {
    return (
      <>
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Recovery Applications"
          description="Manage disaster recovery application definitions"
        />
        <div className="p-6">Loading recovery applications...</div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Recovery Applications"
          description="Manage disaster recovery application definitions"
        />
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Failed to load recovery applications
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Recovery Applications"
        description="Manage disaster recovery application definitions"
        actions={
          <Link to="/recovery-applications/create">
            <Button>Create Application</Button>
          </Link>
        }
      />

      <div className="p-6">
        {!applications || applications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No recovery applications defined yet</p>
            <Link to="/recovery-applications/create">
              <Button>Create Your First Application</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">{app.data.application.name}</h3>
                <p className="text-gray-600 text-sm">{app.data.application.description}</p>
                <div className="mt-2 flex gap-2">
                  <Link to={`/recovery-applications/${app.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
