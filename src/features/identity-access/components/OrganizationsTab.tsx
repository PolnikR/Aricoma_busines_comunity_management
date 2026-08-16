import { useState } from 'react'
import { useOrganizations } from '../hooks/useOrganizations'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import type { Organization } from '../models/identityTypes'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

export function OrganizationsTab() {
  const { data: organizations, isLoading, error } = useOrganizations()
  const { data: users } = useUsers()
  const { data: roles } = useRoles()
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  const getMemberCount = (orgId: string) => users?.filter(u => u.organizationId === orgId).length ?? 0
  const getRoleCount = (orgId: string) => roles?.filter(r => r.organizationId === orgId).length ?? 0
  const getOrgUsers = (orgId: string) => users?.filter(u => u.organizationId === orgId) ?? []
  const getOrgRoles = (orgId: string) => roles?.filter(r => r.organizationId === orgId) ?? []

  if (isLoading) return <ListSkeleton rowCount={5} />
  if (error) return <div className="text-red-600 text-sm">Error loading organizations: {error.message}</div>
  if (!organizations || organizations.length === 0) return <EmptyState title="No organizations found" description="Get started by creating your first organization." />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary">Organizations</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded hover:bg-accent-hover">
          Add Organization
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Name</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Description</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Members</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Roles</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Status</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-b border-border hover:bg-surface-muted">
                <td className="px-3 py-2 text-text-primary cursor-pointer" onClick={() => { setSelectedOrg(org); }}>
                  {org.name}
                </td>
                <td className="px-3 py-2 text-text-secondary">{org.description}</td>
                <td className="px-3 py-2 text-text-secondary">{getMemberCount(org.id)}</td>
                <td className="px-3 py-2 text-text-secondary">{getRoleCount(org.id)}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    org.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <button className="text-xs text-accent hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrg && (
        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-muted">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-text-primary">{selectedOrg.name}</h4>
              <p className="text-sm text-text-secondary mt-1">Description: {selectedOrg.description}</p>
              <p className="text-sm text-text-secondary">Status: {selectedOrg.status}</p>
              <p className="text-sm text-text-secondary">Created: {new Date(selectedOrg.createdAt).toLocaleDateString()}</p>

              <p className="text-sm text-text-secondary font-semibold mt-4">Members ({getMemberCount(selectedOrg.id)}):</p>
              <ul className="text-sm text-text-secondary ml-4 mt-1">
                {getOrgUsers(selectedOrg.id).map(user => (
                  <li key={user.id}>• {user.name}</li>
                ))}
              </ul>

              <p className="text-sm text-text-secondary font-semibold mt-4">Roles ({getRoleCount(selectedOrg.id)}):</p>
              <ul className="text-sm text-text-secondary ml-4 mt-1">
                {getOrgRoles(selectedOrg.id).map(role => (
                  <li key={role.id}>• {role.name}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => { setSelectedOrg(null); }} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
