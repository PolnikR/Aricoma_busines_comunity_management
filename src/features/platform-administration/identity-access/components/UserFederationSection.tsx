import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

interface FederationProviderSummary {
  id: string
  name: string
  providerType: string
  priority: number
}

const FEDERATION_TABS = ['settings', 'mappers'] as const

type FederationTabId = (typeof FEDERATION_TABS)[number]

interface UserFederationSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isFederationTab(tabId: IdentityAccessTabId | null): tabId is FederationTabId {
  return FEDERATION_TABS.some(tab => tab === tabId)
}

export function UserFederationSection({ entityId, tabId, onEntityChange, onTabChange }: UserFederationSectionProps) {
  const { t } = useTranslation()
  const providers: FederationProviderSummary[] = []
  const table = useTableState(providers, { searchFields: ['name', 'providerType'] })
  const columns = useMemo<ColumnDef<FederationProviderSummary>[]>(() => [
    { id: 'name', header: t('identity.federation.columns.name'), cell: provider => <span className="font-semibold text-text-primary">{provider.name}</span> },
    { id: 'type', header: t('identity.federation.columns.type'), cell: provider => provider.providerType },
    { id: 'priority', header: t('identity.federation.columns.priority'), align: 'right', cell: provider => String(provider.priority) },
  ], [t])
  const tabs = FEDERATION_TABS.map(value => ({ value, label: t(`identity.federation.tabs.${value}`) }))

  if (entityId) {
    const activeTab: FederationTabId = isFederationTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.configure')}
        title={entityId}
        description={t('identity.federation.detail.description')}
        backLabel={t('identity.navigation.sections.user-federation')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.federation.tabs.ariaLabel')}
      >
        <div className="p-4"><EmptyState title={t(`identity.federation.tabs.${activeTab}`)} description={t('identity.federation.detail.notConnected')} /></div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder={t('identity.federation.search')} searchLabel={t('identity.federation.search')} density={table.density} onDensityChange={table.setDensity} />
      <DataTable
        layout="fit"
        columns={columns}
        rows={table.pageItems}
        rowKey={provider => provider.id}
        density={table.density}
        ariaLabel={t('identity.federation.ariaLabel')}
        onRowClick={provider => { onEntityChange(provider.id) }}
        rowAriaLabel={provider => t('identity.federation.rowAriaLabel', { name: provider.name })}
        emptyContent={<EmptyState title={t('identity.federation.empty.title')} description={t('identity.federation.empty.description')} />}
      />
    </IdentityContentPanel>
  )
}
