import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DataTableRequestState,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { useTranslation } from '@/hooks/useTranslation'
import { useDeletePlatformProvider } from '../hooks/useDeletePlatformProvider'
import { toPlatformProviderJson } from '../helpers/platformProviderJson'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { SmtpProviderDetailsDialog } from './SmtpProviderDetailsDialog'
import { PlatformProvidersModal } from './PlatformProvidersModal'

function credentialStatusColor(status: PlatformProviderRecord['credentialStatus']) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function providerUrl(value: string | undefined) {
  return value ? (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-0 items-center gap-1.5 font-mono text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
    >
      <span className="truncate">{value}</span>
      <ExternalLinkIcon className="size-3.5 shrink-0" />
    </a>
  ) : '-'
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
      cell: provider => <span className="block max-w-md truncate" title={provider.description}>{provider.description || '-'}</span>,
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
        <span className="block max-w-72 truncate font-mono text-[12px] text-text-secondary" title={provider.url}>
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

function PlatformProviderDetail({ provider }: { provider: PlatformProviderRecord }) {
  const { t } = useTranslation()
  const credentialStatus = (
    <Badge color={credentialStatusColor(provider.credentialStatus)} size="sm">
      {t(`providers.credentials.status.${provider.credentialStatus}`)}
    </Badge>
  )

  return (
    <dl className="px-5 py-2">
      <DetailRow label={t('details.providerId')} value={<span className="font-mono">{provider.id}</span>} />
      <DetailRow label={t('details.type')} value={provider.type} />
      <DetailRow label={t('details.url')} value={providerUrl(provider.url)} />
      <DetailRow label={t('details.description')} value={provider.description || '-'} />

      {provider.type === 'AIRFLOW' ? (
        <>
          <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{provider.ipAddress}</span>} />
          <DetailRow label={t('details.port')} value={<span className="font-mono">{provider.port}</span>} />
          <DetailRow label={t('details.dagDir')} value={<span className="font-mono">{provider.dagDir || '-'}</span>} />
          <DetailRow label={t('details.credential')} value={<span className="font-mono">{provider.credentialId || '-'}</span>} />
          <DetailRow label={t('details.credentialStatus')} value={credentialStatus} />
          <DetailRow label={t('details.notificationEmail')} value={provider.notificationEmail ?? '-'} />
        </>
      ) : null}

      {provider.type === 'SMTP' ? (
        <>
          <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{provider.ipAddress}</span>} />
          <DetailRow label={t('details.port')} value={<span className="font-mono">{provider.port}</span>} />
          <DetailRow label={t('details.fromEmail')} value={provider.fromEmail ?? '-'} />
          <DetailRow label={t('details.disableSsl')} value={provider.disableSsl == null ? '-' : String(provider.disableSsl)} />
          <DetailRow label={t('details.disableTls')} value={provider.disableTls == null ? '-' : String(provider.disableTls)} />
        </>
      ) : null}

      {provider.type === 'BACKEND' ? (
        <>
          <DetailRow label={t('details.notificationEmail')} value={provider.notificationEmail ?? '-'} />
          <DetailRow label={t('details.loggingEnabled')} value={provider.loggingEnabled == null ? '-' : String(provider.loggingEnabled)} />
          <DetailRow label={t('details.jwtEnabled')} value={provider.jwtEnabled == null ? '-' : String(provider.jwtEnabled)} />
          <DetailRow label={t('details.swaggerEnables')} value={provider.swaggerEnables == null ? '-' : String(provider.swaggerEnables)} />
        </>
      ) : null}

      {provider.type === 'KEYCLOAK' ? (
        <>
          <DetailRow label={t('details.realm')} value={provider.realm || '-'} />
          <DetailRow label={t('details.clientId')} value={<span className="font-mono">{provider.clientId || '-'}</span>} />
          <DetailRow label={t('details.credential')} value={<span className="font-mono">{provider.credentialId || '-'}</span>} />
          <DetailRow label={t('details.credentialStatus')} value={credentialStatus} />
        </>
      ) : null}
    </dl>
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
  const [isSmtpDialogOpen, setIsSmtpDialogOpen] = useState(false)
  const loadErrorDescription = extractBackendErrorDetail(error)
  const deleteErrorDescription = extractBackendErrorDetail(deleteProvider.error)
  const rows = useMemo(() => providers, [providers])
  const selected = rows.find(provider => provider.id === selectedId) ?? null
  const jsonViewed = rows.find(provider => provider.id === jsonViewId) ?? null
  const columns = getColumns(t, setJsonViewId)
  const table = useTableState(rows, { searchFields: ['name', 'id', 'type'] })

  return (
    <div className="flex flex-col">
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

      {(!error || providers.length > 0) ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          isLoading={isLoading}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}

      <DetailDrawer
        open={selected !== null && !isSmtpDialogOpen}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('drawer.selectedProvider')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? (
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Badge color="info" size="sm">{selected.type}</Badge>
            {selected.type === 'SMTP' ? (
              <Button size="sm" variant="outline" onClick={() => { setIsSmtpDialogOpen(true) }}>
                {t('platformProviders.smtpDialog.button')}
              </Button>
            ) : null}
          </div>
        ) : null}
        ariaLabel={t('drawer.providerDetail')}
        closeLabel={t('drawer.closeProvider')}
        footer={selected ? (
          <>
            <Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger" className="flex-1">
              {t('buttons.delete')}
            </Button>
            <Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm" className="flex-1">
              {t('buttons.edit')}
            </Button>
          </>
        ) : null}
      >
        {selected ? <PlatformProviderDetail provider={selected} /> : null}
      </DetailDrawer>

      {selected?.type === 'SMTP' ? (
        <SmtpProviderDetailsDialog
          open={isSmtpDialogOpen}
          provider={selected}
          onClose={() => { setIsSmtpDialogOpen(false) }}
        />
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
          deleteProvider.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('platformProviders.jsonViewer.title')}
        data={jsonViewed ? toPlatformProviderJson(jsonViewed) : null}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
