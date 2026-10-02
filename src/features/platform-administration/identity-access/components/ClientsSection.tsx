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
  SkeletonBlock,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { useGetIdentityClientClientUuid, useGetIdentityClients } from '@/generated/query/identity-access/identity-access.gen'
import type { IdentityClient } from '@/generated/query/zod'

type ClientRecord = IdentityClient

const CLIENT_SEARCH_FIELDS: (keyof ClientRecord)[] = ['displayName', 'clientId', 'protocol']

function ClientStatusBadge({ client }: { client: Pick<ClientRecord, 'enabled' | 'isPreview'> }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge color={client.enabled ? 'success' : 'light'} size="sm">
        {client.enabled ? t('identity.common.status.enabled') : t('identity.common.status.disabled')}
      </Badge>
      {/* Real Keycloak data is never a preview; surface it only if the backend unexpectedly says so. */}
      {client.isPreview ? <Badge color="warning" size="sm">{t('identity.clients.status.previewOnly')}</Badge> : null}
    </span>
  )
}

function ClientTypeBadge({ isPublicClient }: { isPublicClient: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge color="info" size="sm">
      {isPublicClient ? t('identity.clients.type.public') : t('identity.clients.type.confidential')}
    </Badge>
  )
}

function ClientDetailRows({ client }: { client: ClientRecord }) {
  const { t } = useTranslation()
  // Roles come from the detail endpoint only; the list endpoint intentionally returns roles: [].
  const roles = client.roles ?? []

  return (
    <dl className="px-5 py-2">
      <DetailRow label={t('identity.clients.fields.id')} value={<span className="font-mono">{client.id}</span>} />
      <DetailRow label={t('identity.clients.fields.clientId')} value={<span className="font-mono">{client.clientId}</span>} />
      <DetailRow label={t('identity.clients.fields.displayName')} value={client.displayName || '—'} />
      <DetailRow label={t('identity.clients.fields.protocol')} value={client.protocol || '—'} />
      <DetailRow label={t('identity.clients.fields.status')} value={<ClientStatusBadge client={client} />} />
      <DetailRow label={t('identity.clients.fields.type')} value={<ClientTypeBadge isPublicClient={client.isPublicClient} />} />
      <DetailRow
        label={t('identity.clients.fields.roles')}
        value={roles.length > 0 ? (
          <span className="flex flex-wrap justify-end gap-1">
            {roles.map(role => <Badge key={role.id} color="info" size="sm">{role.name}</Badge>)}
          </span>
        ) : t('identity.clients.fields.rolesEmpty')}
      />
    </dl>
  )
}

function ClientDetailLoading() {
  const { t } = useTranslation()
  const labels = ['id', 'clientId', 'displayName', 'protocol', 'status', 'type', 'roles']
  return (
    <dl className="px-5 py-2" aria-busy="true" aria-label={t('identity.clients.detail.loading')}>
      {labels.map(field => (
        <DetailRow key={field} label={t(`identity.clients.fields.${field}`)} value={<SkeletonBlock className="ml-auto h-4 w-32" />} />
      ))}
    </dl>
  )
}

// Mounted only while a client is selected, so the detail request never runs without a valid internal UUID.
function ClientDetail({ clientUuid }: { clientUuid: string }) {
  const { t } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetIdentityClientClientUuid(clientUuid)
  const errorDescription = extractBackendErrorDetail(error)

  if (error && !data) {
    return (
      <div className="px-5 py-4">
        <FetchErrorAlert
          title={t('identity.clients.detail.loadFailed')}
          {...(errorDescription ? { description: errorDescription } : {})}
          retryLabel={t('identity.common.actions.retry')}
          isRetrying={isFetching}
          onRetry={() => { void refetch() }}
        />
      </div>
    )
  }
  if (isLoading || !data) return <ClientDetailLoading />
  return <ClientDetailRows client={data} />
}

export function ClientsSection() {
  const { t } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetIdentityClients()
  const clients = useMemo(() => data?.clients ?? [], [data?.clients])
  const table = useTableState(clients, { searchFields: CLIENT_SEARCH_FIELDS })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = clients.find(client => client.id === selectedId) ?? null
  const loadErrorDescription = extractBackendErrorDetail(error)

  const columns = useMemo<ColumnDef<ClientRecord>[]>(() => [
    {
      id: 'client',
      header: t('identity.clients.columns.client'),
      cell: client => (
        <>
          <span className="block font-semibold text-text-primary">{client.displayName || client.clientId}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{client.clientId}</span>
        </>
      ),
    },
    { id: 'protocol', header: t('identity.clients.columns.protocol'), cell: client => client.protocol || '—' },
    { id: 'type', header: t('identity.clients.columns.type'), cell: client => <ClientTypeBadge isPublicClient={client.isPublicClient} /> },
    { id: 'status', header: t('identity.clients.columns.status'), cell: client => <ClientStatusBadge client={client} /> },
  ], [t])

  return (
    <>
      <DataTableSurface
        ariaLabel={t('identity.navigation.sections.clients')}
        toolbar={(
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder={t('identity.clients.search')}
            searchLabel={t('identity.clients.search')}
            density={table.density}
            onDensityChange={table.setDensity}
          />
        )}
        pagination={(!error || clients.length > 0) ? (
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
          hasCachedData={clients.length > 0}
          error={error ? {
            title: t('identity.clients.loadFailed'),
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
            rowKey={client => client.id}
            density={table.density}
            ariaLabel={t('identity.navigation.sections.clients')}
            rowAriaLabel={client => t('identity.clients.rowAriaLabel', { clientId: client.clientId })}
            onRowClick={client => { setSelectedId(client.id) }}
            selectedRowKey={selectedId}
            emptyContent={clients.length > 0 ? t('identity.clients.empty.filtered') : <EmptyState title={t('identity.clients.empty.title')} description={t('identity.clients.empty.description')} />}
          />
        </DataTableRequestState>
      </DataTableSurface>

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        title={selected ? (selected.displayName || selected.clientId) : ''}
        meta={selected ? [
          t('identity.clients.drawer.entity'),
          <ClientStatusBadge key="status" client={selected} />,
        ] : []}
        subtitle={selected ? <span className="font-mono">{selected.clientId}</span> : undefined}
        headerActions={<KeyedHelpPopover helpKey="identity.clients.help" sections={['roles', 'type']} />}
        ariaLabel={t('identity.clients.drawer.ariaLabel')}
        closeLabel={t('identity.clients.drawer.close')}
        resizeLabel={t('drawer.resize')}
      >
        {selected ? <ClientDetail clientUuid={selected.id} /> : null}
      </DetailDrawer>
    </>
  )
}
