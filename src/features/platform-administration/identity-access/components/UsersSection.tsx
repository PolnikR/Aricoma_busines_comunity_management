import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSurface,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useGetUsers } from '@/generated/query/identity-access/identity-access.gen'
import type { UserRecord } from '@/generated/query/zod'

const USER_SEARCH_FIELDS: (keyof UserRecord)[] = ['user', 'username', 'email', 'roles']

function dateLocale(language: string) {
  if (language === 'sk') return 'sk-SK'
  if (language === 'cs') return 'cs-CZ'
  return 'en-GB'
}

// Locale-aware; no timeZone option, so the browser's timezone applies.
function formatUserTimestamp(value: string | null | undefined, language: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(dateLocale(language), { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function UserStatusBadge({ status }: { status: UserRecord['status'] }) {
  const { t } = useTranslation()
  return (
    <Badge color={status === 'Active' ? 'success' : 'light'} size="sm">
      {status === 'Active' ? t('identity.common.status.active') : t('identity.common.status.disabled')}
    </Badge>
  )
}

export function UsersSection() {
  const { t, language } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetUsers()
  const users = useMemo(() => data?.users ?? [], [data?.users])
  const table = useTableState(users, { searchFields: USER_SEARCH_FIELDS })
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
    { id: 'roles', header: t('identity.users.columns.roles'), cell: user => user.roles.join(', ') || '—' },
    { id: 'status', header: t('identity.users.columns.status'), cell: user => <UserStatusBadge status={user.status} /> },
    { id: 'activeSessionStart', header: t('identity.users.columns.activeSessionStart'), cell: user => formatUserTimestamp(user.activeSessionStart, language) },
  ], [language, t])

  return (
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
          emptyContent={users.length > 0 ? t('common.noResults') : (
            <EmptyState
              title={t('identity.users.empty.title')}
              description={t('identity.users.empty.description')}
            />
          )}
        />
      </DataTableRequestState>
    </DataTableSurface>
  )
}
