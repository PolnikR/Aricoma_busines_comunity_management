import { useState } from 'react'
import { useRoles } from '../hooks/useRoles'
import { usePermissions } from '../hooks/usePermissions'
import { useUsers } from '../hooks/useUsers'
import type { Role } from '../models/identityTypes'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

export function RolesTab() {
  const { data: roles, isLoading, error } = useRoles()
  const { data: permissions } = usePermissions()
  const { data: users } = useUsers()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const getPermissionName = (permId: string) => permissions?.find(p => p.id === permId)?.name ?? permId
  const getMemberCount = (roleId: string) => users?.filter(u => u.roleIds.includes(roleId)).length ?? 0

  if (isLoading) return <ListSkeleton rowCount={5} />
  if (error) return <div className="text-red-600 text-sm">Error loading roles: {error.message}</div>
  if (!roles || roles.length === 0) return <EmptyState title="No roles found" description="Get started by creating your first role." />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary">Roles</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover">
          Add Role
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Role Name</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Description</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Members</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Permissions</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="border-b border-border hover:bg-surface-muted">
                <td className="px-3 py-2 text-text-primary cursor-pointer" onClick={() => { setSelectedRole(role); }}>
                  {role.name}
                </td>
                <td className="px-3 py-2 text-text-secondary">{role.description}</td>
                <td className="px-3 py-2 text-text-secondary">{getMemberCount(role.id)}</td>
                <td className="px-3 py-2 text-text-secondary">{role.permissionIds.length}</td>
                <td className="px-3 py-2">
                  <button className="text-xs text-accent hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRole && (
        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-muted">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-text-primary">{selectedRole.name}</h4>
              <p className="text-sm text-text-secondary mt-1">Description: {selectedRole.description}</p>
              <p className="text-sm text-text-secondary">Members: {getMemberCount(selectedRole.id)}</p>
              <p className="text-sm text-text-secondary mt-2">Permissions:</p>
              <ul className="text-sm text-text-secondary ml-4 mt-1">
                {selectedRole.permissionIds.map(pid => (
                  <li key={pid}>• {getPermissionName(pid)}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => { setSelectedRole(null); }} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
