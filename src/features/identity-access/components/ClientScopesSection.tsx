import { useMemo } from 'react'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityResourceDetailPage, IdentityResourceHeader } from './IdentityResourceLayout'

interface ClientScopeSummary {
  id: string
  name: string
  protocol: string
  assignment: string
}

const CLIENT_SCOPE_TABS = [
  { value: 'settings', label: 'Settings' },
  { value: 'mappers', label: 'Mappers' },
  { value: 'scope', label: 'Scope' },
] as const

type ClientScopeTabId = (typeof CLIENT_SCOPE_TABS)[number]['value']

interface ClientScopesSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isClientScopeTab(tabId: IdentityAccessTabId | null): tabId is ClientScopeTabId {
  return CLIENT_SCOPE_TABS.some(tab => tab.value === tabId)
}

export function ClientScopesSection({ entityId, tabId, onEntityChange, onTabChange }: ClientScopesSectionProps) {
  const scopes: ClientScopeSummary[] = []
  const table = useTableState(scopes, { searchFields: ['id', 'name', 'protocol', 'assignment'] })
  const columns = useMemo<ColumnDef<ClientScopeSummary>[]>(() => [
    { id: 'name', header: 'Name', cell: scope => <span className="font-semibold text-text-primary">{scope.name}</span> },
    { id: 'protocol', header: 'Protocol', cell: scope => scope.protocol || '—' },
    { id: 'assignment', header: 'Assigned type', cell: scope => scope.assignment || '—' },
  ], [])

  if (entityId) {
    const activeTab: ClientScopeTabId = isClientScopeTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={entityId}
        description="Keycloak client scope"
        backLabel="Client scopes"
        onBack={() => { onEntityChange(null) }}
        tabs={CLIENT_SCOPE_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Client scope sections"
      >
        <div className="p-4">
          <EmptyState
            title={CLIENT_SCOPE_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab}
            description="The Keycloak client-scope API contract is not connected yet, so mappers and scope mappings are intentionally not fabricated."
          />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader
        eyebrow="Manage"
        title="Client scopes"
        description="Manage reusable protocol mappers and role-scope mappings shared by Keycloak clients."
        actions={<Button size="sm" disabled title="Requires Keycloak client-scope integration">Create client scope</Button>}
      />
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search client scopes" searchLabel="Search client scopes" density={table.density} onDensityChange={table.setDensity} />
      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={scope => scope.id}
        density={table.density}
        ariaLabel="Client scopes"
        onRowClick={scope => { onEntityChange(scope.id) }}
        rowAriaLabel={scope => `Open client scope ${scope.name}`}
        emptyContent={<EmptyState title="No client scopes connected" description="The Keycloak client-scopes endpoint is not connected yet." />}
      />
    </div>
  )
}
