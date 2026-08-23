import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
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
import type { Permission } from '../models/identityTypes'

const PERMISSION_SEARCH_FIELDS: (keyof Permission)[] = ['name', 'description', 'category']
const categoryColor: Record<Permission['category'], 'primary' | 'success' | 'info' | 'light'> = {
  admin: 'primary',
  recovery: 'success',
  audit: 'info',
  system: 'light',
}

export function PermissionsSection() {
  const { data: permissions = [], isLoading, error, refetch } = usePermissions()
  const { data: roles = [] } = useRoles()
  const [selectedPermissionId, setSelectedPermissionId] = useState<string | null>(null)
  const table = useTableState(permissions, { searchFields: PERMISSION_SEARCH_FIELDS })
  const selectedPermission = permissions.find(permission => permission.id === selectedPermissionId) ?? null
  const rolesUsingPermission = (permissionId: string) => roles.filter(role => role.permissionIds.includes(permissionId))

  const columns = useMemo<ColumnDef<Permission>[]>(() => [
    {
      id: 'name',
      header: 'Permission',
      cell: permission => (
        <>
          <span className="block font-semibold text-text-primary">{permission.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{permission.id}</span>
        </>
      ),
    },
    { id: 'category', header: 'Category', cell: permission => <Badge color={categoryColor[permission.category]} size="sm">{permission.category}</Badge> },
    { id: 'description', header: 'Description', cell: permission => permission.description || '—' },
    { id: 'roles', header: 'Used by roles', align: 'right', cell: permission => String(rolesUsingPermission(permission.id).length) },
  ], [roles])

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 pb-3 pt-1">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Permissions</h2>
          <p className="mt-1 text-xs text-text-muted">Review permissions currently represented by the Identity & Access mock data.</p>
        </div>
        <Badge color="light" size="sm">Read-only</Badge>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search permissions"
            searchLabel="Search permissions"
            density={table.density}
            onDensityChange={table.setDensity}
          />

          <DataTableRequestState
            hasData={permissions.length > 0}
            error={error ? {
              title: 'Permissions could not be loaded',
              description: error.message,
              retryLabel: 'Retry',
              isRetrying: false,
              onRetry: refetch,
            } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={permission => permission.id}
              density={table.density}
              minWidthClassName="min-w-200"
              ariaLabel="Permissions"
              rowAriaLabel={permission => `Show details for ${permission.name}`}
              onRowClick={permission => { setSelectedPermissionId(permission.id) }}
              selectedRowKey={selectedPermissionId}
              emptyContent={permissions.length > 0
                ? 'No permissions match your search.'
                : <EmptyState title="No permissions found" description="No permissions are available in the current Identity & Access data." />}
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
        open={selectedPermission !== null}
        onClose={() => { setSelectedPermissionId(null) }}
        eyebrow="Permission"
        title={selectedPermission?.name ?? ''}
        subtitle={selectedPermission?.id}
        ariaLabel="Permission detail"
        closeLabel="Close permission detail"
      >
        {selectedPermission ? (
          <dl className="px-5 py-3">
            <DetailRow label="Category" value={<Badge color={categoryColor[selectedPermission.category]} size="sm">{selectedPermission.category}</Badge>} />
            <DetailRow label="Description" value={selectedPermission.description || '—'} />
            <DetailRow label="Used by roles" value={rolesUsingPermission(selectedPermission.id).length > 0 ? rolesUsingPermission(selectedPermission.id).map(role => role.name).join(', ') : '—'} />
            <DetailRow label="Created" value={new Date(selectedPermission.createdAt).toLocaleString()} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
