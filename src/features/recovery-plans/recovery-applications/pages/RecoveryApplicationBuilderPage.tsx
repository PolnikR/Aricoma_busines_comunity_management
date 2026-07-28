import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useSubmitRecoveryApplication } from '../api/useRecoveryApplications'
import type { RecoveryApplicationData, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const submitApplication = useSubmitRecoveryApplication()

  const handleSave = (appState: RecoveryApplicationFormState): void => {
    const applicationData: RecoveryApplicationData = {
      application: {
        name: appState.name,
        description: appState.description,
        environment: appState.environment,
        platform: 'VMware vCenter ESXi' as const,
        source_connection: 'vcenter_default' as const,
        target_connection: 'vcenter_default_destination' as const,
        tiers: Object.fromEntries(
          Array.from(appState.tiers.entries()).map(([id, tier]) => [id, tier])
        ),
      },
    }

    submitApplication.mutate(applicationData, {
      onSuccess: () => {
        void navigate('/recovery-plans/recovery-applications')
      },
    })
  }

  const handleBackClick = (): void => {
    void navigate('/recovery-plans/recovery-applications')
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Recovery Plans"
        title="Create Recovery Application"
        description="Define a new disaster recovery application with tiered VM organization"
        actions={<Button size="sm" variant="outline" onClick={handleBackClick}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        {submitApplication.error ? (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
            {submitApplication.error instanceof Error
              ? submitApplication.error.message
              : 'Failed to submit recovery application.'}
          </div>
        ) : null}
        <RecoveryAppBuilder
          onSave={handleSave}
          isSaving={submitApplication.isPending}
        />
      </div>
    </div>
  )
}
