import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { ProvidersCatalogueTable } from '../providers/components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../providers/components/ProvidersCreateModal'
import { useProviders } from '../providers/api/useProviders'
import type { TableDensity } from '@/shared/components/data-table'

export function ProvidersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [density, setDensity] = useState<TableDensity>('compact')
  const { data: providers = [], isFetching, refetch } = useProviders()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow="Providers & Connectors"
        title="Providers"
        description="Registered providers discovered from the backend."
        density={density}
        onDensityChange={setDensity}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        actions={
          <Button variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            Add Provider
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
