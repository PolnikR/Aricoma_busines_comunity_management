import { useMemo } from 'react'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityResourceDetailPage, IdentityResourceHeader } from './IdentityResourceLayout'

interface FederationProviderSummary {
  id: string
  name: string
  providerType: string
  priority: number
}

const FEDERATION_TABS = [
  { value: 'settings', label: 'Settings' },
  { value: 'mappers', label: 'Mappers' },
] as const

type FederationTabId = (typeof FEDERATION_TABS)[number]['value']

interface UserFederationSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isFederationTab(tabId: IdentityAccessTabId | null): tabId is FederationTabId {
  return FEDERATION_TABS.some(tab => tab.value === tabId)
}

export function UserFederationSection({ entityId, tabId, onEntityChange, onTabChange }: UserFederationSectionProps) {
  const providers: FederationProviderSummary[] = []
  const table = useTableState(providers, { searchFields: ['name', 'providerType'] })
  const columns = useMemo<ColumnDef<FederationProviderSummary>[]>(() => [
    { id: 'name', header: 'Name', cell: provider => <span className="font-semibold text-text-primary">{provider.name}</span> },
    { id: 'type', header: 'Provider type', cell: provider => provider.providerType },
    { id: 'priority', header: 'Priority', align: 'right', cell: provider => String(provider.priority) },
  ], [])

  if (entityId) {
    const activeTab: FederationTabId = isFederationTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow="Configure"
        title={entityId}
        description="Keycloak user federation provider"
        backLabel="User federation"
        onBack={() => { onEntityChange(null) }}
        tabs={FEDERATION_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="User federation provider sections"
      >
        <div className="p-4"><EmptyState title={FEDERATION_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab} description="Configured federation-provider data is not connected yet." /></div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader
        eyebrow="Configure"
        title="User federation"
        description="Connect Keycloak to external user stores such as LDAP, Active Directory, and Kerberos."
        actions={<div className="flex gap-2"><Button size="sm" variant="outline" disabled title="Requires Keycloak federation integration">Add LDAP</Button><Button size="sm" variant="outline" disabled title="Requires Keycloak federation integration">Add Kerberos</Button></div>}
      />
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search federation providers" searchLabel="Search federation providers" density={table.density} onDensityChange={table.setDensity} />
      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={provider => provider.id}
        density={table.density}
        ariaLabel="User federation providers"
        onRowClick={provider => { onEntityChange(provider.id) }}
        rowAriaLabel={provider => `Open federation provider ${provider.name}`}
        emptyContent={<EmptyState title="No federation providers connected" description="Configured Keycloak federation providers are not available from the current frontend contract." />}
      />
    </div>
  )
}
