import type { PostDeletePhase } from '../../hooks/usePostDeleteRefresh'
import { useMemo, useState } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import {
  DataTable,
  DataTableSurface,
  DataTablePagination,
  DataTableRequestState,
  DataTableToolbar,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { DetailField, DetailOverview, DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { GridIcon } from '@/shared/icons/Icons'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useDeletePolicySet } from '@/generated/query/policy-sets/policy-sets.gen'
import type { PolicySetRecordOutput } from '@/generated/query/zod'
import { usePolicyCatalog } from '@/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog'
import type { PolicyKind } from '@/features/recovery-plans/recovery-policies/catalog/model/policyCatalog'
import { PolicySetModal } from './PolicySetModal'


function countPolicies(policySet: PolicySetRecordOutput): number {
  return [policySet.snapshot_policy_id, policySet.recovery_app_policy_id, policySet.clean_room_policy_id]
    .filter(Boolean).length
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (policySetId: string) => void,
): ColumnDef<PolicySetRecordOutput>[] {
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
      cell: (policySet) => {
        const description = policySet.description ?? ''
        return <span className="block max-w-md truncate" title={description}>{description || '-'}</span>
      },
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
  postDeletePhase: PostDeletePhase
  onDeleted: () => Promise<void>
  policySets: PolicySetRecordOutput[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function PolicySetsTable({ policySets, isLoading, error, isRetrying, onRetry, postDeletePhase, onDeleted }: PolicySetsTableProps) {
  const { t } = useTranslation()
  const catalog = usePolicyCatalog()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<PolicySetRecordOutput | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PolicySetRecordOutput | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const deletePolicySet = useDeletePolicySet({ mutation: { onSuccess: () => {
    setDeleteTarget(null)
    setSelectedId(null)
    void onDeleted()
  } } })
  const isRowsLoading = isLoading || postDeletePhase === 'refreshing'
  const rows = useMemo(() => policySets, [policySets])
  const selected = rows.find(policySet => policySet.id === selectedId) ?? null
  const jsonViewed = rows.find(policySet => policySet.id === jsonViewId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description'] })
  const referenceField = (kind: PolicyKind, id: string | null | undefined, label: string) => {
    const reference = catalog.resolve(kind, id)
    const source = catalog.sources[kind]
    if (reference.status === 'notConfigured') return { value: null, secondary: null }
    const errorDetail = extractBackendErrorDetail(source.error)
    return {
      value: reference.status === 'resolved' ? reference.policy.name : reference.id,
      secondary: reference.status === 'missing' || reference.status === 'unknown' || source.status === 'error' || source.status === 'cachedError' ? (
        <>
          {reference.status === 'missing' || reference.status === 'unknown' ? <p role="status">{t(reference.status === 'missing' ? 'policyCatalog.missing' : 'policyCatalog.unknown', { id: reference.id })}</p> : null}
          {source.status === 'error' || source.status === 'cachedError' ? (
            <div className="mt-1 space-y-1" role="alert">
              <p>{t(source.status === 'cachedError' ? 'policyCatalog.cachedError' : 'policyCatalog.error', { kind: label })}</p>
              {errorDetail ? <p>{errorDetail}</p> : null}
              <Button size="xs" variant="outline" disabled={source.isFetching || source.isPaused} onClick={() => { void catalog.retry(kind) }}>{t('policyCatalog.retry', { kind: label })}</Button>
            </div>
          ) : null}
        </>
      ) : null,
    }
  }
  const deleteErrorDetail = extractBackendErrorDetail(deletePolicySet.error)
  const loadErrorDetail = extractBackendErrorDetail(error)

  const toolbar = (
    <>
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
    </>
  )

  const pagination = (!error || policySets.length > 0) ? (
    <DataTablePagination
      page={table.page}
      pageSize={table.pageSize}
      total={table.total}
      isLoading={isRowsLoading}
      onPageChange={table.setPage}
      onPageSizeChange={table.setPageSize}
    />
  ) : null

  return (
    <>
      <DataTableSurface
        ariaLabel={t('policySets.tableLabel')}
        toolbar={toolbar}
        pagination={pagination}
      >
        <DataTableRequestState
          hasCachedData={policySets.length > 0}
          error={(error || postDeletePhase === 'error') && postDeletePhase !== 'refreshing' ? {
            title: t(postDeletePhase === 'error' ? 'postDeleteRefresh.title' : 'policySets.loadFailed'),
            ...(postDeletePhase === 'error' ? { description: [t('postDeleteRefresh.description'), loadErrorDetail].filter(Boolean).join(' ') } : loadErrorDetail ? { description: loadErrorDetail } : {}),
            retryLabel: t('buttons.retry'),
            isRetrying,
            onRetry,
          } : null}
        >
          <DataTable
            columns={getColumns(t, setJsonViewId)}
            rows={table.pageItems}
            isLoading={isRowsLoading}
            rowKey={policySet => policySet.id}
            density={table.density}
            minWidthClassName="min-w-200"
            ariaLabel={isRowsLoading ? t('policySets.loading') : t('policySets.tableLabel')}
            rowAriaLabel={policySet => policySet.name}
            onRowClick={policySet => { setSelectedId(policySet.id) }}
            selectedRowKey={selectedId}
            emptyContent={rows.length > 0 ? t('policySets.noMatches') : t('policySets.empty')}
          />
        </DataTableRequestState>
      </DataTableSurface>

      {selected ? (
        <DetailView
          // Keyed by record so each newly opened record starts fresh.
          key={selected.id}
          open
          onClose={() => { setSelectedId(null) }}
          size="md"
          entityLabel={t('policySets.drawer.entity')}
          title={selected.name}
          headerActions={<KeyedHelpPopover helpKey="policySets.help" sections={['snapshot', 'recoveryApp', 'cleanRoom', 'reference']} />}
          ariaLabel={t('policySets.drawer.label')}
          closeLabel={t('policySets.drawer.close')}
          footerStart={<Button onClick={() => { setDeleteTarget(selected) }} size="sm" variant="danger">{t('buttons.delete')}</Button>}
          footer={<Button onClick={() => { setEditing(selected); setSelectedId(null) }} size="sm">{t('buttons.edit')}</Button>}
        >
          <DetailViewSection id="overview" title={t('details.tabs.overview')} icon={GridIcon}>
            {/* The fields in the order of the original detail drawer. */}
            <DetailOverview>
              <DetailField label={t('details.policySetId')} value={selected.id} mono copyValue={selected.id} />
              <DetailField label={t('details.description')} value={selected.description} wide />
              <DetailField label={t('details.snapshotPolicies')} labelHelp={<KeyedHelpPopover helpKey="policySets.fieldHelp.snapshot_policy_id" sections={[]} />} {...referenceField('snapshot', selected.snapshot_policy_id, t('policySets.form.snapshotPolicy'))} emphasis />
              <DetailField label={t('details.recoveryAppPolicy')} labelHelp={<KeyedHelpPopover helpKey="policySets.fieldHelp.recovery_app_policy_id" sections={[]} />} {...referenceField('recoveryApp', selected.recovery_app_policy_id, t('policySets.form.recoveryAppPolicy'))} />
              <DetailField label={t('details.cleanRoomPolicy')} labelHelp={<KeyedHelpPopover helpKey="policySets.fieldHelp.clean_room_policy_id" sections={[]} />} {...referenceField('cleanRoom', selected.clean_room_policy_id, t('policySets.form.cleanRoomPolicy'))} />
            </DetailOverview>
          </DetailViewSection>
        </DetailView>
      ) : null}

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
          deletePolicySet.mutate({ params: { policy_set_id: deleteTarget.id } }, {
            onError: () => { setDeleteTarget(null) },
          })
        }}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('policySets.jsonViewer.title')}
        data={jsonViewed}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </>
  )
}
