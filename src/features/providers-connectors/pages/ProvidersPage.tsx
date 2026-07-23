import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
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

      <div className="flex flex-1 flex-col lg:min-h-0">
        <Card className="overflow-hidden p-0 sm:p-0">
          <ProvidersCatalogueTable />
        </Card>
      </div>

      <ProvidersCreateModal open={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false) }} existingProviders={providers} />
    </div>
  )
}
