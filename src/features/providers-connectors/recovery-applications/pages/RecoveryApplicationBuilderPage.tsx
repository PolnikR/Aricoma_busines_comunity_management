import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { useCreateRecoveryApplication } from '../api/useRecoveryApplications'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const navigate = useNavigate()
  const createMutation = useCreateRecoveryApplication()

  const handleSave = async (appState: RecoveryApplicationFormState) => {
    const applicationData = {
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

    try {
      await createMutation.mutateAsync(applicationData)
      void navigate('/providers-connectors/providers')
    } catch (error) {
      console.error('Failed to save recovery application:', error)
      alert('Failed to save application. Please try again.')
    }
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Create Recovery Application"
        description="Define a new disaster recovery application with tiered VM organization"
        actions={<Button size="sm" variant="outline" onClick={() => void navigate('/providers-connectors/providers')}>Back</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        <RecoveryAppBuilder
          onSave={(appState) => void handleSave(appState)}
          isSaving={createMutation.isPending}
        />
      </div>
    </div>
  )
}
