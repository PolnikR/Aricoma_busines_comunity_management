import { useState } from 'react'
import { usePostDeleteRefresh } from '../../hooks/usePostDeleteRefresh'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { PolicySetsTable } from '../components/PolicySetsTable'
import { PolicySetModal } from '../components/PolicySetModal'
import { useGetPolicySets } from '@/generated/query/policy-sets/policy-sets.gen'
import { selectPolicySets } from '../model/selectPolicySets'
import styles from './PolicySetsPage.module.css'
import { cn } from '@/shared/utils/cn'

export function PolicySetsPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: policySets = [], isLoading, isFetching, error, refetch } = useGetPolicySets({
    query: { select: selectPolicySets },
  })
  const postDelete = usePostDeleteRefresh(() => refetch({ cancelRefetch: false, throwOnError: false }))

  return (
    <div className={cn(styles.page, 'flex min-h-full flex-col lg:h-full lg:min-h-0')}>
      <TableToolbar
        title={t('pages.policySets.title')}
        description={t('pages.policySets.description')}
        isFetching={isFetching}
        onRefresh={() => { void postDelete.refresh() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.policySets.addButton')}
          </Button>
        )}
      />

      <InventoryShell
        inventoryTitle={t('pages.policySets.inventoryTitle')}
        inventoryDescription={t('pages.policySets.inventoryDescription')}
        tabs={null}
      >
        <PolicySetsTable
          policySets={policySets}
          postDeletePhase={postDelete.phase}
          onDeleted={postDelete.afterDelete}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          isRetrying={isFetching}
          onRetry={() => { void postDelete.refresh() }}
        />
      </InventoryShell>

      <PolicySetModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingPolicySets={policySets}
      />
    </div>
  )
}
