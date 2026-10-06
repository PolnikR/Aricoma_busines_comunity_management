import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { ApiIcon, GridIcon, NetworkIcon } from '@/shared/icons/Icons'
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DataTableRequestState,
  DataTableSurface,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import {
  DetailField,
  DetailFieldGroup,
  DetailFieldLink,
  DetailTechnicalGroup,
  DetailView,
  DetailViewSection,
} from '@/shared/components/detail-view'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useDeletePlatformProvider } from '@/generated/query/platform-providers/platform-providers.gen'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersModal } from './PlatformProvidersModal'

function credentialStatusColor(status: PlatformProviderRecord['credentialStatus']) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (providerId: string) => void,
): ColumnDef<PlatformProviderRecord>[] {
  return [
    {
      id: 'name',
      header: t('tables.provider.name'),
      cell: provider => (
        <>
          <span className="block font-semibold text-text-primary">{provider.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{provider.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.provider.description'),
      cell: provider => <span className="block max-w-md truncate" title={provider.description ?? undefined}>{(provider.description ?? '') || '-'}</span>,
    },
    {
      id: 'type',
      header: t('tables.provider.type'),
      cell: provider => <Badge color="info" size="sm">{provider.type}</Badge>,
    },
    {
      id: 'url',
      header: t('details.url'),
      cell: provider => (
        <span className="block max-w-72 truncate font-mono text-[12px] text-text-secondary" title={provider.url ?? undefined}>
          {provider.url ?? '-'}
        </span>
      ),
    },
    {
      id: 'json',
      header: t('tables.common.json'),
      cell: provider => (
        <Button
          size="xs"
          variant="soft"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            onViewJson(provider.id)
          }}
        >
          {t('buttons.viewJson')}
        </Button>
      ),
    },
  ]
}

// Raw boolean settings as the backend reports them; unset stays "Not set".
const flag = (value: boolean | null | undefined) => (value == null ? null : String(value))

// Sections of a platform provider: Overview (what it is and its type-specific settings),
// Connection for the types that connect to a host or realm, and Technical for its ID. The
// credential state is a header status and is not repeated here. A render function, not a
// component: DetailView needs the sections themselves as its (fragment) children.
function renderPlatformProviderSections(provider: PlatformProviderRecord, t: ReturnType<typeof useTranslation>['t']) {
  const connects = provider.type === 'AIRFLOW' || provider.type === 'SMTP' || provider.type === 'KEYCLOAK'
  return (
    <>
      <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
        <DetailFieldGroup>
          <DetailField label={t('details.type')} value={provider.type} emphasis />
          <DetailField label={t('details.description')} value={provider.description} wide />
          <DetailField
            label={t('details.url')}
            value={provider.url ? <DetailFieldLink href={provider.url} external>{provider.url}</DetailFieldLink> : null}
            mono
            wide
          />
          {provider.type === 'AIRFLOW' || provider.type === 'BACKEND' ? (
            <DetailField label={t('details.notificationEmail')} value={provider.notificationEmail} />
          ) : null}
          {provider.type === 'SMTP' ? <DetailField label={t('details.fromEmail')} value={provider.fromEmail} /> : null}
          {provider.type === 'BACKEND' ? (
            <>
              <DetailField label={t('details.loggingEnabled')} value={flag(provider.loggingEnabled)} />
              <DetailField label={t('details.jwtEnabled')} value={flag(provider.jwtEnabled)} />
              <DetailField label={t('details.swaggerEnabled')} value={flag(provider.swaggerEnabled)} />
            </>
          ) : null}
          {provider.type === 'KEYCLOAK' ? <DetailField label={t('details.realm')} value={provider.realm} /> : null}
        </DetailFieldGroup>
      </DetailViewSection>
      {connects ? (
        <DetailViewSection id="connection" title={t('detailView.connection')} icon={NetworkIcon}>
          <DetailFieldGroup>
            {provider.type === 'AIRFLOW' || provider.type === 'SMTP' ? (
              <>
                <DetailField label={t('details.ipAddress')} value={provider.ipAddress} mono copyValue={provider.ipAddress ?? undefined} />
                <DetailField label={t('details.port')} value={String(provider.port)} mono />
              </>
            ) : null}
            {provider.type === 'AIRFLOW' ? (
              <DetailField label={t('details.dagDir')} value={provider.dagDir} mono wide copyValue={provider.dagDir ?? undefined} />
            ) : null}
            {provider.type === 'SMTP' ? (
              <>
                <DetailField label={t('details.disableSsl')} value={flag(provider.disableSsl)} />
                <DetailField label={t('details.disableTls')} value={flag(provider.disableTls)} />
              </>
            ) : null}
            {provider.type === 'KEYCLOAK' ? (
              <DetailField label={t('details.clientId')} value={provider.clientId} mono copyValue={provider.clientId ?? undefined} />
            ) : null}
            {provider.type === 'AIRFLOW' || provider.type === 'KEYCLOAK' ? (
              <DetailField label={t('details.credential')} value={provider.credentialId} mono />
            ) : null}
          </DetailFieldGroup>
        </DetailViewSection>
      ) : null}
      <DetailViewSection id="technical" title={t('detailView.technical')} icon={ApiIcon} description={t('detailView.technicalDescription')} secondary>
        <DetailTechnicalGroup>
          <DetailField label={t('details.providerId')} value={provider.id} copyValue={provider.id} />
        </DetailTechnicalGroup>
      </DetailViewSection>
    </>
  )
}

interface PlatformProvidersTableProps {
  providers: PlatformProviderRecord[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function PlatformProvidersTable({
  providers,
  isLoading,
  error,
  isRetrying,
  onRetry,
}: PlatformProvidersTableProps) {
  const { t } = useTranslation()
  const deleteProvider = useDeletePlatformProvider()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlatformProviderRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlatformProviderRecord | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const loadErrorDescription = extractBackendErrorDetail(error)
  const deleteErrorDescription = extractBackendErrorDetail(deleteProvider.error)
  const rows = useMemo(() => providers, [providers])
  const selected = rows.find(provider => provider.id === selectedId) ?? null
  const jsonViewed = rows.find(provider => provider.id === jsonViewId) ?? null
  const columns = getColumns(t, setJsonViewId)
  const table = useTableState(rows, { searchFields: ['name', 'id', 'type'] })

  const toolbar = (
    <>
      {deleteProvider.error ? (
        <Alert
          className="mx-4 mt-4"
          title={t('platformProviders.dialogs.delete')}
          {...(deleteErrorDescription ? { description: deleteErrorDescription } : {})}
          variant="error"
        />
      ) : null}
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('platformProviders.searchPlaceholder')}
        searchLabel={t('platformProviders.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
    </>
  )

  const pagination = (!error || providers.length > 0) ? (
    <DataTablePagination
      page={table.page}
      pageSize={table.pageSize}
      total={table.total}
      isLoading={isLoading}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
    />
  ) : null

  return (
    <>
      <DataTableSurface
        ariaLabel={isLoading ? t('platformProviders.loading') : t('platformProviders.tableLabel')}
        toolbar={toolbar}
        pagination={pagination}
      >
      <DataTableRequestState
        hasCachedData={providers.length > 0}
        error={error ? {
          title: t('platformProviders.loadFailed'),
          ...(loadErrorDescription ? { description: loadErrorDescription } : {}),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          isLoading={isLoading}
          rowKey={provider => provider.id}
          density={table.density}
          minWidthClassName="min-w-180"
          ariaLabel={isLoading ? t('platformProviders.loading') : t('platformProviders.tableLabel')}
          onRowClick={provider => { setSelectedId(provider.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('platformProviders.noMatches') : t('platformProviders.empty')}
        />
      </DataTableRequestState>
      </DataTableSurface>

      {selected ? (
        <DetailView
          // Keyed by provider so each newly opened provider starts expanded on Overview.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('drawer.entity.platformProvider')}
          title={selected.name}
          statuses={[
            <Badge key="type" color="info" size="sm">{selected.type}</Badge>,
            selected.type === 'AIRFLOW' || selected.type === 'KEYCLOAK' ? (
              <Badge key="credential" color={credentialStatusColor(selected.credentialStatus)} size="sm">
                {t(`providers.credentials.status.${selected.credentialStatus}`)}
              </Badge>
            ) : null,
          ]}
          headerActions={<KeyedHelpPopover helpKey="platformProviders.help" sections={['airflow', 'keycloak', 'smtp', 'backend']} />}
          ariaLabel={t('drawer.providerDetail')}
          closeLabel={t('drawer.closeProvider')}
          footerStart={(
            <Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger">
              {t('buttons.delete')}
            </Button>
          )}
          footer={(
            <Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm">
              {t('buttons.edit')}
            </Button>
          )}
        >
          {renderPlatformProviderSections(selected, t)}
        </DetailView>
      ) : null}

      {editing ? (
        <PlatformProvidersModal
          open
          onClose={() => { setEditing(null) }}
          existingProviders={rows}
          provider={editing}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('platformProviders.dialogs.delete')}
        message={t('dialogs.deleteProviderMessage').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deleteProvider.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteProvider.mutate({ params: { provider_id: deleteTarget.id } }, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('platformProviders.jsonViewer.title')}
        data={jsonViewed}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </>
  )
}
