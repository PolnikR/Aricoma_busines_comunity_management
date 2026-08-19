import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { routes } from '@/app/routes'
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
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { buildAirflowDagUrl } from '@/config/externalServices'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { useLatestOrchestratorRun } from '@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '@/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun'
import { toRecoveryGroupJson } from '../helpers/mapRecoveryGroups'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupRollbackResultModal } from './RecoveryGroupRollbackResultModal'
import { RecoveryGroupRollbackSuccessModal } from './RecoveryGroupRollbackSuccessModal'
import { RecoveryGroupContextMenu } from './RecoveryGroupContextMenu'
import {
  getResourceTypeLabelKey,
  getSourceCategoryLabelKey,
  getWorkloadTypeLabelKey,
} from '../utils/recoveryGroupTypeLabels'

import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'

interface RecoveryGroupsTableProps {
  groups: RecoveryGroup[]
  onEdit: (id: string) => void
  onDelete: (group: RecoveryGroup) => Promise<RollbackReport | null>
  onRollback: (groupId: string, providerId: string) => Promise<void>
  error?: Error | null
  isRetrying?: boolean
  isDeleting?: boolean
  onRetry?: () => void
}

interface RecoveryGroupFilters {
  workloadType: string
  resourceType: string
}

const EMPTY_FILTERS: RecoveryGroupFilters = {
  workloadType: '',
  resourceType: '',
}

