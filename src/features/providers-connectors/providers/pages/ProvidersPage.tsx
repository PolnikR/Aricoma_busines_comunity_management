import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { PlatformProvidersModal } from '../components/PlatformProvidersModal'
import { PlatformProvidersTable } from '../components/PlatformProvidersTable'
import { ProvidersCatalogueTable } from '../components/ProvidersCatalogueTable'
import { ProvidersCreateModal } from '../components/ProvidersCreateModal'
import { usePlatformProviders } from '../hooks/usePlatformProviders'
import { useProviders } from '../hooks/useProviders'

type ProviderTab = 'platform' | 'infrastructure'

export function ProvidersPage() {
  const { t } = useTranslation()
  const [providerTab, setProviderTab] = useState<ProviderTab>('platform')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const {
    data: providers = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useProviders()
  const {
    data: platformProviders = [],
    isLoading: platformProvidersLoading,
    isFetching: platformProvidersFetching,
    error: platformProvidersError,
    refetch: refetchPlatformProviders,
  } = usePlatformProviders()
  const isPlatformTab = providerTab === 'platform'
  const tabs = (
    <Tabs<ProviderTab>
      items={[
        { value: 'platform', label: t('pages.providers.tabs.platform') },
        { value: 'infrastructure', label: t('pages.providers.tabs.infrastructure') },
      ]}
      value={providerTab}
      onChange={setProviderTab}
      ariaLabel={t('pages.providers.tabs.label')}
      className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"
    />
  )

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('pages.providers.eyebrow')}
        title={t('pages.providers.title')}
        description={t('pages.providers.description')}
        isFetching={isPlatformTab ? platformProvidersFetching : isFetching}
        onRefresh={() => {
          if (isPlatformTab) void refetchPlatformProviders()
          else void refetch()
        }}
        actions={
          <Button size="sm" variant="outline" onClick={() => { setIsCreateModalOpen(true) }}>
            {t(isPlatformTab ? 'pages.providers.addPlatformButton' : 'pages.providers.addButton')}
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden p-3 lg:min-h-0">
        <InventoryShell
          inventoryTitle={t(isPlatformTab ? 'pages.providers.platform.title' : 'pages.providers.infrastructure.title')}
          inventoryDescription={t(isPlatformTab ? 'pages.providers.platform.description' : 'pages.providers.infrastructure.description')}
          tabs={tabs}
        >
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:min-h-0">
            {isPlatformTab ? (
              <PlatformProvidersTable
                providers={platformProviders}
                isLoading={platformProvidersLoading}
                error={platformProvidersError instanceof Error ? platformProvidersError : null}
              />
            ) : (
              <ProvidersCatalogueTable
                providers={providers}
                isLoading={isLoading}
                error={error instanceof Error ? error : null}
              />
            )}
          </div>
        </InventoryShell>
      </div>

      {isPlatformTab ? (
        <PlatformProvidersModal
          open={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false) }}
          existingProviders={platformProviders}
        />
      ) : (
        <ProvidersCreateModal
          open={isCreateModalOpen}
          onClose={() => { setIsCreateModalOpen(false) }}
          existingProviders={providers}
        />
      )}
    </div>
  )
}
