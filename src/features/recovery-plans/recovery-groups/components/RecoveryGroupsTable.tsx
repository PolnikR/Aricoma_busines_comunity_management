import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
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
import { Modal } from '@/shared/components/modal/Modal'
import { useTranslation } from '@/hooks/useTranslation'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
import { toRecoveryGroupJson } from '../helpers/mapRecoveryGroups'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupRollbackResultModal } from './RecoveryGroupRollbackResultModal'
import {
  getResourceTypeLabelKey,
  getSourceCategoryLabelKey,
  getWorkloadTypeLabelKey,
} from '../utils/recoveryGroupTypeLabels'

import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'

interface RecoveryGroupsTableProps {
  groups: RecoveryGroup[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onRollback: (groupId: string, providerId: string) => Promise<RollbackReport>
  error?: Error | null
  isRetrying?: boolean
  onRetry?: () => void
  isRollingBack?: boolean
}

interface RecoveryGroupFilters {
  workloadType: string
  resourceType: string
}

const EMPTY_FILTERS: RecoveryGroupFilters = {
  workloadType: '',
  resourceType: '',
}

interface JsonViewerModalProps {
  isOpen: boolean
  group: RecoveryGroup | null
  onClose: () => void
}

function JsonViewerModal({ isOpen, group, onClose }: JsonViewerModalProps) {
  const { t } = useTranslation()
  if (!isOpen || !group) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={t('recoveryGroups.modal.jsonViewer.title')}
      size="lg"
      className="flex max-h-96 flex-col overflow-hidden"
      footer={<Button onClick={onClose} size="sm" fullWidth>{t('buttons.close')}</Button>}
    >
      <div className="flex-1 overflow-y-auto bg-surface-subtle px-6 py-4">
        <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-word">
          {JSON.stringify(toRecoveryGroupJson(group), null, 2)}
        </pre>
      </div>
    </Modal>
  )
}

