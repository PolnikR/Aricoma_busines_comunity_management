import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { ProvidersCatalogueTable } from '../components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../components/ProvidersCreateModal'
import { useProviders } from '../hooks/useProviders'
import type { ProviderRoleFilter } from '../model/providerTypes'

export function ProvidersPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
  const allProvidersQuery = useProviders('all')
  const visibleProvidersQuery = useProviders(roleFilter)
  const providers = visibleProvidersQuery.data ?? []
  const allProviders = allProvidersQuery.data ?? []

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.providers.eyebrow')}
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

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t('pages.providers.infrastructure.title')}
          inventoryDescription={t('pages.providers.infrastructure.description')}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
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
          </div>
        </InventoryShell>
      </div>

      <ProvidersCreateModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingProviders={allProviders}
      />
    </div>
  )
}
