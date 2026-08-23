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
import { usePermissions } from '../hooks/usePermissions'
import { useRoles } from '../hooks/useRoles'
import { useUsers } from '../hooks/useUsers'
import type { Role } from '../models/identityTypes'

const ROLE_SEARCH_FIELDS: (keyof Role)[] = ['name', 'description']

export function RealmRolesSection() {
  const { data: roles = [], isLoading, error, refetch } = useRoles()
  const { data: permissions = [] } = usePermissions()
  const { data: users = [] } = useUsers()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const table = useTableState(roles, { searchFields: ROLE_SEARCH_FIELDS })
  const selectedRole = roles.find(role => role.id === selectedRoleId) ?? null

  const permissionNames = (role: Role) => role.permissionIds.map(
    permissionId => permissions.find(permission => permission.id === permissionId)?.name ?? permissionId,
  )
  const memberCount = (roleId: string) => users.filter(user => user.roleIds.includes(roleId)).length

  const columns = useMemo<ColumnDef<Role>[]>(() => [
    {
      id: 'name',
      header: 'Role name',
      cell: role => (
        <>
          <span className="block font-semibold text-text-primary">{role.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{role.id}</span>
        </>
      ),
    },
    { id: 'description', header: 'Description', cell: role => role.description || '—' },
    { id: 'members', header: 'Members', align: 'right', cell: role => String(memberCount(role.id)) },
    {
      id: 'permissions',
      header: 'Permissions',
      cell: role => <Badge color="info" size="sm">{String(role.permissionIds.length)}</Badge>,
    },
  ], [users])

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-1">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Realm roles</h2>
          <p className="mt-1 text-xs text-text-muted">Manage roles currently represented by the Identity & Access mock data.</p>
        </div>
        <Button size="sm" disabled title="Available after Keycloak integration">Add role</Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search roles"
            searchLabel="Search roles"
            density={table.density}
            onDensityChange={table.setDensity}
          />

          <DataTableRequestState
            hasData={roles.length > 0}
            error={error ? {
              title: 'Roles could not be loaded',
              description: error.message,
              retryLabel: 'Retry',
              isRetrying: false,
              onRetry: refetch,
            } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={role => role.id}
              density={table.density}
              minWidthClassName="min-w-180"
              ariaLabel="Realm roles"
              rowAriaLabel={role => `Show details for ${role.name}`}
              onRowClick={role => { setSelectedRoleId(role.id) }}
              selectedRowKey={selectedRoleId}
              emptyContent={roles.length > 0
                ? 'No roles match your search.'
                : <EmptyState title="No roles found" description="No roles are available in the current Identity & Access data." />}
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
        open={selectedRole !== null}
        onClose={() => { setSelectedRoleId(null) }}
        eyebrow="Realm role"
        title={selectedRole?.name ?? ''}
        subtitle={selectedRole?.id}
        ariaLabel="Role detail"
        closeLabel="Close role detail"
      >
        {selectedRole ? (
          <dl className="px-5 py-3">
            <DetailRow label="Description" value={selectedRole.description || '—'} />
            <DetailRow label="Members" value={String(memberCount(selectedRole.id))} />
            <DetailRow
              label="Permissions"
              value={permissionNames(selectedRole).length > 0 ? permissionNames(selectedRole).join(', ') : '—'}
            />
            <DetailRow label="Organization ID" value={<span className="font-mono">{selectedRole.organizationId}</span>} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
