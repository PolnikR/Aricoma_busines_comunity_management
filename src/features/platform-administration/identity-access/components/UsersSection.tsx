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
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { DetailField, DetailFieldGroup, DetailTechnicalGroup, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { ApiIcon, GridIcon, ShieldIcon } from '@/shared/icons/Icons'
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

// Sections of the read-only user detail. A render function, not a component: DetailView needs
// the sections as its (fragment) children. The status is a header badge, not repeated here.
function renderUserSections(user: UserRecord, t: ReturnType<typeof useTranslation>['t'], language: ReturnType<typeof useTranslation>['language']) {
  let emailVerified: string | null = null
  if (user.emailVerified === true) emailVerified = t('common.yes')
  if (user.emailVerified === false) emailVerified = t('common.no')

  return (
    <>
      <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
        <DetailFieldGroup title={t('identity.detail.profile')}>
          <DetailField label={t('identity.users.fields.user')} value={user.user} emphasis />
          <DetailField label={t('identity.users.fields.username')} value={user.username} />
          <DetailField label={t('identity.users.fields.email')} value={user.email} />
          <DetailField label={t('identity.users.fields.emailVerified')} value={emailVerified} />
        </DetailFieldGroup>
        <DetailFieldGroup title={t('identity.detail.account')}>
          <DetailField label={t('identity.users.fields.createdAt')} value={user.createdAt ? formatDateTime(user.createdAt, { language }) : null} />
          <DetailField label={t('identity.users.fields.activeSessionStart')} value={user.activeSessionStart ? formatDateTime(user.activeSessionStart, { language }) : null} />
        </DetailFieldGroup>
      </DetailViewSection>
      <DetailViewSection id="roles" title={t('identity.users.fields.roles')} icon={ShieldIcon} count={user.roles.length}>
        <DetailFieldGroup>
          <DetailField
            label={t('identity.users.fields.roles')}
            value={user.roles.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {user.roles.map(role => <Badge key={role} color="info" size="sm">{role}</Badge>)}
              </span>
            ) : null}
            wide
          />
        </DetailFieldGroup>
      </DetailViewSection>
      <DetailViewSection id="technical" title={t('detailView.technical')} icon={ApiIcon} description={t('detailView.technicalDescription')} secondary>
        <DetailTechnicalGroup>
          <DetailField label={t('identity.users.fields.id')} value={user.id} copyValue={user.id} />
        </DetailTechnicalGroup>
      </DetailViewSection>
    </>
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

      {selected ? (
        <DetailView
          // Keyed by user so each newly opened user starts expanded on Overview.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('identity.users.drawer.entity')}
          title={selected.user}
          statuses={[<UserStatusBadge key="status" status={selected.status} />]}
          meta={selected.username}
          headerActions={<KeyedHelpPopover helpKey="identity.users.help" sections={['roles', 'status']} />}
          ariaLabel={t('identity.users.drawer.ariaLabel')}
          closeLabel={t('identity.users.drawer.close')}
        >
          {renderUserSections(selected, t, language)}
        </DetailView>
      ) : null}
    </>
  )
}
