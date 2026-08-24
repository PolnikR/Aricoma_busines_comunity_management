import { useMemo } from 'react'
import { DataTable, DataTableRequestState, DataTableSkeleton } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useRolesPermissions } from '../hooks/useRolesPermissions'
import { IdentityContentPanel } from './IdentityResourceLayout'

export function PermissionsSection() {
  const { data, isLoading, error, refetch } = useRolesPermissions()
  const permissions = data?.permissions ?? []
  const roles = data?.roles ?? []
  const columns = useMemo<ColumnDef<{ permission: string; roles: string[] }>[]>(() => [
    { id: 'permission', header: 'Permission', cell: row => row.permission },
    { id: 'roles', header: 'Roles', cell: row => row.roles.join(', ') || '—' },
  ], [])
  const rows = permissions.map(permission => ({
    permission,
    roles: roles.filter(role => role.permissions.includes(permission)).map(role => role.name),
  }))

  return (
    <IdentityContentPanel>
      {isLoading ? <DataTableSkeleton columnCount={2} rowCount={5} layout="fit" className="m-4" /> : (
        <div className="p-4">
          <DataTableRequestState
            hasData={rows.length > 0}
            error={error ? { title: 'Permissions could not be loaded', description: error.message, retryLabel: 'Retry', isRetrying: false, onRetry: () => { void refetch() } } : null}
          >
            <DataTable layout="fit" columns={columns} rows={rows} rowKey={row => row.permission} ariaLabel="Identity permissions" emptyContent={<EmptyState title="No permissions found" description="No permissions are available for the current user." />} />
          </DataTableRequestState>
        </div>
      )}
    </IdentityContentPanel>
  )
}
