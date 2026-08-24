import { useMemo } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { Modal } from '@/shared/components/modal/Modal'
import { useRoles } from '../hooks/useRoles'
import { useSessions } from '../hooks/useSessions'
import { useUsers } from '../hooks/useUsers'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { Role, Session, User } from '../models/identityTypes'
import { IdentityResourceDetailPage, IdentityResourceHeader, IdentitySettingsSection, IdentityContentPanel } from './IdentityResourceLayout'

const USER_SEARCH_FIELDS: (keyof User)[] = ['name', 'email']
const USER_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'attributes', label: 'Attributes' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'role-mappings', label: 'Role mappings' },
  { value: 'groups', label: 'Groups' },
  { value: 'consents', label: 'Consents' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'identity-provider-links', label: 'Identity provider links' },
] as const

type UserTabId = (typeof USER_TABS)[number]['value']

const statusColor: Record<User['status'], 'success' | 'light' | 'error'> = {
  active: 'success',
  inactive: 'light',
  locked: 'error',
}

const sessionStatusColor: Record<Session['status'], 'success' | 'light' | 'error'> = {
  active: 'success',
  expired: 'light',
  terminated: 'error',
}

interface UsersSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
  isAddUserOpen: boolean
  onSetAddUserOpen: (open: boolean) => void
}

function isUserTab(tabId: IdentityAccessTabId | null): tabId is UserTabId {
  return USER_TABS.some(tab => tab.value === tabId)
}

export function UsersSection({ entityId, tabId, onEntityChange, onTabChange, isAddUserOpen, onSetAddUserOpen }: UsersSectionProps) {
  const { data: users = [], isLoading, error, refetch } = useUsers()
  const { data: roles = [] } = useRoles()
  const selectedUser = users.find(user => user.id === entityId) ?? null
  const { data: userSessions = [] } = useSessions(selectedUser ? { userId: selectedUser.id } : undefined)
  const table = useTableState(users, { searchFields: USER_SEARCH_FIELDS })

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
    { id: 'roles', header: 'Roles', cell: user => user.roleIds.length > 0 ? user.roleIds.map(roleId => roles.find(role => role.id === roleId)?.name ?? roleId).join(', ') : '—' },
    { id: 'status', header: 'Status', cell: user => <Badge color={statusColor[user.status]} size="sm">{user.status}</Badge> },
    { id: 'lastLogin', header: 'Last login', cell: user => user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never' },
  ], [roles])

  const roleColumns = useMemo<ColumnDef<Role>[]>(() => [
    { id: 'name', header: 'Role name', cell: role => <span className="font-semibold text-text-primary">{role.name}</span> },
    { id: 'description', header: 'Description', cell: role => role.description || '—' },
  ], [])

  const sessionColumns = useMemo<ColumnDef<Session>[]>(() => [
    { id: 'login', header: 'Login time', cell: session => new Date(session.loginTime).toLocaleString() },
    { id: 'activity', header: 'Last activity', cell: session => new Date(session.lastActivityTime).toLocaleString() },
    { id: 'ip', header: 'IP address', cell: session => <span className="font-mono text-xs">{session.ipAddress}</span> },
    { id: 'status', header: 'Status', cell: session => <Badge color={sessionStatusColor[session.status]} size="sm">{session.status}</Badge> },
  ], [])

  if (entityId) {
    if (!selectedUser) {
      return (
        <div>
          <IdentityResourceHeader title="User not found" backLabel="Users" onBack={() => { onEntityChange(null) }} />
          <div className="p-4"><EmptyState title="User not found" description="The selected user is not available in the current Identity & Access data." /></div>
        </div>
      )
    }

    const activeTab: UserTabId = isUserTab(tabId) ? tabId : 'details'
    const assignedRoles = roles.filter(role => selectedUser.roleIds.includes(role.id))
    let detailContent
    if (activeTab === 'details') {
      detailContent = (
        <IdentitySettingsSection title="User details" description="Fields currently available from the Identity & Access user contract.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" htmlFor="identity-user-name"><Input id="identity-user-name" value={selectedUser.name} readOnly /></Field>
            <Field label="Email" htmlFor="identity-user-email"><Input id="identity-user-email" value={selectedUser.email} readOnly /></Field>
            <div><span className="mb-1.5 block text-xs font-medium text-text-secondary">Status</span><Badge color={statusColor[selectedUser.status]}>{selectedUser.status}</Badge></div>
          </div>
        </IdentitySettingsSection>
      )
    } else if (activeTab === 'role-mappings') {
      detailContent = assignedRoles.length > 0
        ? <DataTable layout="fit" columns={roleColumns} rows={assignedRoles} rowKey={role => role.id} ariaLabel="User role mappings" />
        : <div className="p-4"><EmptyState title="No role mappings" description="This user has no role mappings in the current Identity & Access data." /></div>
    } else if (activeTab === 'sessions') {
      detailContent = userSessions.length > 0
        ? <DataTable layout="fit" columns={sessionColumns} rows={userSessions} rowKey={session => session.id} ariaLabel="User sessions" />
        : <div className="p-4"><EmptyState title="No user sessions" description="No sessions are available for this user in the current Identity & Access data." /></div>
    } else {
      const label = USER_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab
      detailContent = <div className="p-4"><EmptyState title={label} description={`Keycloak ${label.toLowerCase()} data is not connected yet.`} /></div>
    }

    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={selectedUser.name}
        description={selectedUser.email}
        backLabel="Users"
        onBack={() => { onEntityChange(null) }}
        tabs={USER_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="User management sections"
        actions={<Button size="sm" variant="outline" disabled title="Available after Keycloak integration">Actions</Button>}
      >
        {detailContent}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={5} layout="fit" className="rounded-none border-0 shadow-none" />
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
          <div className="custom-scrollbar min-h-0 flex-1 lg:overflow-y-auto">
            <DataTableRequestState
              hasData={users.length > 0}
              error={error ? { title: 'Users could not be loaded', description: error.message, retryLabel: 'Retry', isRetrying: false, onRetry: refetch } : null}
            >
              <DataTable
                layout="fit"
                columns={columns}
                rows={table.pageItems}
                rowKey={user => user.id}
                density={table.density}
                ariaLabel="Users"
                rowAriaLabel={user => `Open user ${user.name}`}
                onRowClick={user => { onEntityChange(user.id) }}
                emptyContent={users.length > 0 ? 'No users match your search.' : <EmptyState title="No users found" description="No users are available in the current Identity & Access data." />}
              />
            </DataTableRequestState>
          </div>
          {!error ? <DataTablePagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} /> : null}
        </>
      )}

      <Modal
        open={isAddUserOpen}
        onClose={() => { onSetAddUserOpen(false) }}
        title="Add user"
        footer={<><Button size="sm" variant="ghost" onClick={() => { onSetAddUserOpen(false) }}>Cancel</Button><Button size="sm" disabled title="Requires Keycloak integration">Create user</Button></>}
      >
        <div className="space-y-4 px-6 py-4">
          <p className="text-xs text-text-muted">The form establishes the Keycloak user-creation surface; persistence is disabled until the Keycloak contract is connected.</p>
          <Field label="Name" htmlFor="new-user-name"><Input id="new-user-name" /></Field>
          <Field label="Email" htmlFor="new-user-email"><Input id="new-user-email" type="email" /></Field>
        </div>
      </Modal>
    </IdentityContentPanel>
  )
}
