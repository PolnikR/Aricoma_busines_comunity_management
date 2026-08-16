import { useState } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { UsersTab } from '../components/UsersTab'
import { RolesTab } from '../components/RolesTab'
import { PermissionsTab } from '../components/PermissionsTab'
import { OrganizationsTab } from '../components/OrganizationsTab'
import { SessionsTab } from '../components/SessionsTab'

type TabId = 'users' | 'roles' | 'permissions' | 'organizations' | 'sessions'

const tabs: { id: TabId; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'organizations', label: 'Organizations' },
  { id: 'sessions', label: 'Sessions' },
]

export function IdentityAccessPage() {
  const [activeTab, setActiveTab] = useState<TabId>('users')

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Identity & Access Management" description="Manage users, roles, permissions, and organizations." />

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border">
          <div className="flex gap-0 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent text-accent'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'roles' && <RolesTab />}
          {activeTab === 'permissions' && <PermissionsTab />}
          {activeTab === 'organizations' && <OrganizationsTab />}
          {activeTab === 'sessions' && <SessionsTab />}
        </div>
      </div>
    </div>
  )
}
