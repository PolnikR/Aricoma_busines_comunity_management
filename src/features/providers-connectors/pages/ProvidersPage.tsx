import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { ProvidersCatalogueTable } from '../providers/components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../providers/components/ProvidersCreateModal'
import { useProviders } from '../providers/api/useProviders'

export function ProvidersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { data: providers = [] } = useProviders()

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Providers"
        description="Registered providers discovered from the backend."
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
