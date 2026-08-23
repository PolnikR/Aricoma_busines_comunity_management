import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useOrganizations } from '../hooks/useOrganizations'
import { useRoles } from '../hooks/useRoles'
import { useUsers } from '../hooks/useUsers'
import type { Organization } from '../models/identityTypes'

const ORGANIZATION_SEARCH_FIELDS: (keyof Organization)[] = ['name', 'description']

export function OrganizationsSection() {
  const { data: organizations = [], isLoading, error, refetch } = useOrganizations()
  const { data: users = [] } = useUsers()
  const { data: roles = [] } = useRoles()
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const table = useTableState(organizations, { searchFields: ORGANIZATION_SEARCH_FIELDS })
  const selectedOrganization = organizations.find(org => org.id === selectedOrganizationId) ?? null

  const organizationUsers = (organizationId: string) => users.filter(user => user.organizationId === organizationId)
  const organizationRoles = (organizationId: string) => roles.filter(role => role.organizationId === organizationId)

  const columns = useMemo<ColumnDef<Organization>[]>(() => [
    {
      id: 'name',
      header: 'Organization',
      cell: org => <span className="font-semibold text-text-primary">{org.name}</span>,
    },
    { id: 'description', header: 'Description', cell: org => org.description || '—' },
    { id: 'members', header: 'Members', align: 'right', cell: org => String(organizationUsers(org.id).length) },
    { id: 'roles', header: 'Roles', align: 'right', cell: org => String(organizationRoles(org.id).length) },
    {
      id: 'status',
      header: 'Status',
      cell: org => <Badge color={org.status === 'active' ? 'success' : 'light'} size="sm">{org.status}</Badge>,
    },
  ], [roles, users])

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-1">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Organizations</h2>
          <p className="mt-1 text-xs text-text-muted">Manage organizations currently represented by the Identity & Access mock data.</p>
        </div>
        <Button size="sm" disabled title="Available after Keycloak integration">Add organization</Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search organizations"
            searchLabel="Search organizations"
            density={table.density}
            onDensityChange={table.setDensity}
          />

          <DataTableRequestState
            hasData={organizations.length > 0}
            error={error ? {
              title: 'Organizations could not be loaded',
              description: error.message,
              retryLabel: 'Retry',
              isRetrying: false,
              onRetry: refetch,
            } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={organization => organization.id}
              density={table.density}
              minWidthClassName="min-w-200"
              ariaLabel="Organizations"
              rowAriaLabel={organization => `Show details for ${organization.name}`}
              onRowClick={organization => { setSelectedOrganizationId(organization.id) }}
              selectedRowKey={selectedOrganizationId}
              emptyContent={organizations.length > 0
                ? 'No organizations match your search.'
                : <EmptyState title="No organizations found" description="No organizations are available in the current Identity & Access data." />}
            />
          </DataTableRequestState>

          {!error ? (
            <DataTablePagination
              page={table.page}
              pageSize={table.pageSize}
              total={table.total}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          ) : null}
        </>
      )}

      <DetailDrawer
        open={selectedOrganization !== null}
        onClose={() => { setSelectedOrganizationId(null) }}
        eyebrow="Organization"
        title={selectedOrganization?.name ?? ''}
        ariaLabel="Organization detail"
        closeLabel="Close organization detail"
      >
        {selectedOrganization ? (
          <dl className="px-5 py-3">
            <DetailRow label="Description" value={selectedOrganization.description || '—'} />
            <DetailRow label="Status" value={<Badge color={selectedOrganization.status === 'active' ? 'success' : 'light'} size="sm">{selectedOrganization.status}</Badge>} />
            <DetailRow label="Members" value={organizationUsers(selectedOrganization.id).length > 0 ? organizationUsers(selectedOrganization.id).map(user => user.name).join(', ') : '—'} />
            <DetailRow label="Roles" value={organizationRoles(selectedOrganization.id).length > 0 ? organizationRoles(selectedOrganization.id).map(role => role.name).join(', ') : '—'} />
            <DetailRow label="Created" value={new Date(selectedOrganization.createdAt).toLocaleString()} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
