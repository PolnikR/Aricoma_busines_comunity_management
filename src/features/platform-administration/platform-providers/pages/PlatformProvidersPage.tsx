import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { PlatformProvidersModal } from '../components/PlatformProvidersModal'
import { PlatformProvidersTable } from '../components/PlatformProvidersTable'
import { usePlatformProviders } from '../hooks/usePlatformProviders'

export function PlatformProvidersPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const {
    data: platformProviders = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = usePlatformProviders()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.platformProviders.eyebrow')}
        title={t('pages.platformProviders.title')}
        description={t('pages.platformProviders.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={(
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.platformProviders.addButton')}
          </Button>
        )}
      />

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t('pages.platformProviders.inventoryTitle')}
          inventoryDescription={t('pages.platformProviders.inventoryDescription')}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
            <PlatformProvidersTable
              providers={platformProviders}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              isRetrying={isFetching}
              onRetry={() => { void refetch() }}
            />
          </div>
        </InventoryShell>
      </div>

      <PlatformProvidersModal
        open={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false) }}
        existingProviders={platformProviders}
      />
    </div>
  )
}
