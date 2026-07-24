import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import type { RecoveryApplication, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const navigate = useNavigate()

  const handleSave = (appState: RecoveryApplicationFormState): void => {
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

    // Save to mock server data (localStorage)
    const mockApplicationsStr = localStorage.getItem('mockRecoveryApplications') ?? '[]'
    const mockApplications: RecoveryApplication[] = JSON.parse(mockApplicationsStr) as RecoveryApplication[]
    const now = new Date().toISOString()
    mockApplications.push({
      id: `app_${String(Date.now())}`,
      data: applicationData,
      createdAt: now,
      updatedAt: now,
    })
    localStorage.setItem('mockRecoveryApplications', JSON.stringify(mockApplications))

    // Navigate after saving
    void setTimeout(() => {
      void navigate('/recovery-plans/recovery-applications')
    }, 0)
  }

  const handleBackClick = (): void => {
    void navigate('/recovery-plans/recovery-applications')
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
          <Button size="sm" variant="outline" onClick={handleBackClick}>Back</Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col lg:min-h-0">
        <RecoveryAppBuilder
          onSave={handleSave}
          isSaving={false}
        />
      </div>
    </div>
  )
}
