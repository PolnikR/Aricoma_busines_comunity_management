import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTablePagination, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { CheckboxField, Field, Input } from '@/shared/components/form/FormControls'
import { Modal } from '@/shared/components/modal/Modal'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import { useSessions } from '../hooks/useSessions'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { Session } from '../models/identityTypes'
import type { CreateIdentityUserInput, IdentityCapabilityView, IdentityRoleView, IdentityUserView, RequiredActionView } from '../services/identityAdminGateway'
import { IdentityContentPanel, IdentityResourceDetailPage, IdentityResourceHeader, IdentitySettingsSection } from './IdentityResourceLayout'

const CANONICAL_USER_TABS = ['details', 'attributes', 'credentials', 'role-mappings', 'groups', 'consents', 'sessions', 'identity-provider-links'] as const
const VISIBLE_USER_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'credentials', label: 'Credentials' },
  { value: 'role-mappings', label: 'Role mappings' },
] as const
type UserTabId = (typeof CANONICAL_USER_TABS)[number]

interface UsersSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
  isAddUserOpen: boolean
  onSetAddUserOpen: (open: boolean) => void
}

function isUserTab(tabId: IdentityAccessTabId | null): tabId is UserTabId {
  return CANONICAL_USER_TABS.some(tab => tab === tabId)
}

function userDisplayName(user: IdentityUserView) {
  return `${user.firstName} ${user.lastName}`.trim() || user.username
}

export function UsersSection(props: UsersSectionProps) {
  const { entityId, tabId, onEntityChange, onTabChange, isAddUserOpen, onSetAddUserOpen } = props
  const { data, error, isLoading, gateway, mutate, refresh } = useIdentityAdminPreview()
  const users = data?.users ?? []
  const roles = useMemo(() => data?.roles ?? [], [data?.roles])
  const selectedUser = users.find(user => user.id === entityId) ?? null
  const { data: userSessions = [] } = useSessions(selectedUser ? { userId: selectedUser.id } : undefined)
  const table = useTableState(users, { searchFields: ['username', 'email', 'firstName', 'lastName'] })
  const columns = useMemo<ColumnDef<IdentityUserView>[]>(() => [
    { id: 'user', header: 'User', cell: user => <><span className="block font-semibold text-text-primary">{userDisplayName(user)}</span><span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span></> },
    { id: 'username', header: 'Username', cell: user => user.username },
    { id: 'roles', header: 'Roles', cell: user => user.roleIds.map(roleId => roles.find(role => role.id === roleId)?.name ?? roleId).join(', ') || '—' },
    { id: 'status', header: 'Status', cell: user => <Badge color={user.enabled ? 'success' : 'light'} size="sm">{user.enabled ? 'active' : 'inactive'}</Badge> },
    { id: 'lastLogin', header: 'Last login', cell: user => user.lastLoginLabel },
  ], [roles])

  if (entityId) {
    if (!selectedUser && !isLoading) {
      return <div><IdentityResourceHeader title="User not found" backLabel="Users" onBack={() => { onEntityChange(null) }} /><div className="p-4"><EmptyState title="User not found" description="The selected user is not available in the current Identity & Access preview." /></div></div>
    }
    if (!selectedUser) return <IdentityContentPanel><div className="p-4"><EmptyState title="Loading user preview" description="Reading the frontend IdentityAdminGateway adapter." /></div></IdentityContentPanel>

    const activeTab: UserTabId = isUserTab(tabId) ? tabId : 'details'
    let detailContent
    if (activeTab === 'details') {
      detailContent = <UserDetails user={selectedUser} />
    } else if (activeTab === 'credentials') {
      detailContent = <UserCredentials user={selectedUser} actions={data?.requiredActions ?? []} onToggle={(actionId, isRequired) => mutate(() => gateway.setUserRequiredAction(selectedUser.id, actionId, isRequired))} />
    } else if (activeTab === 'role-mappings') {
      detailContent = <UserRoleMappings user={selectedUser} roles={roles} capabilities={data?.capabilities ?? []} onToggle={(roleId, isAssigned) => mutate(() => gateway.setUserRole(selectedUser.id, roleId, isAssigned))} />
    } else if (activeTab === 'sessions') {
      detailContent = <UserSessions sessions={userSessions} />
    } else {
      detailContent = <div className="p-4"><EmptyState title="Integration seam retained" description={`The canonical ${activeTab} deep link remains available for a future backend adapter.`} /></div>
    }

    return (
      <IdentityResourceDetailPage eyebrow="Manage" title={userDisplayName(selectedUser)} description={selectedUser.email} backLabel="Users" onBack={() => { onEntityChange(null) }} tabs={VISIBLE_USER_TABS} tabId={activeTab} onTabChange={nextTab => { onTabChange(nextTab) }} tabAriaLabel="User management sections">
        {detailContent}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search users" searchLabel="Search users" density={table.density} onDensityChange={table.setDensity} />
      <div className="custom-scrollbar min-h-0 flex-1 lg:overflow-y-auto">
        {error
          ? <div className="p-4"><EmptyState title="Users could not be loaded" description={error.message} action={<Button size="sm" onClick={() => { void refresh() }}>Retry</Button>} /></div>
          : <DataTable layout="fit" columns={columns} rows={table.pageItems} rowKey={user => user.id} density={table.density} ariaLabel="Users" rowAriaLabel={user => `Open user ${userDisplayName(user)}`} onRowClick={user => { onEntityChange(user.id) }} emptyContent={<EmptyState title={isLoading ? 'Loading user preview' : 'No users found'} description="User preview data is provided by the frontend IdentityAdminGateway adapter." />} />}
      </div>
      {!error ? <DataTablePagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} /> : null}
      <AddUserModal open={isAddUserOpen} onClose={() => { onSetAddUserOpen(false) }} onCreate={async input => { await mutate(() => gateway.createUser(input)); onSetAddUserOpen(false) }} />
    </IdentityContentPanel>
  )
}

