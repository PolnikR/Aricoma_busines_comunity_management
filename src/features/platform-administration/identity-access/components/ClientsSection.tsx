import { useMemo } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { IdentityClientView, IdentityRoleView } from '../services/identityAdminGateway'
import { IdentityContentPanel, IdentityResourceDetailPage, IdentitySettingsSection } from './IdentityResourceLayout'

const CANONICAL_CLIENT_TABS = ['settings', 'keys', 'credentials', 'roles', 'client-scopes', 'authorization', 'service-accounts-roles', 'sessions', 'permissions'] as const
const VISIBLE_CLIENT_TABS = [
  { value: 'settings', label: 'Settings' },
  { value: 'roles', label: 'Roles' },
] as const
type ClientTabId = (typeof CANONICAL_CLIENT_TABS)[number]

interface ClientsSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isClientTab(tabId: IdentityAccessTabId | null): tabId is ClientTabId {
  return CANONICAL_CLIENT_TABS.some(tab => tab === tabId)
}

export function ClientsSection({ entityId, tabId, onEntityChange, onTabChange }: ClientsSectionProps) {
  const { data, isLoading, error } = useIdentityAdminPreview()
  const clients = data?.clients ?? []
  const table = useTableState(clients, { searchFields: ['clientId', 'displayName', 'protocol'] })
  const columns = useMemo<ColumnDef<IdentityClientView>[]>(() => [
    { id: 'id', header: 'Client ID', cell: client => <span className="font-semibold text-text-primary">{client.clientId}</span> },
    { id: 'name', header: 'Display name', cell: client => client.displayName },
    { id: 'protocol', header: 'Protocol', cell: client => client.protocol },
    { id: 'status', header: 'Status', cell: client => <div className="flex flex-wrap gap-2"><Badge color={client.enabled ? 'success' : 'light'} size="sm">{client.enabled ? 'Enabled' : 'Disabled'}</Badge>{client.isPreview ? <Badge color="warning" size="sm">Preview only</Badge> : null}</div> },
  ], [])

  const selectedClient = clients.find(client => client.id === entityId) ?? null
  if (entityId && selectedClient) {
    const activeTab: ClientTabId = isClientTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={selectedClient.displayName}
        description={`${selectedClient.clientId} · Preview only, not deployed configuration`}
        backLabel="Clients"
        onBack={() => { onEntityChange(null) }}
        tabs={VISIBLE_CLIENT_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Client sections"
      >
        {activeTab === 'settings'
          ? <ClientSettings client={selectedClient} />
          : activeTab === 'roles'
            ? <ClientRoles roles={selectedClient.roles} capabilities={data?.capabilities ?? []} />
            : <div className="p-4"><EmptyState title="Integration seam retained" description={`The canonical ${activeTab} deep link remains available for a future backend adapter.`} /></div>}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search clients" searchLabel="Search clients" density={table.density} onDensityChange={table.setDensity} />
      {error
        ? <div className="p-4"><EmptyState title="Clients could not be loaded" description={error.message} /></div>
        : <DataTable
            layout="fit"
            columns={columns}
            rows={table.pageItems}
            rowKey={client => client.id}
            density={table.density}
            ariaLabel="Clients"
            onRowClick={client => { onEntityChange(client.id) }}
            rowAriaLabel={client => `Open client ${client.clientId}`}
            emptyContent={<EmptyState title={isLoading ? 'Loading client preview' : 'No preview clients'} description="Preview client data is provided by the frontend IdentityAdminGateway adapter." />}
          />}
    </IdentityContentPanel>
  )
}

function ClientSettings({ client }: { client: IdentityClientView }) {
  return (
    <IdentitySettingsSection title="Client settings" description="Transport-neutral preview values. No credential material exists in this public-browser design.">
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label="Client ID" htmlFor="client-id"><Input id="client-id" value={client.clientId} readOnly /></Field>
        <Field label="Display name" htmlFor="client-display-name"><Input id="client-display-name" value={client.displayName} readOnly /></Field>
        <Field label="Protocol" htmlFor="client-protocol"><Input id="client-protocol" value={client.protocol} readOnly /></Field>
        <Field label="Root URL" htmlFor="client-root-url"><Input id="client-root-url" value={client.rootUrl} readOnly /></Field>
        <Field label="Home URL" htmlFor="client-home-url"><Input id="client-home-url" value={client.homeUrl} readOnly /></Field>
        <div className="flex min-w-0 flex-wrap items-end gap-2"><Badge color={client.enabled ? 'success' : 'light'}>{client.enabled ? 'Enabled' : 'Disabled'}</Badge><Badge color="info">{client.isPublicClient ? 'Public client' : 'Confidential client'}</Badge><Badge color="warning">Preview only</Badge></div>
      </div>
    </IdentitySettingsSection>
  )
}

function ClientRoles({ roles, capabilities }: { roles: IdentityRoleView[]; capabilities: { id: string; description: string }[] }) {
  const columns = useMemo<ColumnDef<IdentityRoleView>[]>(() => [
    { id: 'name', header: 'Role', cell: role => <span className="font-semibold text-text-primary">{role.name}</span> },
    { id: 'description', header: 'Purpose', cell: role => role.description },
    { id: 'capabilities', header: 'Preview capabilities', cell: role => role.capabilityIds.map(id => capabilities.find(capability => capability.id === id)?.description).filter(Boolean).join(' ') },
  ], [capabilities])
  return <DataTable layout="fit" columns={columns} rows={roles} rowKey={role => role.id} ariaLabel="ABCO client roles" />
}
