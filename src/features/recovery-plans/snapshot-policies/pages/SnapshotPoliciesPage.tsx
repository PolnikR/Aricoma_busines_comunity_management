import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { SnapshotPoliciesTable } from '../components/SnapshotPoliciesTable'
import { SnapshotPolicyModal } from '../components/SnapshotPolicyModal'
import { useSnapshotPolicies } from '../hooks/useSnapshotPolicies'

export function SnapshotPoliciesPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policies = [], isLoading, isFetching, error, refetch } = useSnapshotPolicies()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.snapshotPolicies.eyebrow')}
        title={t('pages.snapshotPolicies.title')}
        description={t('pages.snapshotPolicies.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.snapshotPolicies.addButton')}
          </Button>
        )}
      />

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t('pages.snapshotPolicies.inventoryTitle')}
          inventoryDescription={t('pages.snapshotPolicies.inventoryDescription')}
          tabs={null}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
            <SnapshotPoliciesTable
              policies={policies}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        </InventoryShell>
      </div>

      <SnapshotPolicyModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingPolicies={policies}
      />
    </div>
  )
}
