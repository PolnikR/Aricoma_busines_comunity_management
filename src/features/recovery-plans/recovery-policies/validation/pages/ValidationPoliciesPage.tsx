import { useNavigate } from 'react-router'
import { useTranslation } from '@/hooks/useTranslation'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import type { TabItem } from '@/shared/components/tabs/Tabs'
import { RecoveryPolicyPageShell } from '../../components/RecoveryPolicyPageShell'
import { getRecoveryPolicyPath, type RecoveryPolicyTab } from '../../model/recoveryPolicyNavigation'

export function ValidationPoliciesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const policyTabs: readonly TabItem<RecoveryPolicyTab>[] = [
    { value: 'snapshot', label: t('recoveryPolicies.tabs.snapshot') },
    { value: 'validation', label: t('recoveryPolicies.tabs.validation') },
    { value: 'application-recovery', label: t('recoveryPolicies.tabs.applicationRecovery') },
  ]

  return (
    <RecoveryPolicyPageShell
      activeTab="validation"
      tabs={policyTabs}
      onTabChange={(tab) => { void navigate(getRecoveryPolicyPath(tab)) }}
      tabsAriaLabel={t('recoveryPolicies.tabs.label')}
      eyebrow={t('recoveryPolicies.eyebrow')}
      title={t('recoveryPolicies.title')}
      description={t('recoveryPolicies.description')}
      inventoryTitle={t('recoveryPolicies.validation.inventoryTitle')}
      inventoryDescription={t('recoveryPolicies.validation.inventoryDescription')}
    >
      <div className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
        <Card className="w-full max-w-2xl">
          <CardTitle>{t('recoveryPolicies.validation.pendingTitle')}</CardTitle>
          <CardDescription>{t('recoveryPolicies.validation.pendingDescription')}</CardDescription>
        </Card>
      </div>
    </RecoveryPolicyPageShell>
  )
}
