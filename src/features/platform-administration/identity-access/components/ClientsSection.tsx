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
  SkeletonBlock,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { DetailField, DetailOverview, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { GridIcon } from '@/shared/icons/Icons'
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

function ClientDetailLoading() {
  const { t } = useTranslation()
  const labels = ['displayName', 'protocol', 'type', 'roles', 'id', 'clientId']
  return (
    <div aria-busy="true" aria-label={t('identity.clients.detail.loading')}>
      <DetailOverview>
        {labels.map(field => (
          <DetailField key={field} label={t(`identity.clients.fields.${field}`)} value={<SkeletonBlock className="h-4 w-32" />} />
        ))}
      </DetailOverview>
    </div>
  )
}

interface ClientDetailViewProps {
  // The selected list record: its internal UUID drives the detail request.
  client: ClientRecord
  onClose: () => void
}

// Mounted only while a client is selected, so the detail request never runs without a valid
// internal UUID. The view always has one Overview section (no navigation): the skeleton or the
// error until the detail arrives, then the fields in the order of the original detail drawer.
function ClientDetailView({ client, onClose }: ClientDetailViewProps) {
  const { t } = useTranslation()
  const { data, isLoading, isFetching, error, refetch } = useGetIdentityClientClientUuid(client.id)
  const errorDescription = extractBackendErrorDetail(error)
  // Roles come from the detail endpoint only; the list endpoint intentionally returns roles: [].
  const roles = data?.roles ?? []

  let sections
  if (error && !data) {
    sections = (
      <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
        <FetchErrorAlert
          title={t('identity.clients.detail.loadFailed')}
          {...(errorDescription ? { description: errorDescription } : {})}
          retryLabel={t('identity.common.actions.retry')}
          isRetrying={isFetching}
          onRetry={() => { void refetch() }}
        />
      </DetailViewSection>
    )
  } else if (isLoading || !data) {
    sections = (
      <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
        <ClientDetailLoading />
      </DetailViewSection>
    )
  } else {
    sections = (
      <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
        <DetailOverview>
          <DetailField label={t('identity.clients.fields.id')} value={data.id} mono copyValue={data.id} />
          <DetailField label={t('identity.clients.fields.clientId')} value={data.clientId} mono copyValue={data.clientId} />
          <DetailField label={t('identity.clients.fields.displayName')} value={data.displayName} emphasis />
          <DetailField label={t('identity.clients.fields.protocol')} value={data.protocol} />
          <DetailField label={t('identity.clients.fields.status')} value={<ClientStatusBadge client={data} />} />
          <DetailField label={t('identity.clients.fields.type')} value={<ClientTypeBadge isPublicClient={data.isPublicClient} />} />
          <DetailField
            label={t('identity.clients.fields.roles')}
            value={roles.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {roles.map(role => <Badge key={role.id} color="info" size="sm">{role.name}</Badge>)}
              </span>
            ) : t('identity.clients.fields.rolesEmpty')}
            wide
          />
        </DetailOverview>
      </DetailViewSection>
    )
  }

  return (
    <DetailView
      open
      onClose={onClose}
      size="md"
      entityLabel={t('identity.clients.drawer.entity')}
      title={client.displayName || client.clientId}
      statuses={[<ClientStatusBadge key="status" client={client} />]}
      headerActions={<KeyedHelpPopover helpKey="identity.clients.help" sections={['roles', 'type']} />}
      ariaLabel={t('identity.clients.drawer.ariaLabel')}
      closeLabel={t('identity.clients.drawer.close')}
    >
      {sections}
    </DetailView>
  )
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

      {selected ? (
        // Keyed by client so each newly opened client starts expanded on Overview.
        <ClientDetailView key={selected.id} client={selected} onClose={() => { setSelectedId(null) }} />
      ) : null}
    </>
  )
}
