import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { ProvidersCatalogueTable } from '../components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../components/ProvidersCreateModal'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '../model/selectProviders'
import type { ProviderRoleFilter } from '../model/providerTypes'

export function ProvidersPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
  const allProvidersQuery = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const visibleProvidersQuery = useGetProviders({ role: roleFilter }, { query: { select: selectProviders } })
  const providers = visibleProvidersQuery.data ?? []
  const allProviders = allProvidersQuery.data ?? []

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        title={t('pages.providers.title')}
        description={t('pages.providers.description')}
        isFetching={visibleProvidersQuery.isFetching}
        onRefresh={() => { void visibleProvidersQuery.refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.providers.addButton')}
          </Button>
        )}
      />

      <InventoryShell
        inventoryTitle={t('pages.providers.infrastructure.title')}
        inventoryDescription={t('pages.providers.infrastructure.description')}
      >
        <ProvidersCatalogueTable
          providers={providers}
          allProviders={allProviders}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          isLoading={visibleProvidersQuery.isLoading}
          error={visibleProvidersQuery.error instanceof Error ? visibleProvidersQuery.error : null}
          isRetrying={visibleProvidersQuery.isFetching}
          onRetry={() => { void visibleProvidersQuery.refetch() }}
        />
      </InventoryShell>

      <ProvidersCreateModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingProviders={allProviders}
      />
    </div>
  )
}