export function RecoveryGroupsTable({
  groups,
  onEdit,
  onDelete,
  onRollback,
  error = null,
  isRetrying = false,
  isDeleting = false,
  onRetry = () => undefined,
}: RecoveryGroupsTableProps) {
  const { t } = useTranslation()
  const { data: policySets = [] } = usePolicySets()
  const { data: platformProviders = [] } = usePlatformProviders()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<RecoveryGroup | null>(null)
  const [rollbackTarget, setRollbackTarget] = useState<RecoveryGroup | null>(null)
  const [rollbackResult, setRollbackResult] = useState<{ groupName: string; report: RollbackReport } | null>(null)
  const [rollbackSuccessGroupName, setRollbackSuccessGroupName] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isRollingBack, setIsRollingBack] = useState(false)

  const filterOptions = useMemo(() => ({
    workloadTypes: Array.from(new Set(groups.map(group => group.workloadType ?? 'unresolved'))).sort(),
    resourceTypes: Array.from(new Set(groups.map(group => group.resourceType))).sort(),
  }), [groups])

  const rows = useMemo(() => groups.filter(group => (
    (!filters.workloadType || (filters.workloadType === 'unresolved'
      ? group.workloadType === null
      : group.workloadType === filters.workloadType))
    && (!filters.resourceType || group.resourceType === filters.resourceType)
  )), [filters, groups])

  const table = useTableState(rows, {
    searchFields: ['id', 'name', 'description'],
  })
  const selected = rows.find(group => group.id === selectedId) ?? null
  const selectedOrchestrationProviderUrl = platformProviders.find(
    provider => provider.id === selected?.orchestrationProviderId,
  )?.url
  const jsonViewed = rows.find(group => group.id === jsonViewId) ?? null
  const activeFilterCount = Number(Boolean(filters.workloadType)) + Number(Boolean(filters.resourceType))

  const navigate = useNavigate()
  const isSelectedOrchestrated = Boolean(selected?.pushToOrchestrator && selected.airflowRunId && selected.orchestrationProviderId)
  const selectedDagId = isSelectedOrchestrated && selected?.airflowRunId ? `dag_${selected.airflowRunId}` : null
  const { latestRun } = useLatestOrchestratorRun(
    isSelectedOrchestrated ? (selected?.orchestrationProviderId ?? null) : null,
    selectedDagId,
  )
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
    {
      id: 'actions',
      header: '',
      cell: group => (
        <Button
          data-recovery-group-menu-trigger={group.id}
          size="xs"
          variant="ghost"
          onClick={(event: React.MouseEvent) => {
            event.stopPropagation()
            setOpenMenuId(openMenuId === group.id ? null : group.id)
          }}
        >
          ⋯
        </Button>
      ),
    },
  ], [t, openMenuId])

  const prepareFilters = () => {
    setPendingFilters(filters)
  }

  const triggerRefForMenu = useRef<HTMLButtonElement | null>(null)

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPendingFilters(EMPTY_FILTERS)
    table.setPage(1)
  }

  const currentMenuGroup = useMemo(
    () => rows.find(g => g.id === openMenuId) ?? null,
    [rows, openMenuId],
  )

  useEffect(() => {
    if (!openMenuId) return
    const button = document.querySelector(`[data-recovery-group-menu-trigger="${openMenuId}"]`)
    triggerRefForMenu.current = button instanceof HTMLButtonElement ? button : null
  }, [openMenuId])

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
                    {t(type === 'unresolved' ? getWorkloadTypeLabelKey(null) : getWorkloadTypeLabelKey(type))}
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

      {openMenuId && currentMenuGroup && (
        <RecoveryGroupContextMenu
          triggerRef={triggerRefForMenu}
          open={true}
          onClose={() => { setOpenMenuId(null) }}
          ariaLabel={`${t('tables.recoveryGroups.actions')} for ${currentMenuGroup.name}`}
          editLabel={t('buttons.edit')}
          {...(currentMenuGroup.providerResolution === 'unresolved' ? {
            editDisabled: true,
            editDisabledTitle: t('pages.recoveryGroups.providerUnavailableEdit'),
          } : {})}
          deleteLabel={t('buttons.delete')}
          edit={() => {
            onEdit(openMenuId)
            setSelectedId(null)
          }}
          delete={() => {
            setDeleteTarget(currentMenuGroup)
          }}
          rollback={{
            label: t('recoveryGroups.rollback.button'),
            onRollback: () => { setRollbackTarget(currentMenuGroup) },
            disabled: !currentMenuGroup.pushToOrchestrator || !currentMenuGroup.orchestrationProviderId || isRollingBack,
            ...(!currentMenuGroup.pushToOrchestrator && {
              disabledTitle: t('recoveryGroups.rollback.notConfiguredTitle'),
            }),
          }}
        />
      )}

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
              disabled={selected.providerResolution === 'unresolved'}
              title={selected.providerResolution === 'unresolved'
                ? t('pages.recoveryGroups.providerUnavailableEdit')
                : undefined}
              aria-describedby={selected.providerResolution === 'unresolved'
                ? 'recovery-group-unresolved-edit-hint'
                : undefined}
              onClick={() => {
                if (selected.providerResolution === 'unresolved') return
                onEdit(selected.id)
                setSelectedId(null)
              }}
            >
              {t('buttons.edit')}
            </Button>
            {selected.providerResolution === 'unresolved' ? (
              <span id="recovery-group-unresolved-edit-hint" className="sr-only">
                {t('pages.recoveryGroups.providerUnavailableEdit')}
              </span>
            ) : null}
          </>
        ) : null}
      >
        {selected ? (
          <dl className="space-y-3 px-5 py-2">
            <DetailRow label={t('details.description')} value={selected.description || '—'} />
            <DetailRow label={t('details.providerId')} value={<span className="font-mono">{selected.providerId ?? '—'}</span>} />
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
                <Badge color={selected.pushToOrchestrator ? 'success' : 'light'} size="sm">
                  {t(selected.pushToOrchestrator ? 'common.yes' : 'common.no')}
                </Badge>
              }
            />
            <DetailRow
              label={t('tables.recoveryGroups.airflowRunId')}
              value={
                selected.airflowRunId ? (
                  <a
                    href={buildAirflowDagUrl(selected.airflowRunId, selectedOrchestrationProviderUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
                  >
                    {selected.airflowRunId}
                    <ExternalLinkIcon className="size-3.5 shrink-0" />
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailRow
              label={t('tables.recoveryGroups.status')}
              value={
                <Badge color={selected.status === 'Active' ? 'success' : 'warning'} size="sm">
                  {t(selected.status === 'Active' ? 'tables.recoveryGroups.active' : 'tables.recoveryGroups.draft')}
                </Badge>
              }
            />
            {isSelectedOrchestrated ? (
              <>
                <DetailRow
                  label={t('details.latestRunStatus')}
                  value={latestRun ? (
                    <Badge color={runStatusBadgeColor(latestRun.status)} size="sm">{latestRun.status}</Badge>
                  ) : (
                    <span className="text-text-subtle">{t('recoveryRuns.table.noRuns')}</span>
                  )}
                />
                <DetailRow label={t('details.lastExecuted')} value={formatRunTimestamp(latestRun?.startedAt ?? null)} />
                <DetailRow label={t('details.duration')} value={formatRunDuration(latestRun?.durationSeconds ?? null)} />
                <Button
                  size="sm"
                  variant="soft"
                  className="w-full"
                  onClick={() => {
                    void navigate(`${routes.recoveryRuns}?tab=groups&entityId=${selected.id}`)
                  }}
                >
                  {t('buttons.viewRecoveryRuns')}
                </Button>
              </>
            ) : null}
          </dl>
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteRecoveryGroup')}
        message={t(deleteTarget?.pushToOrchestrator
          ? 'dialogs.deleteRecoveryGroupOrchestratedMessage'
          : 'dialogs.deleteRecoveryGroupMessage').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        loadingLabel={t('buttons.deleting')}
        cancelLabel={t('buttons.cancel')}
        isLoading={isDeleting}
        tone="danger"
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget || isDeleting) return
          const target = deleteTarget
          void (async () => {
            try {
              const report = await onDelete(target)
              if (report) setRollbackResult({ groupName: target.name, report })
              setDeleteTarget(null)
              setSelectedId(null)
              setOpenMenuId(null)
            } catch {
              setDeleteTarget(null)
            }
          })()
        }}
      />

      <ConfirmDialog
        open={rollbackTarget !== null}
        title={t('recoveryGroups.rollback.confirmTitle')}
        message={t('recoveryGroups.rollback.confirmMessage').replace('{groupName}', rollbackTarget?.name ?? '')}
        confirmLabel={t('recoveryGroups.rollback.confirmLabel')}
        loadingLabel={t('recoveryGroups.rollback.rolling')}
        cancelLabel={t('buttons.cancel')}
        isLoading={isRollingBack}
        tone="danger"
        onCancel={() => { setRollbackTarget(null) }}
        onConfirm={() => {
          if (!rollbackTarget?.orchestrationProviderId) return
          const groupId = rollbackTarget.id
          const providerId = rollbackTarget.orchestrationProviderId
          const groupName = rollbackTarget.name
          setIsRollingBack(true)
          void (async () => {
            try {
              await onRollback(groupId, providerId)
              setRollbackSuccessGroupName(groupName)
              setSelectedId(null)
              setRollbackTarget(null)
            } catch {
              setRollbackTarget(null)
            } finally {
              setIsRollingBack(false)
            }
          })()
        }}
      />

      <RecoveryGroupRollbackResultModal
        open={rollbackResult !== null}
        onClose={() => { setRollbackResult(null) }}
        groupName={rollbackResult?.groupName ?? ''}
        report={rollbackResult?.report ?? null}
      />

      <RecoveryGroupRollbackSuccessModal
        open={rollbackSuccessGroupName !== null}
        onClose={() => { setRollbackSuccessGroupName(null) }}
        groupName={rollbackSuccessGroupName ?? ''}
      />

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('recoveryGroups.modal.jsonViewer.title')}
        data={jsonViewed ? toRecoveryGroupJson(jsonViewed) : null}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
