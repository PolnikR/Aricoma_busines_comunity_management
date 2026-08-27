import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Alert } from '@/shared/components/alert/Alert'
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
const VISIBLE_USER_TABS = ['details', 'credentials', 'role-mappings'] as const
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
  const { t } = useTranslation()
  const { entityId, tabId, onEntityChange, onTabChange, isAddUserOpen, onSetAddUserOpen } = props
  const { data, error, isLoading, isMutating, mutationError, clearMutationError, gateway, mutate, refresh } = useIdentityAdminPreview()
  const users = data?.users ?? []
  const roles = useMemo(() => data?.roles ?? [], [data?.roles])
  const selectedUser = users.find(user => user.id === entityId) ?? null
  const { data: userSessions = [] } = useSessions(selectedUser ? { userId: selectedUser.id } : undefined)
  const table = useTableState(users, { searchFields: ['username', 'email', 'firstName', 'lastName'] })
  const columns = useMemo<ColumnDef<IdentityUserView>[]>(() => [
    {
      id: 'user',
      header: t('identity.users.columns.user'),
      cell: user => (
        <>
          <span className="block font-semibold text-text-primary">{userDisplayName(user)}</span>
          <span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span>
        </>
      ),
    },
    { id: 'username', header: t('identity.users.columns.username'), cell: user => user.username },
    { id: 'roles', header: t('identity.users.columns.roles'), cell: user => user.roleIds.map(roleId => roles.find(role => role.id === roleId)?.name ?? roleId).join(', ') || '—' },
    {
      id: 'status',
      header: t('identity.users.columns.status'),
      cell: user => (
        <Badge color={user.enabled ? 'success' : 'light'} size="sm">
          {user.enabled ? t('identity.users.status.active') : t('identity.users.status.inactive')}
        </Badge>
      ),
    },
    { id: 'lastLogin', header: t('identity.users.columns.lastLogin'), cell: user => user.lastLoginLabel },
  ], [roles, t])
  const tabs = VISIBLE_USER_TABS.map(value => ({ value, label: t(`identity.users.tabs.${value}`) }))

  useEffect(() => {
    if (isAddUserOpen) clearMutationError()
  }, [clearMutationError, isAddUserOpen])

  if (entityId) {
    if (!selectedUser && !isLoading) {
      return (
        <div>
          <IdentityResourceHeader
            title={t('identity.users.notFound.title')}
            backLabel={t('identity.navigation.sections.users')}
            onBack={() => { onEntityChange(null) }}
          />
          <div className="p-4">
            <EmptyState
              title={t('identity.users.notFound.title')}
              description={t('identity.users.notFound.description')}
            />
          </div>
        </div>
      )
    }
    if (!selectedUser) {
      return (
        <IdentityContentPanel>
          <div className="p-4">
            <EmptyState title={t('identity.users.loading')} description={t('identity.common.adapterReading')} />
          </div>
        </IdentityContentPanel>
      )
    }

    const activeTab: UserTabId = isUserTab(tabId) ? tabId : 'details'
    let detailContent
    if (activeTab === 'details') {
      detailContent = <UserDetails user={selectedUser} />
    } else if (activeTab === 'credentials') {
      detailContent = (
        <UserCredentials
          user={selectedUser}
          actions={data?.requiredActions ?? []}
          disabled={isMutating}
          onToggle={(actionId, isRequired) => mutate(() => gateway.setUserRequiredAction(selectedUser.id, actionId, isRequired))}
        />
      )
    } else if (activeTab === 'role-mappings') {
      detailContent = (
        <UserRoleMappings
          user={selectedUser}
          roles={roles}
          capabilities={data?.capabilities ?? []}
          disabled={isMutating}
          onToggle={(roleId, isAssigned) => mutate(() => gateway.setUserRole(selectedUser.id, roleId, isAssigned))}
        />
      )
    } else if (activeTab === 'sessions') {
      detailContent = <UserSessions sessions={userSessions} />
    } else {
      detailContent = (
        <div className="p-4">
          <EmptyState
            title={t('identity.common.integration.title')}
            description={t('identity.common.integration.description', { tab: activeTab })}
          />
        </div>
      )
    }

    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.manage')}
        title={userDisplayName(selectedUser)}
        description={selectedUser.email}
        backLabel={t('identity.navigation.sections.users')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.users.tabs.ariaLabel')}
      >
        {mutationError ? (
          <Alert
            className="m-4"
            variant="error"
            title={t('identity.users.mutationFailed')}
            description={mutationError.message}
          />
        ) : null}
        {detailContent}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      {mutationError && !isAddUserOpen ? (
        <Alert
          className="m-4 mb-0"
          variant="error"
          title={t('identity.users.mutationFailed')}
          description={mutationError.message}
        />
      ) : null}
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('identity.users.search')}
        searchLabel={t('identity.users.search')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <div className="custom-scrollbar min-h-[120px] flex-1 lg:overflow-y-auto">
        {error ? (
          <div className="p-4">
            <EmptyState
              title={t('identity.users.loadFailed')}
              description={error.message}
              action={<Button size="sm" onClick={() => { void refresh() }}>{t('identity.common.actions.retry')}</Button>}
            />
          </div>
        ) : (
          <DataTable
            layout="fit"
            columns={columns}
            rows={table.pageItems}
            rowKey={user => user.id}
            density={table.density}
            ariaLabel={t('identity.navigation.sections.users')}
            rowAriaLabel={user => t('identity.users.rowAriaLabel', { name: userDisplayName(user) })}
            onRowClick={user => { onEntityChange(user.id) }}
            emptyContent={(
              <EmptyState
                title={isLoading ? t('identity.users.loading') : t('identity.users.empty.title')}
                description={t('identity.users.empty.description')}
              />
            )}
          />
        )}
      </div>
      {!error ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}
      <AddUserModal
        open={isAddUserOpen}
        isCreating={isMutating}
        error={mutationError}
        onClose={() => {
          clearMutationError()
          onSetAddUserOpen(false)
        }}
        onCreate={async input => {
          const created = await mutate(() => gateway.createUser(input))
          if (created) onSetAddUserOpen(false)
          return created
        }}
      />
    </IdentityContentPanel>
  )
}