function UserDetails({ user }: { user: IdentityUserView }) {
  return <IdentitySettingsSection title="User details" description="Focused identity fields from the frontend preview contract."><div className="grid min-w-0 gap-4 md:grid-cols-2"><Field label="Username" htmlFor="identity-user-username"><Input id="identity-user-username" value={user.username} readOnly /></Field><Field label="Email" htmlFor="identity-user-email"><Input id="identity-user-email" value={user.email} readOnly /></Field><Field label="First name" htmlFor="identity-user-first-name"><Input id="identity-user-first-name" value={user.firstName} readOnly /></Field><Field label="Last name" htmlFor="identity-user-last-name"><Input id="identity-user-last-name" value={user.lastName} readOnly /></Field><div><span className="mb-1.5 block text-xs font-medium text-text-secondary">Enabled/status</span><Badge color={user.enabled ? 'success' : 'light'}>{user.enabled ? 'active' : 'inactive'}</Badge></div></div></IdentitySettingsSection>
}

function UserCredentials({ user, actions, onToggle }: { user: IdentityUserView; actions: RequiredActionView[]; onToggle: (actionId: string, isRequired: boolean) => Promise<unknown> }) {
  return <IdentitySettingsSection title="Credentials and required actions" description="Safe preview controls without credential values or authentication material."><p className="mb-4 text-sm text-text-secondary">No credential values are stored or displayed in this preview.</p><div className="grid gap-3 sm:grid-cols-2">{actions.map(action => <CheckboxField key={action.id} label={`Require ${action.name}`} checked={user.requiredActionIds.includes(action.id)} onChange={event => { void onToggle(action.id, event.currentTarget.checked) }} />)}</div></IdentitySettingsSection>
}

