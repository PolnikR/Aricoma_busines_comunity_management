import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { PolicySetsTable } from '../components/PolicySetsTable'
import { PolicySetModal } from '../components/PolicySetModal'
import { usePolicySets } from '../hooks/usePolicySets'

export function PolicySetsPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policySets = [], isLoading, isFetching, error, refetch } = usePolicySets()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.policySets.eyebrow')}
        title={t('pages.policySets.title')}
        description={t('pages.policySets.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.policySets.addButton')}
          </Button>
        )}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3">
        <InventoryShell
          inventoryTitle={t('pages.policySets.inventoryTitle')}
          inventoryDescription={t('pages.policySets.inventoryDescription')}
          tabs={null}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <PolicySetsTable
              policySets={policySets}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        </InventoryShell>
      </div>

      <PolicySetModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingPolicySets={policySets}
      />
    </div>
  )
}
