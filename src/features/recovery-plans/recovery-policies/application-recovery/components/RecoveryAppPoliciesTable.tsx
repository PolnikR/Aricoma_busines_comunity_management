import { useMemo, useState } from 'react'
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
import { Field, Select } from '@/shared/components/form/FormControls'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { toRecoveryAppPolicyReadPayload } from '../api/recoveryAppPoliciesApi'
import { useDeleteRecoveryAppPolicy } from '../hooks/useDeleteRecoveryAppPolicy'
import type { RecoveryAppPolicy } from '../model/recoveryAppPolicyTypes'
import { RecoveryAppPolicyModal } from './RecoveryAppPolicyModal'

interface RecoveryAppPolicyFilters {
  level: string
  status: string
  selectionMode: string
}

const EMPTY_FILTERS: RecoveryAppPolicyFilters = { level: '', status: '', selectionMode: '' }

function levelColor(level: string) {
  if (level === 'critical') return 'error' as const
  if (level === 'high') return 'warning' as const
  if (level === 'medium') return 'info' as const
  return 'light' as const
}

function formatInterval(value: number, unit: string, t: ReturnType<typeof useTranslation>['t']) {
  return `${String(value)} ${t(`recoveryAppPolicies.unit.${unit}`)}`
}

function formatSelection(policy: RecoveryAppPolicy, t: ReturnType<typeof useTranslation>['t']) {
  if (policy.snapshotSelectionMode === 'latest') return t('recoveryAppPolicies.selection.latest')
  if (policy.snapshotSelectionMode === 'time_range') {
    return t('recoveryAppPolicies.selection.timeRangeSummary')
      .replace('{age}', formatInterval(policy.snapshotMaxAgeValue ?? 0, policy.snapshotMaxAgeUnit ?? 'hours', t))
  }
  return t('recoveryAppPolicies.selection.exactTimeSummary').replace('{time}', policy.snapshotTargetTime ?? '-')
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (policyId: string) => void,
): ColumnDef<RecoveryAppPolicy>[] {
  return [
    {
      id: 'name',
      header: t('tables.recoveryAppPolicy.name'),
      cell: policy => (
        <>
          <span className="block font-semibold text-text-primary">{policy.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{policy.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.recoveryAppPolicy.description'),
      cell: policy => <span className="block max-w-md truncate" title={policy.description}>{policy.description || '-'}</span>,
    },
    {
      id: 'level',
      header: t('tables.recoveryAppPolicy.level'),
      cell: policy => <Badge color={levelColor(policy.level)} size="sm">{policy.level}</Badge>,
    },
    {
      id: 'frequency',
      header: t('tables.recoveryAppPolicy.frequency'),
      cell: policy => t('recoveryAppPolicies.every').replace('{interval}', formatInterval(policy.frequencyValue, policy.frequencyUnit, t)),
    },
    {
      id: 'selection',
      header: t('tables.recoveryAppPolicy.selection'),
      cell: policy => formatSelection(policy, t),
    },
    {
      id: 'status',
      header: t('tables.recoveryAppPolicy.status'),
      cell: policy => <Badge color={policy.enabled ? 'success' : 'light'} size="sm">{t(policy.enabled ? 'recoveryAppPolicies.enabled' : 'recoveryAppPolicies.disabled')}</Badge>,
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

interface RecoveryAppPoliciesTableProps {
  policies: RecoveryAppPolicy[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function RecoveryAppPoliciesTable({ policies, isLoading, error, isRetrying, onRetry }: RecoveryAppPoliciesTableProps) {
  const { t } = useTranslation()
  const deletePolicy = useDeleteRecoveryAppPolicy()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<RecoveryAppPolicy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RecoveryAppPolicy | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryAppPolicyFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryAppPolicyFilters>(EMPTY_FILTERS)
  const filterOptions = useMemo(() => ({ levels: Array.from(new Set(policies.map(policy => policy.level))).sort() }), [policies])
  const rows = useMemo(() => policies.filter(policy => (
    (!filters.level || policy.level === filters.level)
    && (!filters.status || (filters.status === 'enabled' ? policy.enabled : !policy.enabled))
    && (!filters.selectionMode || policy.snapshotSelectionMode === filters.selectionMode)
  )), [filters, policies])
  const selected = rows.find(policy => policy.id === selectedId) ?? null
  const jsonViewed = rows.find(policy => policy.id === jsonViewId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description', 'level', 'snapshotSelectionMode'] })
  const activeFilterCount = Number(Boolean(filters.level)) + Number(Boolean(filters.status)) + Number(Boolean(filters.selectionMode))

  if (isLoading) {
    return <DataTableSkeleton columnCount={7} ariaLabel={t('recoveryAppPolicies.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('recoveryAppPolicies.searchPlaceholder')}
        searchLabel={t('recoveryAppPolicies.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('recoveryAppPolicies.filters.title')}
        filterButtonLabel={t('recoveryAppPolicies.filters.button')}
        cancelLabel={t('buttons.cancel')}
        clearLabel={t('buttons.clearAll')}
        applyLabel={t('buttons.apply')}
        activeFilterCount={activeFilterCount}
        onFilterOpen={() => { setPendingFilters(filters) }}
        onApplyFilters={() => { setFilters(pendingFilters); table.setPage(1) }}
        onClearFilters={() => { setFilters(EMPTY_FILTERS); setPendingFilters(EMPTY_FILTERS); table.setPage(1) }}
        filterPanel={(
          <>
            <Field label={t('recoveryAppPolicies.filters.level')} htmlFor="recovery-app-policy-level-filter">
              <Select id="recovery-app-policy-level-filter" value={pendingFilters.level} onChange={event => { setPendingFilters(current => ({ ...current, level: event.target.value })) }}>
                <option value="">{t('recoveryAppPolicies.filters.allLevels')}</option>
                {filterOptions.levels.map(level => <option key={level} value={level}>{level}</option>)}
              </Select>
            </Field>
            <Field label={t('recoveryAppPolicies.filters.status')} htmlFor="recovery-app-policy-status-filter">
              <Select id="recovery-app-policy-status-filter" value={pendingFilters.status} onChange={event => { setPendingFilters(current => ({ ...current, status: event.target.value })) }}>
                <option value="">{t('recoveryAppPolicies.filters.allStatuses')}</option>
                <option value="enabled">{t('recoveryAppPolicies.enabled')}</option>
                <option value="disabled">{t('recoveryAppPolicies.disabled')}</option>
              </Select>
            </Field>
            <Field label={t('recoveryAppPolicies.filters.selectionMode')} htmlFor="recovery-app-policy-selection-filter">
              <Select id="recovery-app-policy-selection-filter" value={pendingFilters.selectionMode} onChange={event => { setPendingFilters(current => ({ ...current, selectionMode: event.target.value })) }}>
                <option value="">{t('recoveryAppPolicies.filters.allSelectionModes')}</option>
                <option value="latest">{t('recoveryAppPolicies.selection.latest')}</option>
                <option value="time_range">{t('recoveryAppPolicies.selection.time_range')}</option>
                <option value="exact_time">{t('recoveryAppPolicies.selection.exact_time')}</option>
              </Select>
            </Field>
          </>
        )}
      />

      <DataTableRequestState error={error ? { title: t('recoveryAppPolicies.loadFailed'), retryLabel: t('buttons.retry'), isRetrying, onRetry } : null}>
        <DataTable
          columns={getColumns(t, setJsonViewId)}
          rows={table.pageItems}
          rowKey={policy => policy.id}
          density={table.density}
          minWidthClassName="min-w-260"
          ariaLabel={t('recoveryAppPolicies.tableLabel')}
          rowAriaLabel={policy => policy.name}
          onRowClick={policy => { setSelectedId(policy.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('recoveryAppPolicies.noMatches') : t('recoveryAppPolicies.empty')}
        />
      </DataTableRequestState>

      {!error ? <DataTablePagination page={table.page} pageSize={table.pageSize} total={table.total} onPageChange={table.setPage} onPageSizeChange={table.setPageSize} /> : null}

      <DetailDrawer
        open={selected !== null}
        onClose={() => { setSelectedId(null) }}
        resizable
        eyebrow={t('recoveryAppPolicies.drawer.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color={levelColor(selected.level)} size="sm">{selected.level}</Badge> : null}
        ariaLabel={t('recoveryAppPolicies.drawer.label')}
        closeLabel={t('recoveryAppPolicies.drawer.close')}
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
            <DetailRow label={t('details.level')} value={selected.level} />
            <DetailRow label={t('details.frequency')} value={t('recoveryAppPolicies.every').replace('{interval}', formatInterval(selected.frequencyValue, selected.frequencyUnit, t))} />
            <DetailRow label={t('details.retention')} value={formatInterval(selected.retentionValue, selected.retentionUnit, t)} />
            <DetailRow label={t('details.snapshotSelection')} value={formatSelection(selected, t)} />
            <DetailRow label={t('details.bootVerify')} value={t(selected.bootVerify ? 'recoveryAppPolicies.yes' : 'recoveryAppPolicies.no')} />
            <DetailRow label={t('details.status')} value={t(selected.enabled ? 'recoveryAppPolicies.enabled' : 'recoveryAppPolicies.disabled')} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? <RecoveryAppPolicyModal open onClose={() => { setEditing(null) }} existingPolicies={rows} policy={editing} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('recoveryAppPolicies.delete.title')}
        message={t('recoveryAppPolicies.delete.message').replace('{name}', deleteTarget?.name ?? '')}
        confirmLabel={t('buttons.delete')}
        cancelLabel={t('buttons.cancel')}
        loadingLabel={t('buttons.deleting')}
        tone="danger"
        isLoading={deletePolicy.isPending}
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget) return
          deletePolicy.mutate(deleteTarget.id, { onSuccess: () => { setDeleteTarget(null); setSelectedId(null) } })
        }}
      />

      {jsonViewed ? (
        <ChecklistResultDialog
          open={jsonViewed !== null}
          title={t('recoveryAppPolicies.jsonViewer.title')}
          primaryName={jsonViewed.name}
          subtitle={jsonViewed.id}
          badges={[
            { label: jsonViewed.enabled ? 'Active' : 'Inactive', color: jsonViewed.enabled ? 'success' : 'warning' },
          ]}
          statusBar={{
            title: t('recoveryAppPolicies.policyLoaded'),
            status: 'success',
            passedCount: 4,
            totalCount: 4,
          }}
          checks={[
            // {
            //   name: t('recoveryAppPolicies.policyId'),
            //   detail: jsonViewed.id,
            //   status: 'ok',
            // },
            // {
            //   name: t('recoveryAppPolicies.policyName'),
            //   detail: jsonViewed.name,
            //   status: 'ok',
            // },
            // {
            //   name: t('recoveryAppPolicies.description'),
            //   detail: jsonViewed.description || '—',
            //   status: 'ok',
            // },
            // {
            //   name: t('recoveryAppPolicies.level'),
            //   detail: jsonViewed.level,
            //   status: 'ok',
            // },
          ]}
          responseData={toRecoveryAppPolicyReadPayload(jsonViewed)}
          responseSchemaType="RecoveryAppPolicy"
          onClose={() => { setJsonViewId(null) }}
        />
      ) : null}
    </div>
  )
}
