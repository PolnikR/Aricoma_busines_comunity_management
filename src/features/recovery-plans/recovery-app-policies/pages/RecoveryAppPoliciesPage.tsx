import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { RecoveryAppPoliciesTable } from '../components/RecoveryAppPoliciesTable'
import { RecoveryAppPolicyModal } from '../components/RecoveryAppPolicyModal'
import { useRecoveryAppPolicies } from '../hooks/useRecoveryAppPolicies'

export function RecoveryAppPoliciesPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policies = [], isLoading, isFetching, error, refetch } = useRecoveryAppPolicies()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.recoveryAppPolicies.eyebrow')}
        title={t('pages.recoveryAppPolicies.title')}
        description={t('pages.recoveryAppPolicies.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={<Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>{t('pages.recoveryAppPolicies.addButton')}</Button>}
      />

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t('pages.recoveryAppPolicies.inventoryTitle')}
          inventoryDescription={t('pages.recoveryAppPolicies.inventoryDescription')}
          tabs={null}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
            <RecoveryAppPoliciesTable
              policies={policies}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        </InventoryShell>
      </div>

      <RecoveryAppPolicyModal open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false) }} existingPolicies={policies} />
    </div>
  )
}
