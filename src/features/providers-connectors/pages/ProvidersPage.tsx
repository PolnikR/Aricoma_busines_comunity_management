import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { ProvidersCatalogueTable } from '../providers/components/ProvidersCatalogueTable'

export function ProvidersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Providers & Connectors"
        title="Providers"
        description="Registered providers discovered from the backend."
        actions={
          <Button variant="outline" disabled title="Adding providers is not available in Release 1">
            Add Provider
          </Button>
        }
      />

      <div className="p-6">
        <Card className="overflow-hidden p-0 sm:p-0">
          <ProvidersCatalogueTable />
        </Card>
      </div>
    </>
  )
}