function UserRoleMappings({ user, roles, capabilities, onToggle }: { user: IdentityUserView; roles: IdentityRoleView[]; capabilities: IdentityCapabilityView[]; onToggle: (roleId: string, isAssigned: boolean) => Promise<unknown> }) {
  const assigned = roles.filter(role => user.roleIds.includes(role.id))
  const available = roles.filter(role => !user.roleIds.includes(role.id))
  const effectiveCapabilityIds = new Set(assigned.flatMap(role => role.capabilityIds))
  const effectiveCapabilities = capabilities.filter(capability => effectiveCapabilityIds.has(capability.id))
  return <div className="space-y-4 p-4"><RoleList title="Assigned ABCO client roles" roles={assigned} actionLabel="Remove" onAction={role => onToggle(role.id, false)} empty="No assigned ABCO client roles." /><RoleList title="Available ABCO client roles" roles={available} actionLabel="Assign" onAction={role => onToggle(role.id, true)} empty="All preview roles are assigned." /><section className="rounded-lg border border-border bg-surface p-4"><h3 className="text-sm font-semibold text-text-primary">Effective ABCO application capabilities</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">{effectiveCapabilities.map(capability => <li key={capability.id}><span className="font-medium text-text-primary">{capability.label}:</span> {capability.description}</li>)}</ul></section></div>
}

function RoleList({ title, roles, actionLabel, onAction, empty }: { title: string; roles: IdentityRoleView[]; actionLabel: string; onAction: (role: IdentityRoleView) => Promise<unknown>; empty: string }) {
  return <section className="rounded-lg border border-border bg-surface p-4"><h3 className="text-sm font-semibold text-text-primary">{title}</h3>{roles.length === 0 ? <p className="mt-3 text-sm text-text-muted">{empty}</p> : <ul className="mt-3 divide-y divide-border">{roles.map(role => <li key={role.id} className="flex min-w-0 items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium text-text-primary">{role.name}</p><p className="text-xs text-text-muted">{role.description}</p></div><Button size="sm" variant="outline" onClick={() => { void onAction(role) }}>{actionLabel}</Button></li>)}</ul>}</section>
}

function UserSessions({ sessions }: { sessions: Session[] }) {
  const columns = useMemo<ColumnDef<Session>[]>(() => [{ id: 'login', header: 'Login time', cell: session => new Date(session.loginTime).toLocaleString() }, { id: 'ip', header: 'IP address', cell: session => <span className="font-mono text-xs">{session.ipAddress}</span> }, { id: 'status', header: 'Status', cell: session => session.status }], [])
  return sessions.length ? <DataTable layout="fit" columns={columns} rows={sessions} rowKey={session => session.id} ariaLabel="User sessions" /> : <div className="p-4"><EmptyState title="No user sessions" description="No sessions are available for this user." /></div>
}

const EMPTY_USER_INPUT: CreateIdentityUserInput = { username: '', email: '', firstName: '', lastName: '', enabled: true }

function AddUserModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (input: CreateIdentityUserInput) => Promise<void> }) {
  const [input, setInput] = useState(EMPTY_USER_INPUT)
  const isValid = [input.username, input.email, input.firstName, input.lastName].every(value => value.trim().length > 0)
  const setField = (field: keyof CreateIdentityUserInput, value: string | boolean) => { setInput(current => ({ ...current, [field]: value })) }
  return <Modal open={open} onClose={onClose} title="Add user" footer={<><Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button><Button size="sm" disabled={!isValid} onClick={() => { void onCreate(input).then(() => { setInput(EMPTY_USER_INPUT) }) }}>Create user</Button></>}><div className="space-y-4 px-6 py-4"><p className="text-xs text-text-muted">Creates an in-memory preview user only. A future gateway adapter can replace this transport-neutral flow.</p><Field label="Username" htmlFor="new-user-username"><Input id="new-user-username" value={input.username} onChange={event => { setField('username', event.currentTarget.value) }} /></Field><Field label="Email" htmlFor="new-user-email"><Input id="new-user-email" type="email" value={input.email} onChange={event => { setField('email', event.currentTarget.value) }} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" htmlFor="new-user-first-name"><Input id="new-user-first-name" value={input.firstName} onChange={event => { setField('firstName', event.currentTarget.value) }} /></Field><Field label="Last name" htmlFor="new-user-last-name"><Input id="new-user-last-name" value={input.lastName} onChange={event => { setField('lastName', event.currentTarget.value) }} /></Field></div><CheckboxField label="Enabled" checked={input.enabled} onChange={event => { setField('enabled', event.currentTarget.checked) }} /></div></Modal>
}