export function RecoveryGroupsTable({
  groups,
  onEdit,
  onDelete,
  onRollback,
  error = null,
  isRetrying = false,
  onRetry = () => undefined,
  isRollingBack = false,
}: RecoveryGroupsTableProps) {
  const { t } = useTranslation()
  const { data: policySets = [] } = usePolicySets()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<RecoveryGroup | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<RecoveryGroup | null>(null)
  const [rollbackResult, setRollbackResult] = useState<{ groupName: string; report: any } | null>(null)

  const filterOptions = useMemo(() => ({
    workloadTypes: Array.from(new Set(groups.map(group => group.workloadType))).sort(),
    resourceTypes: Array.from(new Set(groups.map(group => group.resourceType))).sort(),
  }), [groups])

  const rows = useMemo(() => groups.filter(group => (
    (!filters.workloadType || group.workloadType === filters.workloadType)
    && (!filters.resourceType || group.resourceType === filters.resourceType)
  )), [filters, groups])

  const table = useTableState(rows, {
    searchFields: ['id', 'name', 'description'],
  })
  const selected = rows.find(group => group.id === selectedId) ?? null
  const jsonViewed = rows.find(group => group.id === jsonViewId) ?? null
  const activeFilterCount = Number(Boolean(filters.workloadType)) + Number(Boolean(filters.resourceType))
  const policySetName = (policySetId: string) => (
    policySets.find(policySet => policySet.id === policySetId)?.name ?? policySetId
  )

  const columns = useMemo<ColumnDef<RecoveryGroup>[]>(() => [
    {
      id: 'name',
      header: t('tables.recoveryGroups.group'),
      cell: group => (
        <>
          <span className="block font-semibold text-text-primary">{group.name}</span>
          <span className="mt-0.5 block text-[11px] text-text-subtle">{group.description}</span>
        </>
      ),
    },
    {
      id: 'workloadType',
      header: t('tables.recoveryGroups.workloadType'),
      cell: group => (
        <Badge color="info" size="sm">{t(getWorkloadTypeLabelKey(group.workloadType))}</Badge>
      ),
    },
    {
      id: 'resourceType',
      header: t('tables.recoveryGroups.resourceType'),
      cell: group => t(getResourceTypeLabelKey(group.resourceType)),
    },
    {
      id: 'resources',
      header: t('tables.recoveryGroups.resources'),
      align: 'right',
      cell: group => String(group.resourceCount),
    },
    {
      id: 'status',
      header: t('tables.recoveryGroups.status'),
      cell: group => (
        <Badge color={group.status === 'Active' ? 'success' : 'warning'} size="sm">
          {t(group.status === 'Active' ? 'tables.recoveryGroups.active' : 'tables.recoveryGroups.draft')}
        </Badge>
      ),
    },
    {
      id: 'orchestration',
      header: t('tables.recoveryGroups.orchestration'),
      cell: group => (
        <Badge color={group.pushToOrchestrator ? 'success' : 'light'} size="sm">
          {t(group.pushToOrchestrator ? 'common.yes' : 'common.no')}
        </Badge>
      ),
    },
    {
      id: 'json',
      header: t('tables.recoveryGroups.json'),
      cell: group => (
        <Button
          size="xs"
          variant="soft"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            setJsonViewId(group.id)
          }}
        >
          {t('tables.recoveryGroups.viewJson')}
        </Button>
      ),
    },
  ], [t])

  const prepareFilters = () => {
    setPendingFilters(filters)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPendingFilters(EMPTY_FILTERS)
    table.setPage(1)
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('pages.recoveryGroups.searchPlaceholder')}
        searchLabel={t('pages.recoveryGroups.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('pages.recoveryGroups.filters.title')}
        filterButtonLabel={t('pages.recoveryGroups.filters.button')}
        cancelLabel={t('buttons.cancel')}
        clearLabel={t('buttons.clearAll')}
        applyLabel={t('buttons.apply')}
        activeFilterCount={activeFilterCount}
        onFilterOpen={prepareFilters}
        onApplyFilters={() => {
          setFilters(pendingFilters)
          table.setPage(1)
        }}
        onClearFilters={clearFilters}
        filterPanel={
          <>
            <Field label={t('pages.recoveryGroups.filters.workloadType')} htmlFor="recovery-group-workload-filter">
              <Select
                id="recovery-group-workload-filter"
                value={pendingFilters.workloadType}
                onChange={event => {
                  setPendingFilters(current => ({ ...current, workloadType: event.target.value }))
                }}
              >
                <option value="">{t('pages.recoveryGroups.filters.allWorkloadTypes')}</option>
                {filterOptions.workloadTypes.map(type => (
                  <option key={type} value={type}>
                    {t(getWorkloadTypeLabelKey(type))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('pages.recoveryGroups.filters.resourceType')} htmlFor="recovery-group-resource-filter">
              <Select
                id="recovery-group-resource-filter"
                value={pendingFilters.resourceType}
                onChange={event => {
                  setPendingFilters(current => ({ ...current, resourceType: event.target.value }))
                }}
              >
                <option value="">{t('pages.recoveryGroups.filters.allResourceTypes')}</option>
                {filterOptions.resourceTypes.map(type => (
                  <option key={type} value={type}>
                    {t(getResourceTypeLabelKey(type))}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        }
      />

      <DataTableRequestState
        error={error ? {
          title: t('pages.recoveryGroups.errors.load'),
          retryLabel: t('buttons.retry'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          rowKey={group => group.id}
          density={table.density}
          minWidthClassName="min-w-200"
          ariaLabel={t('pages.recoveryGroups.tableAriaLabel')}
          onRowClick={group => { setSelectedId(group.id) }}
          selectedRowKey={selectedId}
          emptyContent={t('pages.recoveryGroups.empty.noGroups')}
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
        eyebrow={t('drawer.selectedRecoveryGroup')}
        title={selected?.name ?? ''}
        ariaLabel={t('drawer.recoveryGroupDetail')}
        closeLabel={t('drawer.closeRecoveryGroup')}
        footer={selected ? (
          <>
            <Button
              size="sm"
              variant="danger"
              className="flex-1"
              onClick={() => { setDeleteTarget(selected) }}
            >
              {t('buttons.delete')}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                onEdit(selected.id)
                setSelectedId(null)
              }}
            >
              {t('buttons.edit')}
            </Button>
          </>
        ) : null}
      >
        {selected ? (
          <dl className="space-y-3 px-5 py-2">
            <DetailRow label={t('details.description')} value={selected.description || '—'} />
            <DetailRow
              label={t('tables.recoveryGroups.sourceCategory')}
              value={t(getSourceCategoryLabelKey(selected.sourceCategory))}
            />
            <DetailRow
              label={t('tables.recoveryGroups.workloadType')}
              value={t(getWorkloadTypeLabelKey(selected.workloadType))}
            />
            <DetailRow
              label={t('tables.recoveryGroups.resourceType')}
              value={t(getResourceTypeLabelKey(selected.resourceType))}
            />
            <DetailRow
              label={t('tables.recoveryGroups.policySet')}
              value={policySetName(selected.policySetId)}
            />
            <DetailRow label={t('tables.recoveryGroups.resources')} value={String(selected.resourceCount)} />
            <DetailRow
              label={t('tables.recoveryGroups.orchestration')}
              value={
                <div className="flex items-center gap-2">
                  <Badge color={selected.pushToOrchestrator ? 'success' : 'light'} size="sm">
                    {t(selected.pushToOrchestrator ? 'common.yes' : 'common.no')}
                  </Badge>
                  {selected.pushToOrchestrator && (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={!selected.orchestrationProviderId}
                      title={!selected.orchestrationProviderId ? t('recoveryGroups.rollback.disabledTitle') : undefined}
                      onClick={() => { setRollbackTarget(selected) }}
                      startIcon={isRollingBack ? (
                        <span aria-hidden="true" className="size-3 animate-spin rounded-full border-2 border-current/40 border-t-current" />
                      ) : undefined}
                    >
                      {t('recoveryGroups.rollback.button')}
                    </Button>
                  )}
                </div>
              }
            />
            <DetailRow
              label={t('tables.recoveryGroups.airflowRunId')}
              value={selected.airflowRunId ? <span className="font-mono">{selected.airflowRunId}</span> : '—'}
            />
            <DetailRow
              label={t('tables.recoveryGroups.status')}
              value={
                <Badge color={selected.status === 'Active' ? 'success' : 'warning'} size="sm">
                  {t(selected.status === 'Active' ? 'tables.recoveryGroups.active' : 'tables.recoveryGroups.draft')}
                </Badge>
              }
            />
          </dl>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteRecoveryGroup')}
        message={t('dialogs.deleteRecoveryGroupMessage').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        tone="danger"
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          onDelete(deleteTarget.id)
          setDeleteTarget(null)
          setSelectedId(null)
        }}
      />

      <ConfirmDialog
        open={rollbackTarget !== null}
        title={t('recoveryGroups.rollback.confirmTitle')}
        message={t('recoveryGroups.rollback.confirmMessage').replace('{groupName}', rollbackTarget?.name ?? '')}
        confirmLabel={t('recoveryGroups.rollback.confirmLabel')}
        cancelLabel={t('buttons.cancel')}
        tone="danger"
        onCancel={() => { setRollbackTarget(null) }}
        onConfirm={async () => {
          if (!rollbackTarget?.orchestrationProviderId) return
          try {
            const report = await onRollback(rollbackTarget.id, rollbackTarget.orchestrationProviderId)
            setRollbackResult({ groupName: rollbackTarget.name, report })
            setSelectedId(null)
            setRollbackTarget(null)
          } catch {
            setRollbackTarget(null)
          }
        }}
      />

      <RecoveryGroupRollbackResultModal
        open={rollbackResult !== null}
        onClose={() => { setRollbackResult(null) }}
        groupName={rollbackResult?.groupName ?? ''}
        report={rollbackResult?.report ?? null}
      />

      <JsonViewerModal
        isOpen={jsonViewId !== null}
        group={jsonViewed}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
