import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { useTranslation } from '@/hooks/useTranslation'
import type { RecoveryGroupListItem } from '../model/recoveryGroupTypes'

interface RecoveryGroupsTableProps {
  groups: RecoveryGroupListItem[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

interface RecoveryGroupFilters {
  workloadType: string
  resourceType: string
}

const EMPTY_FILTERS: RecoveryGroupFilters = {
  workloadType: '',
  resourceType: '',
}

export function RecoveryGroupsTable({ groups, onEdit, onDelete }: RecoveryGroupsTableProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryGroupFilters>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<RecoveryGroupListItem | null>(null)

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
  const activeFilterCount = Number(Boolean(filters.workloadType)) + Number(Boolean(filters.resourceType))

  const columns = useMemo<ColumnDef<RecoveryGroupListItem>[]>(() => [
    {
      id: 'name',
      header: t('tables.recoveryGroups.group'),
      cell: group => (
        <>
          <span className="block font-semibold text-[#17233d]">{group.name}</span>
          <span className="mt-0.5 block text-[11px] text-[#93a0b5]">{group.description}</span>
        </>
      ),
    },
    {
      id: 'workloadType',
      header: t('tables.recoveryGroups.workloadType'),
      cell: group => <Badge color="info" size="sm">{group.workloadType}</Badge>,
    },
    {
      id: 'resourceType',
      header: t('tables.recoveryGroups.resourceType'),
      cell: group => group.resourceType,
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
                {filterOptions.workloadTypes.map(type => <option key={type} value={type}>{type}</option>)}
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
                {filterOptions.resourceTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
          </>
        }
      />

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
            <DetailRow label={t('tables.recoveryGroups.workloadType')} value={selected.workloadType} />
            <DetailRow label={t('tables.recoveryGroups.resourceType')} value={selected.resourceType} />
            <DetailRow label={t('tables.recoveryGroups.resources')} value={String(selected.resourceCount)} />
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
    </div>
  )
}
