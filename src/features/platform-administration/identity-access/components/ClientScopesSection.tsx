import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

interface ClientScopeSummary {
  id: string
  name: string
  protocol: string
  assignment: string
}

const CLIENT_SCOPE_TABS = ['settings', 'mappers', 'scope'] as const

type ClientScopeTabId = (typeof CLIENT_SCOPE_TABS)[number]

interface ClientScopesSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isClientScopeTab(tabId: IdentityAccessTabId | null): tabId is ClientScopeTabId {
  return CLIENT_SCOPE_TABS.some(tab => tab === tabId)
}

export function ClientScopesSection({ entityId, tabId, onEntityChange, onTabChange }: ClientScopesSectionProps) {
  const { t } = useTranslation()
  const scopes: ClientScopeSummary[] = []
  const table = useTableState(scopes, { searchFields: ['id', 'name', 'protocol', 'assignment'] })
  const columns = useMemo<ColumnDef<ClientScopeSummary>[]>(() => [
    { id: 'name', header: t('identity.clientScopes.columns.name'), cell: scope => <span className="font-semibold text-text-primary">{scope.name}</span> },
    { id: 'protocol', header: t('identity.clientScopes.columns.protocol'), cell: scope => scope.protocol || '—' },
    { id: 'assignment', header: t('identity.clientScopes.columns.assignment'), cell: scope => scope.assignment || '—' },
  ], [t])
  const tabs = CLIENT_SCOPE_TABS.map(value => ({ value, label: t(`identity.clientScopes.tabs.${value}`) }))

  if (entityId) {
    const activeTab: ClientScopeTabId = isClientScopeTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.manage')}
        title={entityId}
        description={t('identity.clientScopes.detail.description')}
        backLabel={t('identity.navigation.sections.client-scopes')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.clientScopes.tabs.ariaLabel')}
      >
        <div className="p-4">
          <EmptyState
            title={t(`identity.clientScopes.tabs.${activeTab}`)}
            description={t('identity.clientScopes.detail.notConnected')}
          />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('identity.clientScopes.search')}
        searchLabel={t('identity.clientScopes.search')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <DataTable
        layout="fit"
        columns={columns}
        rows={table.pageItems}
        rowKey={scope => scope.id}
        density={table.density}
        ariaLabel={t('identity.navigation.sections.client-scopes')}
        onRowClick={scope => { onEntityChange(scope.id) }}
        rowAriaLabel={scope => t('identity.clientScopes.rowAriaLabel', { name: scope.name })}
        emptyContent={<EmptyState title={t('identity.clientScopes.empty.title')} description={t('identity.clientScopes.empty.description')} />}
      />
    </IdentityContentPanel>
  )
}
