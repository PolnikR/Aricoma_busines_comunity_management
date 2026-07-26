import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useRecoveryApplication, useUpdateRecoveryApplication } from '../api/useRecoveryApplications'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: application, isLoading, error } = useRecoveryApplication(id ?? '')
  const updateMutation = useUpdateRecoveryApplication(id ?? '')

  if (!id) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Recovery Plans"
          title="Edit Recovery Application"
          description="Modify disaster recovery application configuration"
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-red-600">Application ID not found</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Recovery Plans"
          title="Edit Recovery Application"
          description="Modify disaster recovery application configuration"
          actions={<Button variant="outline" disabled>Back</Button>}
        />
        <div className="flex-1 p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading application...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <PageHeader
          eyebrow="Recovery Plans"
          title="Edit Recovery Application"
          description="Modify disaster recovery application configuration"
          actions={<Button variant="outline" onClick={() => { void navigate('/recovery-plans/recovery-applications') }}>Back</Button>}
        />
        <div className="flex-1 p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Failed to load application. {error instanceof Error ? error.message : ''}
          </div>
        </div>
      </div>
    )
  }

  const handleSave = async (appState: RecoveryApplicationFormState): Promise<void> => {
    const applicationData = {
      application: {
        name: appState.name,
        description: appState.description,
        environment: appState.environment,
        provider_id: appState.provider,
        platform: 'VMware vCenter ESXi' as const,
        source_connection: 'vcenter_default' as const,
        target_connection: 'vcenter_default_destination' as const,
        tiers: Object.fromEntries(
          Array.from(appState.tiers.entries()).map(([tierId, tier]) => [tierId, tier])
        ),
      },
    }

    try {
      await updateMutation.mutateAsync(applicationData)
      void navigate('/recovery-plans/recovery-applications')
    } catch (err) {
      console.error('Failed to update recovery application:', err)
      alert('Failed to update application. Please try again.')
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Recovery Plans"
        title="Edit Recovery Application"
        description="Modify disaster recovery application configuration"
        actions={<Button variant="outline" onClick={() => { void navigate('/recovery-plans/recovery-applications') }}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        <RecoveryAppBuilder
          initialData={{
            name: application.data.application.name,
            description: application.data.application.description,
            environment: application.data.application.environment,
            provider: application.data.application.provider_id,
            tiers: new Map(Object.entries(application.data.application.tiers)),
          }}
          onSave={(appState) => { void handleSave(appState) }}
          isSaving={updateMutation.isPending}
        />
      </div>
    </div>
  )
}
