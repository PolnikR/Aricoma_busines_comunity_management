import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import {
  DataTable,
  DataTableSkeleton,
  DataTableToolbar,
  DataTablePagination,
  DataTableRequestState,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { PlugIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { useDeleteProvider } from '../hooks/useDeleteProvider'
import { useTestProviderConnection } from '../hooks/useTestProviderConnection'
import { ProvidersCreateModal } from './ProvidersCreateModal'
import { ProviderConnectionTestDialog } from './ProviderConnectionTestDialog'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { ProviderRecord } from '../model/providerTypes'

function credentialStatusLabel(
  status: ProviderRecord['credentialStatus'],
  t: ReturnType<typeof useTranslation>['t'],
) {
  return t(`providers.credentials.status.${status}`)
}

function credentialStatusColor(status: ProviderRecord['credentialStatus']) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function getColumns(t: ReturnType<typeof useTranslation>['t']): ColumnDef<ProviderRecord>[] {
  return [
    {
      id: 'name',
      header: t('tables.provider.name'),
      cell: (provider) => (
        <>
          <span className="block font-semibold text-text-primary">{provider.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{provider.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.provider.description'),
      cell: (provider) => <span className="block max-w-md truncate" title={provider.description}>{provider.description || '-'}</span>,
    },
    {
      id: 'type',
      header: t('tables.provider.type'),
      cell: (provider) => <Badge color="info" size="sm">{providerTypeLabel(provider.type)}</Badge>,
    },
    {
      id: 'ipAddress',
      header: t('tables.provider.ip'),
      cell: (provider) => <span className="font-mono text-[12px] text-text-secondary">{provider.ipAddress || '-'}</span>,
    },
    {
      id: 'credential',
      header: t('tables.provider.credential'),
      cell: (provider) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[12px] text-text-secondary">{provider.credentialId ?? '-'}</span>
          <Badge color={credentialStatusColor(provider.credentialStatus)} size="sm">
            {credentialStatusLabel(provider.credentialStatus, t)}
          </Badge>
        </div>
      ),
    },
  ]
}

interface ProvidersCatalogueTableProps {
  providers: ProviderRecord[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function ProvidersCatalogueTable({
  providers,
  isLoading,
  error,
  isRetrying,
  onRetry,
}: ProvidersCatalogueTableProps) {
  const { t } = useTranslation()
  const columns = getColumns(t)
  const deleteProvider = useDeleteProvider()
  const testConnection = useTestProviderConnection()
  const [typeFilter, setTypeFilter] = useState('')
  const [pendingType, setPendingType] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<ProviderRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null)
  const [isConnectionTestOpen, setIsConnectionTestOpen] = useState(false)

  const rows = useMemo(() => providers, [providers])
  const selected = rows.find((provider) => provider.id === selectedId) ?? null
  const types = useMemo(
    () => [...new Set(rows.map((provider) => provider.type).filter(Boolean))].sort(),
    [rows],
  )

  const table = useTableState(rows, {
    searchFields: ['name'],
    predicate: (provider) => !typeFilter || provider.type === typeFilter,
  })

  const changeType = (value: string) => { setTypeFilter(value); setPendingType(value); table.setPage(1) }

  const openConnectionTest = () => {
    if (selected?.credentialStatus !== 'ok') return
    testConnection.reset()
    setIsConnectionTestOpen(true)
    testConnection.mutate(selected)
  }

  const closeConnectionTest = () => {
    setIsConnectionTestOpen(false)
    testConnection.reset()
  }

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={5}
        ariaLabel={t('providers.loading')}
        className="flex-1 rounded-none border-0 shadow-none lg:min-h-0"
      />
    )
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('providers.searchPlaceholder')}
        searchLabel={t('providers.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('providers.filterTitle')}
        activeFilterCount={typeFilter ? 1 : 0}
        onApplyFilters={() => { changeType(pendingType) }}
        onClearFilters={() => { setPendingType(''); changeType('') }}
        filterPanel={
          <Field label={t('details.type')} htmlFor="provider-type-filter">
            <Select id="provider-type-filter" value={pendingType} onChange={(event) => { setPendingType(event.target.value) }}>
              <option value="">{t('providers.allTypes')}</option>
              {types.map((type) => <option key={type} value={type}>{providerTypeLabel(type)}</option>)}
            </Select>
          </Field>
        }
      />

      <DataTableRequestState
        error={error ? {
          title: t('providers.loadFailed'),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          rowKey={(provider) => provider.id}
          density={table.density}
          minWidthClassName="min-w-215"
          ariaLabel={t('providers.tableLabel')}
          onRowClick={(provider) => { setSelectedId(provider.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('providers.noMatches') : t('providers.empty')}
        />
      </DataTableRequestState>

      {!error ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}

      <DetailDrawer
        open={selected !== null && !isConnectionTestOpen}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('drawer.selectedProvider')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? (
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Badge color="info" size="sm">{providerTypeLabel(selected.type)}</Badge>
            <div className="flex min-w-0 flex-col items-end gap-1">
              <Button
                size="xs"
                variant="soft"
                className="border border-accent/30 bg-accent-soft text-accent shadow-none hover:border-accent hover:bg-accent-soft hover:text-accent"
                startIcon={<PlugIcon className="size-3.5" />}
                onClick={openConnectionTest}
                disabled={selected.credentialStatus !== 'ok'}
                aria-describedby={selected.credentialStatus !== 'ok' ? 'provider-test-credential-hint' : undefined}
                title={selected.credentialStatus !== 'ok' ? t('providers.connectionTest.credentialRequired') : undefined}
              >
                {t('providers.connectionTest.button')}
              </Button>
              {selected.credentialStatus !== 'ok' ? (
                <span id="provider-test-credential-hint" className="sr-only">{t('providers.connectionTest.credentialRequired')}</span>
              ) : null}
            </div>
          </div>
        ) : null}
        ariaLabel={t('drawer.providerDetail')}
        closeLabel={t('drawer.closeProvider')}
        footer={selected ? (
          <>
            <Button
              onClick={() => { setDeleteTarget(selected) }}
              size="sm"
              variant="danger"
              className="flex-1"
            >
              {t('buttons.delete')}
            </Button>
            <Button
              onClick={() => { setEditing(selected); setSelectedId(null) }}
              size="sm"
              className="flex-1"
            >
              {t('buttons.edit')}
            </Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.providerId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.type')} value={providerTypeLabel(selected.type)} />
            <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{selected.ipAddress || '-'}</span>} />
            <DetailRow
              label={t('details.url')}
              value={selected.url ? (
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wrap-break-word text-accent underline hover:text-accent/80"
                >
                  {selected.url}
                </a>
              ) : '-'}
            />
            <DetailRow
              label={t('details.credential')}
              value={<span className="font-mono">{selected.credentialId ?? '-'}</span>}
            />
            <DetailRow
              label={t('details.credentialStatus')}
              value={(
                <Badge color={credentialStatusColor(selected.credentialStatus)} size="sm">
                  {credentialStatusLabel(selected.credentialStatus, t)}
                </Badge>
              )}
            />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>

      <ProviderConnectionTestDialog
        open={isConnectionTestOpen && selected !== null}
        providerName={selected?.name ?? ''}
        providerId={selected?.id ?? ''}
        isPending={testConnection.isPending}
        result={testConnection.data ?? null}
        error={testConnection.error instanceof Error ? testConnection.error : null}
        onClose={closeConnectionTest}
        onRetry={() => {
          if (selected) testConnection.mutate(selected)
        }}
      />

      {editing ? (
        <ProvidersCreateModal
          open
          onClose={() => { setEditing(null) }}
          existingProviders={rows}
          provider={editing}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteProvider')}
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
          })
        }}
      />
    </div>
  )
}
