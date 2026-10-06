import { useMemo, useState, type ReactNode } from 'react'
import { DetailField, DetailFieldGroup, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { GridIcon } from '@/shared/icons/Icons'
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
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useGetRolesPermissions } from '@/generated/query/identity-access/identity-access.gen'
import { selectRolesPermissions, type IdentityRoleRecord } from '../model/rolesPermissionsTypes'

const ROLE_SEARCH_FIELDS: (keyof IdentityRoleRecord)[] = ['name', 'description', 'permissions', 'users']

// clientId null means the backend's Keycloak membership lookup failed, so membership is unknown rather than empty.
function hasKnownMembership(role: IdentityRoleRecord) {
  return role.clientId !== null
}

function BadgeList({ items }: { items: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {items.map(item => <Badge key={item} color="info" size="sm">{item}</Badge>)}
    </span>
  )
}

// The read-only role detail is one flat Overview, in the order of the original detail drawer.
// A render function, not a component: DetailView needs the section itself as its child.
// Unknown membership stays "—" (not "Not set"): the lookup failed, so the value is unknown
// rather than missing.
function renderRoleSections(role: IdentityRoleRecord, t: ReturnType<typeof useTranslation>['t']) {
  const knownMembership = hasKnownMembership(role)
  let users: ReactNode = '—'
  if (knownMembership) users = role.users.length > 0 ? <BadgeList items={role.users} /> : t('identity.roles.fields.usersEmpty')
  return (
    <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
      <DetailFieldGroup>
        <DetailField label={t('identity.roles.fields.name')} value={role.name} emphasis />
        <DetailField label={t('identity.roles.fields.description')} value={role.description?.trim()} wide />
        <DetailField label={t('identity.roles.fields.clientId')} value={role.clientId} mono copyValue={role.clientId ?? undefined} />
        <DetailField label={t('identity.roles.fields.userCount')} value={knownMembership ? String(role.userCount) : '—'} />
        <DetailField label={t('identity.roles.fields.permissions')} value={role.permissions.length > 0 ? <BadgeList items={role.permissions} /> : null} wide />
        <DetailField label={t('identity.roles.fields.users')} value={users} wide />
      </DetailFieldGroup>
    </DetailViewSection>
  )
}

export function RealmRolesSection() {
  const { t } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetRolesPermissions({ query: { select: selectRolesPermissions } })
  const roles = useMemo(() => data?.roles ?? [], [data?.roles])
  const table = useTableState(roles, { searchFields: ROLE_SEARCH_FIELDS })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = roles.find(role => role.id === selectedId) ?? null
  const loadErrorDescription = extractBackendErrorDetail(error)

  const columns = useMemo<ColumnDef<IdentityRoleRecord>[]>(() => [
    {
      id: 'name',
      header: t('identity.roles.columns.name'),
      cell: role => (
        <>
          <span className="block font-semibold text-text-primary">{role.name}</span>
          {role.description?.trim() ? <span className="mt-0.5 block text-[11px] text-text-subtle">{role.description}</span> : null}
        </>
      ),
    },
    { id: 'permissions', header: t('identity.roles.columns.permissions'), align: 'right', cell: role => String(role.permissions.length) },
    { id: 'users', header: t('identity.roles.columns.users'), align: 'right', cell: role => (hasKnownMembership(role) ? String(role.userCount) : '—') },
  ], [t])

  return (
    <>
      <DataTableSurface
        ariaLabel={t('identity.navigation.sections.realm-roles')}
        toolbar={(
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder={t('identity.roles.search')}
            searchLabel={t('identity.roles.search')}
            density={table.density}
            onDensityChange={table.setDensity}
          />
        )}
        pagination={(!error || roles.length > 0) ? (
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
          hasCachedData={roles.length > 0}
          error={error ? {
            title: t('identity.roles.loadFailed'),
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
            isLoading={isLoading}
            loadingRowCount={5}
            rowKey={role => role.id}
            density={table.density}
            ariaLabel={t('identity.navigation.sections.realm-roles')}
            rowAriaLabel={role => t('identity.roles.rowAriaLabel', { name: role.name })}
            onRowClick={role => { setSelectedId(role.id) }}
            selectedRowKey={selectedId}
            emptyContent={roles.length > 0 ? t('identity.roles.empty.filtered') : <EmptyState title={t('identity.roles.empty.title')} description={t('identity.roles.empty.description')} />}
          />
        </DataTableRequestState>
      </DataTableSurface>

      {selected ? (
        <DetailView
          // Keyed by role so each newly opened role starts expanded on Overview.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('identity.roles.drawer.entity')}
          title={selected.name}
          headerActions={<KeyedHelpPopover helpKey="identity.roles.help" sections={['permissions', 'users', 'client']} />}
          ariaLabel={t('identity.roles.drawer.ariaLabel')}
          closeLabel={t('identity.roles.drawer.close')}
        >
          {renderRoleSections(selected, t)}
        </DetailView>
      ) : null}
    </>
  )
}
