import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppBuilder } from '../components/RecoveryAppBuilder'
import { recoveryApplicationsQueryKey } from '../api/useRecoveryApplications'
import type { RecoveryApplication, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

export function RecoveryApplicationBuilderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
    const newApp: RecoveryApplication = {
      id: `app_${String(Date.now())}`,
      data: applicationData,
      createdAt: now,
      updatedAt: now,
    }
    mockApplications.push(newApp)
    localStorage.setItem('mockRecoveryApplications', JSON.stringify(mockApplications))

    // Log saved JSON for verification
    console.log('Application saved to localStorage:', JSON.stringify(newApp, null, 2))

    // Invalidate React Query cache to update list immediately
    void queryClient.invalidateQueries({ queryKey: recoveryApplicationsQueryKey })

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
      <PageHeader
        eyebrow="Recovery Plans"
        title="Create Recovery Application"
        description="Define a new disaster recovery application with tiered VM organization"
        actions={<Button size="sm" variant="outline" onClick={handleBackClick}>{t('buttons.back')}</Button>}
      />
      <div className="flex flex-1 flex-col lg:min-h-0">
        <RecoveryAppBuilder
          onSave={handleSave}
          isSaving={false}
        />
      </div>
    </div>
  )
}
