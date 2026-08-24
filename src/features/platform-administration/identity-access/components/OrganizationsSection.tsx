import { useMemo } from 'react'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

interface KeycloakOrganizationListItem {
  id: string
  name: string
  domains: string[]
  memberCount: number
  enabled: boolean
}

const ORGANIZATION_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'domains', label: 'Domains' },
  { value: 'members', label: 'Members' },
  { value: 'groups', label: 'Groups' },
  { value: 'identity-providers', label: 'Identity providers' },
] as const

type OrganizationTabId = (typeof ORGANIZATION_TABS)[number]['value']

interface OrganizationsSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isOrganizationTab(tabId: IdentityAccessTabId | null): tabId is OrganizationTabId {
  return ORGANIZATION_TABS.some(tab => tab.value === tabId)
}

export function OrganizationsSection({ entityId, tabId, onEntityChange, onTabChange }: OrganizationsSectionProps) {
  const organizations: KeycloakOrganizationListItem[] = []
  const table = useTableState(organizations, { searchFields: ['name'] })
  const columns = useMemo<ColumnDef<KeycloakOrganizationListItem>[]>(() => [
    { id: 'name', header: 'Organization', cell: organization => <span className="font-semibold text-text-primary">{organization.name}</span> },
    { id: 'domains', header: 'Domains', cell: organization => organization.domains.length > 0 ? organization.domains.join(', ') : '—' },
    { id: 'members', header: 'Members', align: 'right', cell: organization => String(organization.memberCount) },
    { id: 'status', header: 'Status', cell: organization => organization.enabled ? 'Enabled' : 'Disabled' },
  ], [])

  if (entityId) {
    const activeTab: OrganizationTabId = isOrganizationTab(tabId) ? tabId : 'details'
    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={entityId}
        description="Keycloak organization"
        backLabel="Organizations"
        onBack={() => { onEntityChange(null) }}
        tabs={ORGANIZATION_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Organization sections"
      >
        <div className="p-4">
          <EmptyState
            title={ORGANIZATION_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab}
            description="The Keycloak organization backend contract is not connected yet, so organization details are intentionally not inferred from the generic ABCO organization mock."
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
        searchPlaceholder="Search organizations"
        searchLabel="Search organizations"
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <DataTable
        layout="fit"
        columns={columns}
        rows={table.pageItems}
        rowKey={organization => organization.id}
        density={table.density}
        ariaLabel="Keycloak organizations"
        onRowClick={organization => { onEntityChange(organization.id) }}
        rowAriaLabel={organization => `Open organization ${organization.name}`}
        emptyContent={<EmptyState title="Keycloak organizations not connected" description="No Keycloak organization records are available from the current backend contract." />}
      />
    </IdentityContentPanel>
  )
}
