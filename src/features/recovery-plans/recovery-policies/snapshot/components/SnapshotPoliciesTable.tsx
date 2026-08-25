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
import { Field, Select } from '@/shared/components/form/FormControls'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { toSnapshotPolicySubmitPayload } from '../api/snapshotPoliciesApi'
import { useDeleteSnapshotPolicy } from '../hooks/useDeleteSnapshotPolicy'
import type { SnapshotPolicy } from '../model/snapshotPolicyTypes'
import { SnapshotPolicyModal } from './SnapshotPolicyModal'

interface SnapshotPolicyFilters {
  level: string
  status: string
}

const EMPTY_FILTERS: SnapshotPolicyFilters = { level: '', status: '' }

function levelColor(level: string) {
  if (level === 'critical') return 'error' as const
  if (level === 'high') return 'warning' as const
  if (level === 'medium') return 'info' as const
  return 'light' as const
}

function formatInterval(value: number, unit: string, t: ReturnType<typeof useTranslation>['t']) {
  return `${String(value)} ${t(`snapshotPolicies.unit.${unit}`)}`
}

function getColumns(
  t: ReturnType<typeof useTranslation>['t'],
  onViewJson: (policyId: string) => void,
): ColumnDef<SnapshotPolicy>[] {
  return [
    {
      id: 'name',
      header: t('tables.snapshotPolicy.name'),
      cell: policy => (
        <>
          <span className="block font-semibold text-text-primary">{policy.name}</span>
          <span className="mt-0.5 block font-mono text-[11px] text-text-subtle">{policy.id}</span>
        </>
      ),
    },
    {
      id: 'description',
      header: t('tables.snapshotPolicy.description'),
      cell: policy => <span className="block max-w-md truncate" title={policy.description}>{policy.description || '-'}</span>,
    },
    {
      id: 'level',
      header: t('tables.snapshotPolicy.level'),
      cell: policy => <Badge color={levelColor(policy.level)} size="sm">{policy.level}</Badge>,
    },
    {
      id: 'frequency',
      header: t('tables.snapshotPolicy.frequency'),
      cell: policy => t('snapshotPolicies.every').replace('{interval}', formatInterval(policy.frequencyValue, policy.frequencyUnit, t)),
    },
    {
      id: 'retention',
      header: t('tables.snapshotPolicy.retention'),
      cell: policy => formatInterval(policy.retentionValue, policy.retentionUnit, t),
    },
    {
      id: 'maxSnapshots',
      header: t('tables.snapshotPolicy.maxSnapshots'),
      align: 'right',
      cell: policy => policy.maxSnapshots ?? t('snapshotPolicies.noLimit'),
    },
    {
      id: 'status',
      header: t('tables.snapshotPolicy.status'),
      cell: policy => (
        <Badge color={policy.enabled ? 'success' : 'light'} size="sm">
          {t(policy.enabled ? 'snapshotPolicies.enabled' : 'snapshotPolicies.disabled')}
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

interface SnapshotPoliciesTableProps {
  policies: SnapshotPolicy[]
  isLoading: boolean
  error: Error | null
  isRetrying: boolean
  onRetry: () => void
}

export function SnapshotPoliciesTable({ policies, isLoading, error, isRetrying, onRetry }: SnapshotPoliciesTableProps) {
  const { t } = useTranslation()
  const deletePolicy = useDeleteSnapshotPolicy()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<SnapshotPolicy | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SnapshotPolicy | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<SnapshotPolicyFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<SnapshotPolicyFilters>(EMPTY_FILTERS)
  const filterOptions = useMemo(() => ({
    levels: Array.from(new Set(policies.map(policy => policy.level))).sort(),
  }), [policies])
  const rows = useMemo(() => policies.filter(policy => (
    (!filters.level || policy.level === filters.level)
    && (!filters.status || (filters.status === 'enabled' ? policy.enabled : !policy.enabled))
  )), [filters, policies])
  const selected = rows.find(policy => policy.id === selectedId) ?? null
  const jsonViewed = rows.find(policy => policy.id === jsonViewId) ?? null
  const table = useTableState(rows, { searchFields: ['name', 'id', 'description', 'level'] })
  const activeFilterCount = Number(Boolean(filters.level)) + Number(Boolean(filters.status))
  const loadErrorDetail = extractBackendErrorDetail(error)
  const deleteErrorDetail = extractBackendErrorDetail(deletePolicy.error)

  const prepareFilters = () => {
    setPendingFilters(filters)
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPendingFilters(EMPTY_FILTERS)
    table.setPage(1)
  }

  if (isLoading) {
    return <DataTableSkeleton columnCount={8} ariaLabel={t('snapshotPolicies.loading')} className="flex-1 rounded-none border-0 shadow-none lg:min-h-0" />
  }

  return (
    <div className="flex flex-col">
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('snapshotPolicies.searchPlaceholder')}
        searchLabel={t('snapshotPolicies.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('snapshotPolicies.filters.title')}
        filterButtonLabel={t('snapshotPolicies.filters.button')}
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
            <Field label={t('snapshotPolicies.filters.level')} htmlFor="snapshot-policy-level-filter">
              <Select
                id="snapshot-policy-level-filter"
                value={pendingFilters.level}
                onChange={event => {
                  setPendingFilters(current => ({ ...current, level: event.target.value }))
                }}
              >
                <option value="">{t('snapshotPolicies.filters.allLevels')}</option>
                {filterOptions.levels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('snapshotPolicies.filters.status')} htmlFor="snapshot-policy-status-filter">
              <Select
                id="snapshot-policy-status-filter"
                value={pendingFilters.status}
                onChange={event => {
                  setPendingFilters(current => ({ ...current, status: event.target.value }))
                }}
              >
                <option value="">{t('snapshotPolicies.filters.allStatuses')}</option>
                <option value="enabled">{t('snapshotPolicies.enabled')}</option>
                <option value="disabled">{t('snapshotPolicies.disabled')}</option>
              </Select>
            </Field>
          </>
        }
      />

      {deletePolicy.error ? <Alert className="mx-4 mt-4" title={t('snapshotPolicies.delete.title')} {...(deleteErrorDetail ? { description: deleteErrorDetail } : {})} variant="error" /> : null}

      <DataTableRequestState
        hasCachedData={policies.length > 0}
        error={error ? {
          title: t('snapshotPolicies.loadFailed'),
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
          minWidthClassName="min-w-260"
          ariaLabel={t('snapshotPolicies.tableLabel')}
          rowAriaLabel={policy => policy.name}
          onRowClick={policy => { setSelectedId(policy.id) }}
          selectedRowKey={selectedId}
          emptyContent={rows.length > 0 ? t('snapshotPolicies.noMatches') : t('snapshotPolicies.empty')}
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
        eyebrow={t('snapshotPolicies.drawer.eyebrow')}
        title={selected?.name ?? ''}
        subtitle={<span className="font-mono">{selected?.id}</span>}
        headerExtra={selected ? <Badge color={levelColor(selected.level)} size="sm">{selected.level}</Badge> : null}
        ariaLabel={t('snapshotPolicies.drawer.label')}
        closeLabel={t('snapshotPolicies.drawer.close')}
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
            <DetailRow label={t('details.frequency')} value={t('snapshotPolicies.every').replace('{interval}', formatInterval(selected.frequencyValue, selected.frequencyUnit, t))} />
            <DetailRow label={t('details.retention')} value={formatInterval(selected.retentionValue, selected.retentionUnit, t)} />
            <DetailRow label={t('details.maxSnapshots')} value={selected.maxSnapshots ?? t('snapshotPolicies.noLimit')} />
            <DetailRow label={t('details.status')} value={t(selected.enabled ? 'snapshotPolicies.enabled' : 'snapshotPolicies.disabled')} />
          </dl>
        ) : null}
      </DetailDrawer>

      {editing ? <SnapshotPolicyModal open onClose={() => { setEditing(null) }} existingPolicies={rows} policy={editing} /> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('snapshotPolicies.delete.title')}
        message={t('snapshotPolicies.delete.message').replace('{name}', deleteTarget?.name ?? '')}
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
          title={t('snapshotPolicies.jsonViewer.title')}
          primaryName={jsonViewed.name}
          subtitle={jsonViewed.id}
          badges={[
            { label: jsonViewed.enabled ? t('checklistDialog.active') : t('checklistDialog.inactive'), color: jsonViewed.enabled ? 'success' : 'warning' },
          ]}
          statusBar={{
            title: t('snapshotPolicies.policyLoaded'),
            status: 'success',
            passedCount: 5,
            totalCount: 5,
          }}
          checks={(() => {
            const items = [
              {
                name: t('snapshotPolicies.policyId'),
                detail: jsonViewed.id,
                status: 'ok' as const,
              },
              {
                name: t('snapshotPolicies.policyName'),
                detail: jsonViewed.name,
                status: 'ok' as const,
              },
              {
                name: t('snapshotPolicies.description'),
                detail: jsonViewed.description || '—',
                status: 'ok' as const,
              },
              {
                name: t('snapshotPolicies.level'),
                detail: jsonViewed.level,
                status: 'ok' as const,
              },
              {
                name: t('snapshotPolicies.frequency'),
                detail: String(jsonViewed.frequencyValue) + ' ' + jsonViewed.frequencyUnit,
                status: 'ok' as const,
              },
            ]
            return items
          })()}
          responseData={toSnapshotPolicySubmitPayload(jsonViewed)}
          responseSchemaType="SnapshotPolicy"
          onClose={() => { setJsonViewId(null) }}
        />
      ) : null}
    </div>
  )
}