interface UserDetailsProps {
  user: IdentityUserView
}

function UserDetails({ user }: UserDetailsProps) {
  const { t } = useTranslation()
  return (
    <IdentitySettingsSection title={t('identity.users.details.title')} description={t('identity.users.details.description')}>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label={t('identity.users.fields.username')} htmlFor="identity-user-username">
          <Input id="identity-user-username" value={user.username} readOnly />
        </Field>
        <Field label={t('identity.users.fields.email')} htmlFor="identity-user-email">
          <Input id="identity-user-email" value={user.email} readOnly />
        </Field>
        <Field label={t('identity.users.fields.firstName')} htmlFor="identity-user-first-name">
          <Input id="identity-user-first-name" value={user.firstName} readOnly />
        </Field>
        <Field label={t('identity.users.fields.lastName')} htmlFor="identity-user-last-name">
          <Input id="identity-user-last-name" value={user.lastName} readOnly />
        </Field>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('identity.users.fields.enabledStatus')}</span>
          <Badge color={user.enabled ? 'success' : 'light'}>
            {user.enabled ? t('identity.users.status.active') : t('identity.users.status.inactive')}
          </Badge>
        </div>
      </div>
    </IdentitySettingsSection>
  )
}

interface UserCredentialsProps {
  user: IdentityUserView
  actions: RequiredActionView[]
  disabled: boolean
  onToggle: (actionId: string, isRequired: boolean) => Promise<unknown>
}

function UserCredentials({ user, actions, disabled, onToggle }: UserCredentialsProps) {
  const { t } = useTranslation()
  return (
    <IdentitySettingsSection title={t('identity.users.credentials.title')} description={t('identity.users.credentials.description')}>
      <p className="mb-4 text-sm text-text-secondary">{t('identity.users.credentials.noValues')}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map(action => (
          <CheckboxField
            key={action.id}
            label={t('identity.users.credentials.requireAction', { action: action.name })}
            checked={user.requiredActionIds.includes(action.id)}
            disabled={disabled}
            onChange={event => { void onToggle(action.id, event.currentTarget.checked) }}
          />
        ))}
      </div>
    </IdentitySettingsSection>
  )
}

interface UserRoleMappingsProps {
  user: IdentityUserView
  roles: IdentityRoleView[]
  capabilities: IdentityCapabilityView[]
  disabled: boolean
  onToggle: (roleId: string, isAssigned: boolean) => Promise<unknown>
}

