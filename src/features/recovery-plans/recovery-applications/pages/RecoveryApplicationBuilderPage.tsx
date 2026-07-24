import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useSubmitRecoveryApplication } from '../api/useRecoveryApplications'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const navigate = useNavigate()
  const submitMutation = useSubmitRecoveryApplication()

  const handleSave = async (appState: RecoveryApplicationFormState) => {
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
          Array.from(appState.tiers.entries()).map(([id, tier]) => [id, tier])
        ),
      },
    }

    try {
      await submitMutation.mutateAsync(applicationData)
      void navigate('/recovery-plans/recovery-applications')
    } catch (error) {
      console.error('Failed to submit recovery application:', error)
      const message = error instanceof Error ? error.message : String(error)
      alert(`Failed to submit application to recovery orchestration.\n\n${message}`)
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <div className="relative">
        <PageHeader
          eyebrow="Recovery Plans"
          title="Create Recovery Application"
          description="Define a new disaster recovery application with tiered VM organization"
        />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-3">
          <Button size="sm" variant="outline" onClick={() => void navigate('/recovery-plans/recovery-applications')}>Back</Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col lg:min-h-0">
        <RecoveryAppBuilder
          onSave={(appState) => void handleSave(appState)}
          isSaving={submitMutation.isPending}
        />
      </div>
    </div>
  )
}
