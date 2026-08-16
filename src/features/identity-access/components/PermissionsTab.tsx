import { useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import { useRoles } from '../hooks/useRoles'
import type { Permission } from '../models/identityTypes'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

export function PermissionsTab() {
  const { data: permissions, isLoading, error } = usePermissions()
  const { data: roles } = useRoles()
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)

  const getRolesWithPermission = (permId: string) => roles?.filter(r => r.permissionIds.includes(permId)) || []

  if (isLoading) return <ListSkeleton rowCount={5} />
  if (error) return <div className="text-red-600 text-sm">Error loading permissions: {error.message}</div>
  if (!permissions || permissions.length === 0) return <EmptyState title="No permissions found" description="No permissions available in the system." />

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Permissions (Read-Only)</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Permission ID</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Category</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Description</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Used by Roles</th>
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id} className="border-b border-border hover:bg-surface-muted">
                <td className="px-3 py-2 text-text-primary cursor-pointer" onClick={() => setSelectedPermission(perm)}>
                  {perm.name}
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs px-2 py-1 rounded bg-accent-soft text-accent font-medium">
                    {perm.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">{perm.description}</td>
                <td className="px-3 py-2 text-text-secondary">{getRolesWithPermission(perm.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPermission && (
        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-muted">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-text-primary">{selectedPermission.name}</h4>
              <p className="text-sm text-text-secondary mt-1">ID: {selectedPermission.id}</p>
              <p className="text-sm text-text-secondary">Category: {selectedPermission.category}</p>
              <p className="text-sm text-text-secondary mt-2">Description: {selectedPermission.description}</p>
              <p className="text-sm text-text-secondary mt-2">Used by roles:</p>
              <ul className="text-sm text-text-secondary ml-4 mt-1">
                {getRolesWithPermission(selectedPermission.id).map(role => (
                  <li key={role.id}>• {role.name}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setSelectedPermission(null)} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
