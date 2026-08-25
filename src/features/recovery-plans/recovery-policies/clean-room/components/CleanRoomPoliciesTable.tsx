import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { toCleanRoomPolicySubmitPayload } from '../api/cleanRoomPoliciesApi'
import { useDeleteCleanRoomPolicy } from '../hooks/useDeleteCleanRoomPolicy'
import type { CleanRoomPolicy } from '../model/cleanRoomPolicyTypes'
import { CleanRoomPolicyModal } from './CleanRoomPolicyModal'

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (policyId: string) => void,
): ColumnDef<CleanRoomPolicy>[] {
  return [
    {
      id: 'name',
      header: t('tables.cleanRoomPolicy.name'),
      cell: policy => (
        <>
          <span className="block font-semibold text-text-primary">{policy.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{policy.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.cleanRoomPolicy.description'),
      cell: policy => <span className="block max-w-3xl truncate" title={policy.description}>{policy.description || '-'}</span>,
    },
    {
      id: 'status',
      header: t('tables.cleanRoomPolicy.status'),
      cell: policy => (
        <Badge color={policy.enabled ? 'success' : 'light'} size="sm">
          {t(policy.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled')}
        </Badge>
      ),
    },
    {
      id: 'json',
      header: t('tables.common.json'),
      cell: policy => (
        <Button
          size="xs"
          variant="soft"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            onViewJson(policy.id)
          }}
        >
          {t('buttons.viewJson')}
        </Button>
      ),
    },
  ]
}

interface CleanRoomPoliciesTableProps {
  policies: CleanRoomPolicy[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function CleanRoomPoliciesTable({ policies, isLoading, error, isRetrying, onRetry }: CleanRoomPoliciesTableProps) {
  const { t } = useTranslation()
  const deletePolicy = useDeleteCleanRoomPolicy()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<CleanRoomPolicy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CleanRoomPolicy | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const rows = useMemo(() => policies, [policies])
  const selected = rows.find(policy => policy.id === selectedId) ?? null
  const jsonViewed = rows.find(policy => policy.id === jsonViewId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description'] })
  const loadErrorDetail = extractBackendErrorDetail(error)
  const deleteErrorDetail = extractBackendErrorDetail(deletePolicy.error)

  if (isLoading) {
    return <DataTableSkeleton columnCount={4} ariaLabel={t('cleanRoomPolicies.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('cleanRoomPolicies.searchPlaceholder')}
        searchLabel={t('cleanRoomPolicies.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      {deletePolicy.error ? <Alert className="mx-4 mt-4" title={t('cleanRoomPolicies.delete.title')} {...(deleteErrorDetail ? { description: deleteErrorDetail } : {})} variant="error" /> : null}

      <DataTableRequestState
        hasCachedData={policies.length > 0}
        error={error ? {
          title: t('cleanRoomPolicies.loadFailed'),
          ...(loadErrorDetail ? { description: loadErrorDetail } : {}),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={getColumns(t, setJsonViewId)}
          rows={table.pageItems}
          rowKey={policy => policy.id}
          density={table.density}
          minWidthClassName="min-w-180"
          ariaLabel={t('cleanRoomPolicies.tableLabel')}
          rowAriaLabel={policy => policy.name}
          onRowClick={policy => { setSelectedId(policy.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('cleanRoomPolicies.noMatches') : t('cleanRoomPolicies.empty')}
        />
      </DataTableRequestState>

      {(!error || policies.length > 0) ? (
        <DataTablePagination
          page={table.page}
          pageSize={table.pageSize}
          total={table.total}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('cleanRoomPolicies.drawer.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color={selected.enabled ? 'success' : 'light'} size="sm">{t(selected.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled')}</Badge> : null}
        ariaLabel={t('cleanRoomPolicies.drawer.label')}
        closeLabel={t('cleanRoomPolicies.drawer.close')}
        footer={selected ? (
          <>
            <Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger" className="flex-1">{t('buttons.delete')}</Button>
            <Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm" className="flex-1">{t('buttons.edit')}</Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.policyId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
            <DetailRow label={t('details.status')} value={t(selected.enabled ? 'cleanRoomPolicies.enabled' : 'cleanRoomPolicies.disabled')} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? <CleanRoomPolicyModal open onClose={() => { setEditing(null) }} existingPolicies={rows} policy={editing} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('cleanRoomPolicies.delete.title')}
        message={t('cleanRoomPolicies.delete.message').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deletePolicy.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deletePolicy.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      {jsonViewed ? (
        <ChecklistResultDialog
          open={true}
          title={t('cleanRoomPolicies.jsonViewer.title')}
          primaryName={jsonViewed.name}
          subtitle={jsonViewed.id}
          badges={[
            { label: jsonViewed.enabled ? t('checklistDialog.active') : t('checklistDialog.inactive'), color: jsonViewed.enabled ? 'success' : 'warning' },
          ]}
          statusBar={{
            title: t('cleanRoomPolicies.policyLoaded'),
            status: 'success',
            passedCount: 4,
            totalCount: 4,
          }}
          checks={(() => {
            const items = [
              {
                name: t('cleanRoomPolicies.policyId'),
                detail: jsonViewed.id,
                status: 'ok' as const,
              },
              {
                name: t('cleanRoomPolicies.policyName'),
                detail: jsonViewed.name,
                status: 'ok' as const,
              },
              {
                name: t('cleanRoomPolicies.description'),
                detail: jsonViewed.description || '—',
                status: 'ok' as const,
              },
              {
                name: t('cleanRoomPolicies.enabled'),
                detail: jsonViewed.enabled ? t('common.yes') : t('common.no'),
                status: 'ok' as const,
              },
            ]
            return items
          })()}
          responseData={toCleanRoomPolicySubmitPayload(jsonViewed)}
          responseSchemaType="CleanRoomPolicy"
          onClose={() => { setJsonViewId(null) }}
        />
      ) : null}
    </div>
  )
}