function UserRoleMappings({ user, roles, capabilities, disabled, onToggle }: UserRoleMappingsProps) {
  const { t } = useTranslation()
  const assigned = roles.filter(role => user.roleIds.includes(role.id))
  const available = roles.filter(role => !user.roleIds.includes(role.id))
  const effectiveCapabilityIds = new Set(assigned.flatMap(role => role.capabilityIds))
  const effectiveCapabilities = capabilities.filter(capability => effectiveCapabilityIds.has(capability.id))
  return (
    <div className="space-y-4 p-4">
      <RoleList
        title={t('identity.users.roles.assignedTitle')}
        roles={assigned}
        actionLabel={t('identity.common.actions.remove')}
        disabled={disabled}
        onAction={role => onToggle(role.id, false)}
        empty={t('identity.users.roles.assignedEmpty')}
      />
      <RoleList
        title={t('identity.users.roles.availableTitle')}
        roles={available}
        actionLabel={t('identity.common.actions.assign')}
        disabled={disabled}
        onAction={role => onToggle(role.id, true)}
        empty={t('identity.users.roles.availableEmpty')}
      />
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('identity.users.roles.capabilitiesTitle')}</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
          {effectiveCapabilities.map(capability => (
            <li key={capability.id}>
              <span className="font-medium text-text-primary">{capability.label}:</span> {capability.description}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

interface RoleListProps {
  title: string
  roles: IdentityRoleView[]
  actionLabel: string
  disabled: boolean
  onAction: (role: IdentityRoleView) => Promise<unknown>
  empty: string
}

function RoleList({ title, roles, actionLabel, disabled, onAction, empty }: RoleListProps) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {roles.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {roles.map(role => (
            <li key={role.id} className="flex min-w-0 items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{role.name}</p>
                <p className="text-xs text-text-muted">{role.description}</p>
              </div>
              <Button size="sm" variant="outline" disabled={disabled} onClick={() => { void onAction(role) }}>
                {actionLabel}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface UserSessionsProps {
  sessions: Session[]
}

function UserSessions({ sessions }: UserSessionsProps) {
  const { t } = useTranslation()
  const columns = useMemo<ColumnDef<Session>[]>(() => [
    { id: 'login', header: t('identity.users.sessions.columns.loginTime'), cell: session => new Date(session.loginTime).toLocaleString() },
    { id: 'ip', header: t('identity.users.sessions.columns.ipAddress'), cell: session => <span className="font-mono text-xs">{session.ipAddress}</span> },
    { id: 'status', header: t('identity.users.sessions.columns.status'), cell: session => session.status },
  ], [t])

  return sessions.length ? (
    <DataTable
      layout="fit"
      columns={columns}
      rows={sessions}
      rowKey={session => session.id}
      ariaLabel={t('identity.users.sessions.ariaLabel')}
    />
  ) : (
    <div className="p-4">
      <EmptyState title={t('identity.users.sessions.emptyTitle')} description={t('identity.users.sessions.emptyDescription')} />
    </div>
  )
}

const EMPTY_USER_INPUT: CreateIdentityUserInput = { username: '', email: '', firstName: '', lastName: '', enabled: true }

interface AddUserModalProps {
  open: boolean
  isCreating: boolean
  error: Error | null
  onClose: () => void
  onCreate: (input: CreateIdentityUserInput) => Promise<boolean>
}

function AddUserModal({ open, isCreating, error, onClose, onCreate }: AddUserModalProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState(EMPTY_USER_INPUT)
  const isValid = [input.username, input.email, input.firstName, input.lastName].every(value => value.trim().length > 0)
  const setField = (field: keyof CreateIdentityUserInput, value: string | boolean) => { setInput(current => ({ ...current, [field]: value })) }
  const resetAndClose = () => {
    if (isCreating) return
    setInput({ ...EMPTY_USER_INPUT })
    onClose()
  }
  const create = async () => {
    if (!isValid || isCreating) return
    if (await onCreate(input)) setInput({ ...EMPTY_USER_INPUT })
  }
  const footer = (
    <>
      <Button size="sm" variant="ghost" disabled={isCreating} onClick={resetAndClose}>
        {t('identity.common.actions.cancel')}
      </Button>
      <Button size="sm" disabled={!isValid || isCreating} onClick={() => { void create() }}>
        {isCreating ? t('identity.users.add.creating') : t('identity.users.add.create')}
      </Button>
    </>
  )

  return (
    <Modal open={open} onClose={resetAndClose} title={t('identity.actions.addUser')} footer={footer}>
      <div className="space-y-4 px-6 py-4">
        {error ? <Alert variant="error" title={t('identity.users.add.failed')} description={error.message} /> : null}
        <p className="text-xs text-text-muted">{t('identity.users.add.description')}</p>
        <Field label={t('identity.users.fields.username')} htmlFor="new-user-username">
          <Input id="new-user-username" value={input.username} disabled={isCreating} onChange={event => { setField('username', event.currentTarget.value) }} />
        </Field>
        <Field label={t('identity.users.fields.email')} htmlFor="new-user-email">
          <Input id="new-user-email" type="email" value={input.email} disabled={isCreating} onChange={event => { setField('email', event.currentTarget.value) }} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('identity.users.fields.firstName')} htmlFor="new-user-first-name">
            <Input id="new-user-first-name" value={input.firstName} disabled={isCreating} onChange={event => { setField('firstName', event.currentTarget.value) }} />
          </Field>
          <Field label={t('identity.users.fields.lastName')} htmlFor="new-user-last-name">
            <Input id="new-user-last-name" value={input.lastName} disabled={isCreating} onChange={event => { setField('lastName', event.currentTarget.value) }} />
          </Field>
        </div>
        <CheckboxField
          label={t('identity.common.status.enabled')}
          checked={input.enabled}
          disabled={isCreating}
          onChange={event => { setField('enabled', event.currentTarget.checked) }}
        />
      </div>
    </Modal>
  )
}
