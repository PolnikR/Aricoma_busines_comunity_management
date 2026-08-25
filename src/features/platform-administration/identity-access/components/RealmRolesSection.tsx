import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
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
import { useRolesPermissions } from '../hooks/useRolesPermissions'
import { useUsers } from '../hooks/useUsers'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { User } from '../models/identityTypes'
import type { IdentityRoleRecord } from '../model/rolesPermissionsTypes'
import { IdentityResourceDetailPage, IdentityResourceHeader, IdentitySettingsSection, IdentityContentPanel } from './IdentityResourceLayout'

const ROLE_SEARCH_FIELDS: (keyof IdentityRoleRecord)[] = ['name', 'permissions']
const ROLE_TABS = ['details', 'associated-roles', 'attributes', 'users-in-role', 'permissions'] as const

type RoleTabId = (typeof ROLE_TABS)[number]

interface RealmRolesSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isRoleTab(tabId: IdentityAccessTabId | null): tabId is RoleTabId {
  return ROLE_TABS.some(tab => tab === tabId)
}

export function RealmRolesSection({ entityId, tabId, onEntityChange, onTabChange }: RealmRolesSectionProps) {
  const { t } = useTranslation()
  const { data, isLoading, error, refetch } = useRolesPermissions()
  const roles = data?.roles ?? []
  const { data: users = [] } = useUsers()
  const table = useTableState(roles, { searchFields: ROLE_SEARCH_FIELDS })
  const selectedRole = roles.find(role => role.id === entityId) ?? null

  const columns = useMemo<ColumnDef<IdentityRoleRecord>[]>(() => [
    {
      id: 'name',
      header: t('identity.roles.columns.name'),
      cell: role => (
        <>
          <span className="block font-semibold text-text-primary">{role.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{role.id}</span>
        </>
      ),
    },
    { id: 'permissions', header: t('identity.roles.columns.permissions'), cell: role => role.permissions.join(', ') || '—' },
    { id: 'members', header: t('identity.roles.columns.users'), align: 'right', cell: role => String(users.filter(user => user.roleIds.includes(role.id)).length) },
  ], [t, users])

  const userColumns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: 'user',
      header: t('identity.roles.userColumns.user'),
      cell: user => (
        <>
          <span className="block font-semibold text-text-primary">{user.name}</span>
          <span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span>
        </>
      ),
    },
    {
      id: 'status',
      header: t('identity.roles.userColumns.status'),
      cell: user => (
        <Badge color={user.status === 'active' ? 'success' : user.status === 'locked' ? 'error' : 'light'} size="sm">
          {user.status === 'active'
            ? t('identity.common.status.active')
            : user.status === 'locked'
              ? t('identity.common.status.locked')
              : user.status}
        </Badge>
      ),
    },
  ], [t])
  const tabs = ROLE_TABS.map(value => ({ value, label: t(`identity.roles.tabs.${value}`) }))

  if (entityId) {
    if (!selectedRole) {
      return (
        <div>
          <IdentityResourceHeader title={t('identity.roles.notFound.title')} backLabel={t('identity.navigation.sections.realm-roles')} onBack={() => { onEntityChange(null) }} />
          <div className="p-4"><EmptyState title={t('identity.roles.notFound.title')} description={t('identity.roles.notFound.description')} /></div>
        </div>
      )
    }

    const activeTab: RoleTabId = isRoleTab(tabId) ? tabId : 'details'
    const usersInRole = users.filter(user => user.roleIds.includes(selectedRole.id))
    let detailContent

    if (activeTab === 'details') {
      detailContent = (
        <IdentitySettingsSection title={t('identity.roles.details.title')} description={t('identity.roles.details.description')}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t('identity.roles.fields.name')} htmlFor="realm-role-name">
              <Input id="realm-role-name" value={selectedRole.name} readOnly />
            </Field>
            <Field
              label={t('identity.roles.fields.permissions')}
              htmlFor="realm-role-permissions"
              className="md:col-span-2"
            >
              <Input id="realm-role-permissions" value={selectedRole.permissions.join(', ')} readOnly />
            </Field>
          </div>
          <p className="mt-4 text-xs text-text-muted">{t('identity.roles.details.permissionsNote')}</p>
        </IdentitySettingsSection>
      )
    } else if (activeTab === 'users-in-role') {
      detailContent = usersInRole.length > 0
        ? <DataTable layout="fit" columns={userColumns} rows={usersInRole} rowKey={user => user.id} ariaLabel={t('identity.roles.usersInRole.ariaLabel')} />
        : <div className="p-4"><EmptyState title={t('identity.roles.usersInRole.emptyTitle')} description={t('identity.roles.usersInRole.emptyDescription')} /></div>
    } else if (activeTab === 'permissions') {
      detailContent = (
        <div className="p-4">
          <EmptyState title={t('identity.roles.tabs.permissions')} description={t('identity.roles.permissions.description')} />
        </div>
      )
    } else {
      const label = t(`identity.roles.tabs.${activeTab}`)
      detailContent = <div className="p-4"><EmptyState title={label} description={t('identity.roles.integration.description', { section: label.toLowerCase() })} /></div>
    }

    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.manage')}
        title={selectedRole.name}
        description={t('identity.roles.detailDescription')}
        backLabel={t('identity.navigation.sections.realm-roles')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.roles.tabs.ariaLabel')}
        actions={<Button size="sm" variant="outline" disabled title={t('identity.actions.requires.keycloak')}>{t('identity.roles.actions')}</Button>}
      >
        {detailContent}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      {isLoading ? (
        <DataTableSkeleton columnCount={3} rowCount={5} layout="fit" className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder={t('identity.roles.search')}
            searchLabel={t('identity.roles.search')}
            density={table.density}
            onDensityChange={table.setDensity}
          />
          <div className="custom-scrollbar min-h-0 flex-1 lg:overflow-y-auto">
            <DataTableRequestState
              hasCachedData={roles.length > 0}
              error={error ? { title: t('identity.roles.loadFailed'), description: error.message, retryLabel: t('identity.common.actions.retry'), isRetrying: false, onRetry: () => { void refetch() } } : null}
            >
              <DataTable
                layout="fit"
                columns={columns}
                rows={table.pageItems}
                rowKey={role => role.id}
                density={table.density}
                ariaLabel={t('identity.navigation.sections.realm-roles')}
                rowAriaLabel={role => t('identity.roles.rowAriaLabel', { name: role.name })}
                onRowClick={role => { onEntityChange(role.id) }}
                emptyContent={roles.length > 0 ? t('identity.roles.empty.filtered') : <EmptyState title={t('identity.roles.empty.title')} description={t('identity.roles.empty.description')} />}
              />
            </DataTableRequestState>
          </div>
          {(!error || roles.length > 0) ? <DataTablePagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} /> : null}
        </>
      )}
    </IdentityContentPanel>
  )
}
