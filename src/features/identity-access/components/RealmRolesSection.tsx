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
import { useRoles } from '../hooks/useRoles'
import { useUsers } from '../hooks/useUsers'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { Role, User } from '../models/identityTypes'
import { IdentityResourceDetailPage, IdentityResourceHeader, IdentitySettingsSection } from './IdentityResourceLayout'

const ROLE_SEARCH_FIELDS: (keyof Role)[] = ['name', 'description']
const ROLE_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'associated-roles', label: 'Associated roles' },
  { value: 'attributes', label: 'Attributes' },
  { value: 'users-in-role', label: 'Users in role' },
  { value: 'permissions', label: 'Permissions' },
] as const

type RoleTabId = (typeof ROLE_TABS)[number]['value']

interface RealmRolesSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isRoleTab(tabId: IdentityAccessTabId | null): tabId is RoleTabId {
  return ROLE_TABS.some(tab => tab.value === tabId)
}

export function RealmRolesSection({ entityId, tabId, onEntityChange, onTabChange }: RealmRolesSectionProps) {
  const { data: roles = [], isLoading, error, refetch } = useRoles()
  const { data: users = [] } = useUsers()
  const table = useTableState(roles, { searchFields: ROLE_SEARCH_FIELDS })
  const selectedRole = roles.find(role => role.id === entityId) ?? null
  const memberCount = (roleId: string) => users.filter(user => user.roleIds.includes(roleId)).length

  const columns = useMemo<ColumnDef<Role>[]>(() => [
    {
      id: 'name',
      header: 'Role name',
      cell: role => (
        <>
          <span className="block font-semibold text-text-primary">{role.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{role.id}</span>
        </>
      ),
    },
    { id: 'description', header: 'Description', cell: role => role.description || '—' },
    { id: 'members', header: 'Users in role', align: 'right', cell: role => String(memberCount(role.id)) },
  ], [users])

  const userColumns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: 'user',
      header: 'User',
      cell: user => (
        <>
          <span className="block font-semibold text-text-primary">{user.name}</span>
          <span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span>
        </>
      ),
    },
    { id: 'status', header: 'Status', cell: user => <Badge color={user.status === 'active' ? 'success' : user.status === 'locked' ? 'error' : 'light'} size="sm">{user.status}</Badge> },
  ], [])

  if (entityId) {
    if (!selectedRole) {
      return (
        <div>
          <IdentityResourceHeader title="Role not found" backLabel="Realm roles" onBack={() => { onEntityChange(null) }} />
          <div className="p-4"><EmptyState title="Role not found" description="The selected realm role is not available in the current Identity & Access data." /></div>
        </div>
      )
    }

    const activeTab: RoleTabId = isRoleTab(tabId) ? tabId : 'details'
    const usersInRole = users.filter(user => user.roleIds.includes(selectedRole.id))
    let detailContent

    if (activeTab === 'details') {
      detailContent = (
        <IdentitySettingsSection title="Role details" description="Only fields present in the current realm-role contract are shown.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role name" htmlFor="realm-role-name"><Input id="realm-role-name" value={selectedRole.name} readOnly /></Field>
            <Field label="Organization ID" htmlFor="realm-role-organization"><Input id="realm-role-organization" value={selectedRole.organizationId} readOnly /></Field>
            <Field label="Description" htmlFor="realm-role-description" className="md:col-span-2"><Input id="realm-role-description" value={selectedRole.description} readOnly /></Field>
          </div>
          <p className="mt-4 text-xs text-text-muted">Composite-role metadata is not available in the current frontend contract.</p>
        </IdentitySettingsSection>
      )
    } else if (activeTab === 'users-in-role') {
      detailContent = usersInRole.length > 0
        ? <DataTable columns={userColumns} rows={usersInRole} rowKey={user => user.id} ariaLabel="Users in realm role" />
        : <div className="p-4"><EmptyState title="No users in role" description="No users are assigned to this role in the current Identity & Access data." /></div>
    } else if (activeTab === 'permissions') {
      detailContent = (
        <div className="p-4">
          <EmptyState
            title="Permissions"
            description="Keycloak role-permission data is not connected yet. The existing ABCO application permission mock is intentionally not used as a Keycloak role-permission contract."
          />
        </div>
      )
    } else {
      const label = ROLE_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab
      detailContent = <div className="p-4"><EmptyState title={label} description={`Keycloak ${label.toLowerCase()} data is not connected yet.`} /></div>
    }

    return (
      <IdentityResourceDetailPage
        eyebrow="Manage"
        title={selectedRole.name}
        description="Realm role"
        backLabel="Realm roles"
        onBack={() => { onEntityChange(null) }}
        tabs={ROLE_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Realm role sections"
        actions={<Button size="sm" variant="outline" disabled title="Available after Keycloak integration">Actions</Button>}
      >
        {detailContent}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader
        eyebrow="Manage"
        title="Realm roles"
        description="Manage realm-level roles. Role mappings and Keycloak permissions are kept separate from generic ABCO application permissions."
        actions={<Button size="sm" disabled title="Available after Keycloak integration">Create role</Button>}
      />

      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search roles"
            searchLabel="Search roles"
            density={table.density}
            onDensityChange={table.setDensity}
          />
          <DataTableRequestState
            hasData={roles.length > 0}
            error={error ? { title: 'Roles could not be loaded', description: error.message, retryLabel: 'Retry', isRetrying: false, onRetry: refetch } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={role => role.id}
              density={table.density}
              minWidthClassName="min-w-160"
              ariaLabel="Realm roles"
              rowAriaLabel={role => `Open realm role ${role.name}`}
              onRowClick={role => { onEntityChange(role.id) }}
              emptyContent={roles.length > 0 ? 'No roles match your search.' : <EmptyState title="No roles found" description="No realm roles are available in the current Identity & Access data." />}
            />
          </DataTableRequestState>
          {!error ? <DataTablePagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} /> : null}
        </>
      )}
    </div>
  )
}
