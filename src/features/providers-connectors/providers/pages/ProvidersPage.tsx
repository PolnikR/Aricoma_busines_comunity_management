import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { ProvidersCatalogueTable } from '../components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../components/ProvidersCreateModal'
import { useProviders } from '../hooks/useProviders'

export function ProvidersPage() {
  const { t } = useTranslation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: providers = [], isFetching, refetch } = useProviders()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.providers.eyebrow')}
        title={t('pages.providers.title')}
        description={t('pages.providers.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t('pages.providers.addButton')}
          </Button>
        }
      />

      <div className="flex-1 flex flex-col gap-4 lg:min-h-0 overflow-hidden p-3">
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg border border-[#dbe7f2] shadow-sm overflow-hidden">
          <ProvidersCatalogueTable />
        </div>
      </div>

      <ProvidersCreateModal open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false) }} existingProviders={providers} />
    </div>
  )
}
