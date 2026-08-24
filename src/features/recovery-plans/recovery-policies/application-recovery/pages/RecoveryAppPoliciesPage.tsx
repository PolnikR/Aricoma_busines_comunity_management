import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'
import type { TabItem } from '@/shared/components/tabs/Tabs'
import { RecoveryPolicyPageShell } from '../../components/RecoveryPolicyPageShell'
import { getRecoveryPolicyPath, type RecoveryPolicyTab } from '../../model/recoveryPolicyNavigation'
import { RecoveryAppPoliciesTable } from '../components/RecoveryAppPoliciesTable'
import { RecoveryAppPolicyModal } from '../components/RecoveryAppPolicyModal'
import { useRecoveryAppPolicies } from '../hooks/useRecoveryAppPolicies'

export function RecoveryAppPoliciesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policies = [], isLoading, isFetching, error, refetch } = useRecoveryAppPolicies()
  const policyTabs: readonly TabItem<RecoveryPolicyTab>[] = [
    { value: 'snapshot', label: t('recoveryPolicies.tabs.snapshot') },
    { value: 'application-recovery', label: t('recoveryPolicies.tabs.applicationRecovery') },
    { value: 'clean-room', label: t('recoveryPolicies.tabs.cleanRoom') },
  ]

  return (
    <>
      <RecoveryPolicyPageShell
        activeTab="application-recovery"
        tabs={policyTabs}
        onTabChange={(tab) => { void navigate(getRecoveryPolicyPath(tab)) }}
        tabsAriaLabel={t('recoveryPolicies.tabs.label')}
        eyebrow={t('recoveryPolicies.eyebrow')}
        title={t('recoveryPolicies.title')}
        description={t('recoveryPolicies.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={<Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>{t('pages.recoveryAppPolicies.addButton')}</Button>}
        inventoryTitle={t('pages.recoveryAppPolicies.inventoryTitle')}
        inventoryDescription={t('pages.recoveryAppPolicies.inventoryDescription')}
      >
        <RecoveryAppPoliciesTable
          policies={policies}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          isRetrying={isFetching}
          onRetry={() => { void refetch() }}
        />
      </RecoveryPolicyPageShell>

      <RecoveryAppPolicyModal open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false) }} existingPolicies={policies} />
    </>
  )
}
