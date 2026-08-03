import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { useDeletePlatformProvider } from '../hooks/useDeletePlatformProvider'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersModal } from './PlatformProvidersModal'

function credentialStatusColor(status: PlatformProviderRecord['credentialStatus']) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function getColumns(t: ReturnType<typeof useTranslation>['t']): ColumnDef<PlatformProviderRecord>[] {
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
      cell: (provider) => <Badge color="info" size="sm">{provider.type}</Badge>,
    },
    {
      id: 'endpoint',
      header: t('tables.provider.endpoint'),
      cell: (provider) => <span className="font-mono text-[12px] text-text-secondary">{provider.ipAddress}:{provider.port}</span>,
    },
    {
      id: 'dagDir',
      header: t('tables.provider.dagDir'),
      cell: (provider) => <span className="block max-w-56 truncate font-mono text-[12px]" title={provider.dagDir}>{provider.dagDir}</span>,
    },
    {
      id: 'credential',
      header: t('tables.provider.credential'),
      cell: (provider) => (
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[12px] text-text-secondary">{provider.credentialId}</span>
          <Badge color={credentialStatusColor(provider.credentialStatus)} size="sm">
            {t(`providers.credentials.status.${provider.credentialStatus}`)}
          </Badge>
        </div>
      ),
    },
  ]
}

interface PlatformProvidersTableProps {
  providers: PlatformProviderRecord[]
  isLoading: boolean
  error: Error | null
}

export function PlatformProvidersTable({
  providers,
  isLoading,
  error,
}: PlatformProvidersTableProps) {
  const { t } = useTranslation()
  const columns = getColumns(t)
  const deleteProvider = useDeletePlatformProvider()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlatformProviderRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlatformProviderRecord | null>(null)
  const rows = useMemo(() => providers, [providers])
  const selected = rows.find(provider => provider.id === selectedId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'ipAddress'] })

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={6}
        ariaLabel={t('providers.platform.loading')}
        className="flex-1 rounded-none border-0 shadow-none lg:min-h-0"
      />
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {t('providers.platform.loadFailed')} {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('providers.platform.searchPlaceholder')}
        searchLabel={t('providers.platform.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={(provider) => provider.id}
        density={table.density}
        minWidthClassName="min-w-245"
        ariaLabel={t('providers.platform.tableLabel')}
        onRowClick={(provider) => { setSelectedId(provider.id) }}
        selectedRowKey={selectedId}
        emptyContent={rows.length > 0 ? t('providers.platform.noMatches') : t('providers.platform.empty')}
      />

      <DataTablePagination
        page={table.page}
        pageSize={table.pageSize}
        total={table.total}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('drawer.selectedProvider')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color="info" size="sm">{selected.type}</Badge> : null}
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
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.providerId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.type')} value={selected.type} />
            <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{selected.ipAddress}</span>} />
            <DetailRow label={t('details.port')} value={<span className="font-mono">{selected.port}</span>} />
            <DetailRow label={t('details.dagDir')} value={<span className="font-mono">{selected.dagDir}</span>} />
            <DetailRow label={t('details.credential')} value={<span className="font-mono">{selected.credentialId}</span>} />
            <DetailRow
              label={t('details.credentialStatus')}
              value={<Badge color={credentialStatusColor(selected.credentialStatus)} size="sm">{t(`providers.credentials.status.${selected.credentialStatus}`)}</Badge>}
            />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>

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
        title={t('providers.platform.dialogs.delete')}
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
