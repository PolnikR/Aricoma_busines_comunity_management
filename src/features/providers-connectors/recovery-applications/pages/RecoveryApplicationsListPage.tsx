import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { RecoveryApplicationsTable } from '../components/RecoveryApplicationsTable'
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog'
import { useRecoveryApplications, useDeleteRecoveryApplication } from '../api/useRecoveryApplications'

export function RecoveryApplicationsListPage() {
  const navigate = useNavigate()
  const { data: applications, isLoading, error, refetch } = useRecoveryApplications()
  const deleteApplicationMutation = useDeleteRecoveryApplication()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const handleEdit = (id: string) => {
    void navigate(`/providers-connectors/recovery-applications/${id}/edit`)
  }

  const handleDelete = (id: string): void => {
    const app = applications?.find(a => a.id === id)
    if (app) {
      setDeleteTarget({ id, name: app.data.application.name })
    }
  }

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteTarget) return
    await deleteApplicationMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleDeleteCancel = (): void => {
    setDeleteTarget(null)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Recovery Applications"
          description="Manage disaster recovery application definitions and test recovery workflows."
          actions={
            <Button onClick={() => { void navigate('/providers-connectors/recovery-applications/create') }}>
              Create Application
            </Button>
          }
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading recovery applications...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Providers & Connectors"
          title="Recovery Applications"
          description="Manage disaster recovery application definitions and test recovery workflows."
        />
        <div className="flex-1 p-6">
          <FetchErrorAlert
            title="Recovery applications could not be loaded"
            description={error instanceof Error ? error.message : 'Unknown error'}
            retryLabel="Retry loading"
            variant="full"
            onRetry={() => { void refetch() }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Recovery Applications"
        description="Manage disaster recovery application definitions and test recovery workflows."
        actions={
          <Button onClick={() => { void navigate('/providers-connectors/providers-connectors/recovery-applications/create') }}>
            Create Application
          </Button>
        }
      />

      <div className="flex-1 p-6 lg:min-h-0 overflow-auto">
        {!applications || applications.length === 0 ? (
          <EmptyState
            title="No recovery applications defined yet"
            description="Create your first recovery application to start managing disaster recovery workflows."
            action={
              <Button onClick={() => { void navigate('/providers-connectors/providers-connectors/recovery-applications/create') }}>
                Create Your First Application
              </Button>
            }
          />
        ) : (
          <div className="bg-white rounded-lg border border-[#e3edf6] overflow-hidden">
            <RecoveryApplicationsTable
              applications={applications}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        itemName={deleteTarget?.name ?? ''}
        isOpen={deleteTarget !== null}
        isLoading={deleteApplicationMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  )
}
