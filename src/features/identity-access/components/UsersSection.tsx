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
import type { User } from '../models/identityTypes'

const USER_SEARCH_FIELDS: (keyof User)[] = ['name', 'email']

const statusColor: Record<User['status'], 'success' | 'light' | 'error'> = {
  active: 'success',
  inactive: 'light',
  locked: 'error',
}

export function UsersSection() {
  const { data: users = [], isLoading, error, refetch } = useUsers()
  const { data: roles = [] } = useRoles()
  const { data: organizations = [] } = useOrganizations()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const table = useTableState(users, { searchFields: USER_SEARCH_FIELDS })
  const selectedUser = users.find(user => user.id === selectedUserId) ?? null

  const getRoleName = (roleId: string) => roles.find(role => role.id === roleId)?.name ?? roleId
  const getOrganizationName = (organizationId: string) => organizations.find(org => org.id === organizationId)?.name ?? organizationId

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: 'name',
      header: 'User',
      cell: user => (
        <>
          <span className="block font-semibold text-text-primary">{user.name}</span>
          <span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span>
        </>
      ),
    },
    { id: 'organization', header: 'Organization', cell: user => getOrganizationName(user.organizationId) },
    { id: 'roles', header: 'Roles', cell: user => user.roleIds.length > 0 ? user.roleIds.map(getRoleName).join(', ') : '—' },
    {
      id: 'status',
      header: 'Status',
      cell: user => <Badge color={statusColor[user.status]} size="sm">{user.status}</Badge>,
    },
    {
      id: 'lastLogin',
      header: 'Last login',
      cell: user => user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
    },
  ], [organizations, roles])

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-1">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Users</h2>
          <p className="mt-1 text-xs text-text-muted">Manage users currently represented by the Identity & Access mock data.</p>
        </div>
        <Button size="sm" disabled title="Available after Keycloak integration">Add user</Button>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={5} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search users"
            searchLabel="Search users"
            density={table.density}
            onDensityChange={table.setDensity}
          />

          <DataTableRequestState
            hasData={users.length > 0}
            error={error ? {
              title: 'Users could not be loaded',
              description: error.message,
              retryLabel: 'Retry',
              isRetrying: false,
              onRetry: refetch,
            } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={user => user.id}
              density={table.density}
              minWidthClassName="min-w-220"
              ariaLabel="Users"
              rowAriaLabel={user => `Show details for ${user.name}`}
              onRowClick={user => { setSelectedUserId(user.id) }}
              selectedRowKey={selectedUserId}
              emptyContent={users.length > 0
                ? 'No users match your search.'
                : <EmptyState title="No users found" description="No users are available in the current Identity & Access data." />}
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
        open={selectedUser !== null}
        onClose={() => { setSelectedUserId(null) }}
        eyebrow="User"
        title={selectedUser?.name ?? ''}
        subtitle={selectedUser?.email}
        ariaLabel="User detail"
        closeLabel="Close user detail"
      >
        {selectedUser ? (
          <dl className="px-5 py-3">
            <DetailRow label="Email" value={selectedUser.email} />
            <DetailRow label="Organization" value={getOrganizationName(selectedUser.organizationId)} />
            <DetailRow label="Roles" value={selectedUser.roleIds.length > 0 ? selectedUser.roleIds.map(getRoleName).join(', ') : '—'} />
            <DetailRow label="Status" value={<Badge color={statusColor[selectedUser.status]} size="sm">{selectedUser.status}</Badge>} />
            <DetailRow label="Last login" value={selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'} />
            <DetailRow label="Created" value={new Date(selectedUser.createdAt).toLocaleString()} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
