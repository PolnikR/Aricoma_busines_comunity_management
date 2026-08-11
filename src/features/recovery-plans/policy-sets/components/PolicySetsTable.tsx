import { useMemo, useState } from 'react'
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
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useDeletePolicySet } from '../hooks/useDeletePolicySet'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetModal } from './PolicySetModal'

function getColumns(t: ReturnType<typeof useTranslation>['t']): ColumnDef<PolicySet>[] {
  return [
    {
      id: 'name',
      header: t('tables.policySet.name'),
      cell: policySet => (
        <>
          <span className="block font-semibold text-text-primary">{policySet.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{policySet.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.policySet.description'),
      cell: policySet => <span className="block max-w-md truncate" title={policySet.description}>{policySet.description || '-'}</span>,
    },
    {
      id: 'policies',
      header: t('tables.policySet.policies'),
      align: 'right',
      cell: policySet => String(policySet.policyIds.length),
    },
  ]
}

interface PolicySetsTableProps {
  policySets: PolicySet[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function PolicySetsTable({ policySets, isLoading, error, isRetrying, onRetry }: PolicySetsTableProps) {
  const { t } = useTranslation()
  const deletePolicySet = useDeletePolicySet()
  const { data: availablePolicies = [] } = useSnapshotPolicies()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PolicySet | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PolicySet | null>(null)
  const rows = useMemo(() => policySets, [policySets])
  const selected = rows.find(policySet => policySet.id === selectedId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description'] })
  const policyName = (policyId: string) => availablePolicies.find(policy => policy.id === policyId)?.name ?? policyId

  if (isLoading) {
    return <DataTableSkeleton columnCount={3} ariaLabel={t('policySets.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('policySets.searchPlaceholder')}
        searchLabel={t('policySets.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      <DataTableRequestState
        error={error ? {
          title: t('policySets.loadFailed'),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={getColumns(t)}
          rows={table.pageItems}
          rowKey={policySet => policySet.id}
          density={table.density}
          minWidthClassName="min-w-200"
          ariaLabel={t('policySets.tableLabel')}
          rowAriaLabel={policySet => policySet.name}
          onRowClick={policySet => { setSelectedId(policySet.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('policySets.noMatches') : t('policySets.empty')}
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
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('policySets.drawer.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        ariaLabel={t('policySets.drawer.label')}
        closeLabel={t('policySets.drawer.close')}
        footer={selected ? (
          <>
            <Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger" className="flex-1">{t('buttons.delete')}</Button>
            <Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm" className="flex-1">{t('buttons.edit')}</Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2">
            <DetailRow label={t('details.policySetId')} value={<span className="font-mono">{selected.id}</span>} />
            <DetailRow label={t('details.description')} value={selected.description || '-'} />
            <DetailRow label={t('details.policies')} value={selected.policyIds.map(policyName).join(', ') || '-'} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? <PolicySetModal open onClose={() => { setEditing(null) }} existingPolicySets={rows} policySet={editing} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('policySets.delete.title')}
        message={t('policySets.delete.message').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deletePolicySet.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deletePolicySet.mutate(deleteTarget.id, {
            onSuccess: () => { setDeleteTarget(null); setSelectedId(null) },
          })
        }}
      />
    </div>
  )
}
