import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import { useOrganizations } from '../hooks/useOrganizations'
import type { User } from '../models/identityTypes'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

export function UsersTab() {
  const { data: users, isLoading, error } = useUsers()
  const { data: roles } = useRoles()
  const { data: organizations } = useOrganizations()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const getRoleName = (roleId: string) => roles?.find(r => r.id === roleId)?.name || roleId
  const getOrgName = (orgId: string) => organizations?.find(o => o.id === orgId)?.name || orgId

  if (isLoading) return <ListSkeleton rowCount={5} />
  if (error) return <div className="text-red-600 text-sm">Error loading users: {error.message}</div>
  if (!users || users.length === 0) return <EmptyState title="No users found" description="Get started by adding your first user." />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary">Users</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover">
          Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Name</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Email</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Organization</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Roles</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Status</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Last Login</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border hover:bg-surface-muted">
                <td className="px-3 py-2 text-text-primary cursor-pointer" onClick={() => setSelectedUser(user)}>
                  {user.name}
                </td>
                <td className="px-3 py-2 text-text-secondary">{user.email}</td>
                <td className="px-3 py-2 text-text-secondary">{getOrgName(user.organizationId)}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {user.roleIds.map(getRoleName).join(', ')}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    user.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-secondary">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-3 py-2">
                  <button className="text-xs text-accent hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-muted">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-text-primary">{selectedUser.name}</h4>
              <p className="text-sm text-text-secondary mt-1">Email: {selectedUser.email}</p>
              <p className="text-sm text-text-secondary">Organization: {getOrgName(selectedUser.organizationId)}</p>
              <p className="text-sm text-text-secondary">Roles: {selectedUser.roleIds.map(getRoleName).join(', ')}</p>
              <p className="text-sm text-text-secondary">Status: {selectedUser.status}</p>
              <p className="text-sm text-text-secondary">Created: {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setSelectedUser(null)} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
