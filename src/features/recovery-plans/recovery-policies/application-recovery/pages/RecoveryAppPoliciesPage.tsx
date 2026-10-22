import { useState } from 'react'
import { usePostDeleteRefresh } from '../../../hooks/usePostDeleteRefresh'
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { useTranslation } from '@/hooks/useTranslation'
import type { TabItem } from '@/shared/components/tabs/Tabs'
import { RecoveryPolicyPageShell } from '../../components/RecoveryPolicyPageShell'
import { getRecoveryPolicyPath, type RecoveryPolicyTab } from '../../model/recoveryPolicyNavigation'
import { RecoveryAppPoliciesTable } from '../components/RecoveryAppPoliciesTable'
import { RecoveryAppPolicyModal } from '../components/RecoveryAppPolicyModal'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { selectRecoveryAppPolicies } from '../model/selectRecoveryAppPolicies'

export function RecoveryAppPoliciesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policies = [], isLoading, isFetching, error, refetch } = useGetRecoveryAppPolicies({
    query: { select: selectRecoveryAppPolicies },
  })
  const postDelete = usePostDeleteRefresh(() => refetch({ cancelRefetch: false, throwOnError: false }))
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
        title={t('recoveryPolicies.title')}
        description={t('recoveryPolicies.description')}
        isFetching={isFetching}
        onRefresh={() => { void postDelete.refresh() }}
        actions={<Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>{t('pages.recoveryAppPolicies.addButton')}</Button>}
        inventoryTitle={t('pages.recoveryAppPolicies.inventoryTitle')}
        inventoryDescription={t('pages.recoveryAppPolicies.inventoryDescription')}
      >
        <RecoveryAppPoliciesTable
          policies={policies}
          postDeletePhase={postDelete.phase}
          onDeleted={postDelete.afterDelete}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          isRetrying={isFetching}
          onRetry={() => { void postDelete.refresh() }}
        />
      </RecoveryPolicyPageShell>

      <RecoveryAppPolicyModal open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false) }} existingPolicies={policies} />
    </>
  )
}
