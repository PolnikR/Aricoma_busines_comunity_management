import { useMemo } from 'react'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

interface ClientSummary {
  id: string
  name: string
  protocol: string
  homeUrl: string
}

const CLIENT_TABS = [
  { value: 'settings', label: 'Settings' },
  { value: 'keys', label: 'Keys' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'roles', label: 'Roles' },
  { value: 'client-scopes', label: 'Client scopes' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'service-accounts-roles', label: 'Service accounts roles' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'permissions', label: 'Permissions' },
] as const

type ClientTabId = (typeof CLIENT_TABS)[number]['value']

interface ClientsSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isClientTab(tabId: IdentityAccessTabId | null): tabId is ClientTabId {
  return CLIENT_TABS.some(tab => tab.value === tabId)
}

export function ClientsSection({ entityId, tabId, onEntityChange, onTabChange }: ClientsSectionProps) {
  const clients: ClientSummary[] = []
  const table = useTableState(clients, { searchFields: ['id', 'name', 'protocol'] })
  const columns = useMemo<ColumnDef<ClientSummary>[]>(() => [
    { id: 'id', header: 'Client ID', cell: client => <span className="font-semibold text-text-primary">{client.id}</span> },
    { id: 'name', header: 'Name', cell: client => client.name || '—' },
    { id: 'protocol', header: 'Protocol', cell: client => client.protocol || '—' },
    { id: 'homeUrl', header: 'Home URL', cell: client => client.homeUrl || '—' },
  ], [])

  if (entityId) {
    const activeTab: ClientTabId = isClientTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={entityId}
        description="Keycloak client"
        backLabel="Clients"
        onBack={() => { onEntityChange(null) }}
        tabs={CLIENT_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Client sections"
        actions={<Button size="sm" variant="outline" disabled title="Requires Keycloak client integration">Actions</Button>}
      >
        <div className="p-4">
          <EmptyState
            title={CLIENT_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab}
            description="The Keycloak client API contract is not connected yet, so client configuration is intentionally not fabricated."
          />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search clients" searchLabel="Search clients" density={table.density} onDensityChange={table.setDensity} />
      <DataTable
        layout="fit"
        columns={columns}
        rows={table.pageItems}
        rowKey={client => client.id}
        density={table.density}
        ariaLabel="Clients"
        onRowClick={client => { onEntityChange(client.id) }}
        rowAriaLabel={client => `Open client ${client.id}`}
        emptyContent={<EmptyState title="No clients connected" description="The Keycloak clients endpoint is not connected yet." />}
      />
    </IdentityContentPanel>
  )
}
