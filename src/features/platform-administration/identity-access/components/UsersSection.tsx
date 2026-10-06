import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSurface,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { formatDateTime } from '@/shared/utils/dateTime'
import { useGetUsers } from '@/generated/query/identity-access/identity-access.gen'
import type { UserRecord } from '@/generated/query/zod'

const USER_SEARCH_FIELDS: (keyof UserRecord)[] = ['user', 'username', 'email', 'roles']

function UserStatusBadge({ status }: { status: UserRecord['status'] }) {
  const { t } = useTranslation()
  return (
    <Badge color={status === 'Active' ? 'success' : 'light'} size="sm">
      {status === 'Active' ? t('identity.common.status.active') : t('identity.common.status.disabled')}
    </Badge>
  )
}

function UserDetail({ user }: { user: UserRecord }) {
  const { t, language } = useTranslation()
  let emailVerified = '—'
  if (user.emailVerified === true) emailVerified = t('common.yes')
  if (user.emailVerified === false) emailVerified = t('common.no')

  return (
    <dl className="px-5 py-2">
      <DetailRow label={t('identity.users.fields.id')} value={<span className="font-mono">{user.id}</span>} />
      <DetailRow label={t('identity.users.fields.user')} value={user.user || '—'} />
      <DetailRow label={t('identity.users.fields.username')} value={user.username || '—'} />
      <DetailRow label={t('identity.users.fields.email')} value={(user.email ?? '') || '—'} />
      <DetailRow label={t('identity.users.fields.emailVerified')} value={emailVerified} />
      <DetailRow label={t('identity.users.fields.createdAt')} value={formatDateTime(user.createdAt, { language })} />
      <DetailRow
        label={t('identity.users.fields.roles')}
        value={user.roles.length > 0 ? (
          <span className="flex flex-wrap justify-end gap-1">
            {user.roles.map(role => <Badge key={role} color="info" size="sm">{role}</Badge>)}
          </span>
        ) : '—'}
      />
      <DetailRow label={t('identity.users.fields.status')} value={<UserStatusBadge status={user.status} />} />
      <DetailRow label={t('identity.users.fields.activeSessionStart')} value={formatDateTime(user.activeSessionStart, { language })} />
    </dl>
  )
}

export function UsersSection() {
  const { t, language } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetUsers()
  const users = useMemo(() => data?.users ?? [], [data?.users])
  const table = useTableState(users, { searchFields: USER_SEARCH_FIELDS })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = users.find(user => user.id === selectedId) ?? null
  const loadErrorDescription = extractBackendErrorDetail(error)

  const columns = useMemo<ColumnDef<UserRecord>[]>(() => [
    {
      id: 'user',
      header: t('identity.users.columns.user'),
      cell: user => (
        <>
          <span className="block font-semibold text-text-primary">{user.user}</span>
          {user.email ? <span className="mt-0.5 block text-[11px] text-text-subtle">{user.email}</span> : null}
        </>
      ),
    },
    { id: 'username', header: t('identity.users.columns.username'), cell: user => user.username },
    { id: 'roles', header: t('identity.users.columns.roles'), cell: user => (user.roles.length > 0 ? String(user.roles.length) : '—') },
    { id: 'status', header: t('identity.users.columns.status'), cell: user => <UserStatusBadge status={user.status} /> },
    { id: 'activeSessionStart', header: t('identity.users.columns.activeSessionStart'), cell: user => formatDateTime(user.activeSessionStart, { language }) },
  ], [language, t])

  return (
    <>
      <DataTableSurface
        ariaLabel={t('identity.navigation.sections.users')}
        toolbar={(
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder={t('identity.users.search')}
            searchLabel={t('identity.users.search')}
            density={table.density}
            onDensityChange={table.setDensity}
          />
        )}
        pagination={(!error || users.length > 0) ? (
          <DataTablePagination
            page={table.page}
            pageSize={table.pageSize}
            total={table.total}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            isLoading={isLoading}
          />
        ) : null}
      >
        <DataTableRequestState
          hasCachedData={users.length > 0}
          error={error ? {
            title: t('identity.users.loadFailed'),
            ...(loadErrorDescription ? { description: loadErrorDescription } : {}),
            retryLabel: t('identity.common.actions.retry'),
            isRetrying: isFetching,
            onRetry: () => { void refetch() },
          } : null}
        >
          <DataTable
            layout="fit"
            columns={columns}
            rows={table.pageItems}
            rowKey={user => user.id}
            density={table.density}
            ariaLabel={t('identity.navigation.sections.users')}
            isLoading={isLoading}
            rowAriaLabel={user => t('identity.users.rowAriaLabel', { name: user.user })}
            onRowClick={user => { setSelectedId(user.id) }}
            selectedRowKey={selectedId}
            emptyContent={users.length > 0 ? t('common.noResults') : (
              <EmptyState
                title={t('identity.users.empty.title')}
                description={t('identity.users.empty.description')}
              />
            )}
          />
        </DataTableRequestState>
      </DataTableSurface>

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        title={selected?.user ?? ''}
        meta={selected ? [
          t('identity.users.drawer.entity'),
          <UserStatusBadge key="status" status={selected.status} />,
        ] : []}
        subtitle={selected?.username}
        headerActions={<KeyedHelpPopover helpKey="identity.users.help" sections={['roles', 'status']} />}
        ariaLabel={t('identity.users.drawer.ariaLabel')}
        closeLabel={t('identity.users.drawer.close')}
        resizeLabel={t('drawer.resize')}
      >
        {selected ? <UserDetail user={selected} /> : null}
      </DetailDrawer>
    </>
  )
}
