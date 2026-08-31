import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies'
import { toPolicySetSubmitPayload } from '../api/policySetsApi'
import { useDeletePolicySet } from '../hooks/useDeletePolicySet'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetModal } from './PolicySetModal'

function countPolicies(policySet: PolicySet): number {
  return [policySet.snapshotPolicyId, policySet.recoveryAppPolicyId, policySet.cleanRoomPolicyId]
    .filter(Boolean).length
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (policySetId: string) => void,
): ColumnDef<PolicySet>[] {
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
      cell: policySet => String(countPolicies(policySet)),
    },
    {
      id: 'json',
      header: t('tables.common.json'),
      cell: policySet => (
        <Button
          size="xs"
          variant="soft"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            onViewJson(policySet.id)
          }}
        >
          {t('buttons.viewJson')}
        </Button>
      ),
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
  const { data: availableRecoveryAppPolicies = [] } = useRecoveryAppPolicies()
  const { data: availableCleanRoomPolicies = [] } = useCleanRoomPolicies()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PolicySet | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PolicySet | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const rows = useMemo(() => policySets, [policySets])
  const selected = rows.find(policySet => policySet.id === selectedId) ?? null
  const jsonViewed = rows.find(policySet => policySet.id === jsonViewId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description'] })
  const policyName = (policyId: string) => availablePolicies.find(policy => policy.id === policyId)?.name ?? policyId
  const recoveryAppPolicyName = (policyId: string) => availableRecoveryAppPolicies.find(policy => policy.id === policyId)?.name ?? policyId
  const cleanRoomPolicyName = (policyId: string) => availableCleanRoomPolicies.find(policy => policy.id === policyId)?.name ?? policyId
  const deleteErrorDetail = extractBackendErrorDetail(deletePolicySet.error)
  const loadErrorDetail = extractBackendErrorDetail(error)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('policySets.searchPlaceholder')}
        searchLabel={t('policySets.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
      />

      {deletePolicySet.error ? (
        <Alert
          className="mx-4 mt-4"
          title={t('policySets.delete.title')}
          {...(deleteErrorDetail ? { description: deleteErrorDetail } : {})}
          variant="error"
        />
      ) : null}

      <div className="custom-scrollbar flex min-h-[120px] flex-1 flex-col lg:overflow-y-auto">
        <DataTableRequestState
          hasCachedData={policySets.length > 0}
          error={error ? {
            title: t('policySets.loadFailed'),
            ...(loadErrorDetail ? { description: loadErrorDetail } : {}),
            retryLabel: t('buttons.retry'),
            isRetrying,
            onRetry,
          } : null}
        >
          <DataTable
            columns={getColumns(t, setJsonViewId)}
            rows={table.pageItems}
            isLoading={isLoading}
            rowKey={policySet => policySet.id}
            density={table.density}
            minWidthClassName="min-w-200"
            ariaLabel={isLoading ? t('policySets.loading') : t('policySets.tableLabel')}
            rowAriaLabel={policySet => policySet.name}
            onRowClick={policySet => { setSelectedId(policySet.id) }}
            selectedRowKey={selectedId}
            emptyContent={rows.length > 0 ? t('policySets.noMatches') : t('policySets.empty')}
          />
        </DataTableRequestState>
      </div>

      {(!error || policySets.length > 0) ? (
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
            <DetailRow label={t('details.snapshotPolicies')} value={selected.snapshotPolicyId ? policyName(selected.snapshotPolicyId) : '-'} />
            <DetailRow label={t('details.recoveryAppPolicy')} value={recoveryAppPolicyName(selected.recoveryAppPolicyId)} />
            <DetailRow label={t('details.cleanRoomPolicy')} value={cleanRoomPolicyName(selected.cleanRoomPolicyId)} />
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
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('policySets.jsonViewer.title')}
        data={jsonViewed ? toPolicySetSubmitPayload(jsonViewed) : null}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
