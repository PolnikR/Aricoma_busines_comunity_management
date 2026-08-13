import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import {
  DataTable,
  DataTableToolbar,
  DataTablePagination,
  DataTableRequestState,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { JsonViewerModal } from '@/shared/components/modal/JsonViewerModal'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

interface RecoveryApplicationsTableProps {
  applications: RecoveryApplicationListItem[]
  providers?: { id: string; name: string }[]
  onEdit?: (id: string) => void
  error?: Error | null
  isRetrying?: boolean
  onRetry?: () => void
}

interface RecoveryApplicationFilters {
  environment: string
  platform: string
}

const EMPTY_FILTERS: RecoveryApplicationFilters = {
  environment: '',
  platform: '',
}

function getApplicationStatus(app: RecoveryApplicationListItem): 'Active' | 'Draft' {
  const tiers = Object.keys(app.data.application.tiers)
  return tiers.length > 0 ? 'Active' : 'Draft'
}

function getStatusBadgeColor(status: 'Active' | 'Draft'): 'success' | 'warning' {
  return status === 'Active' ? 'success' : 'warning'
}

function getProviderLabel(providerId: string, providers?: { id: string; name: string }[]): string {
  if (!providerId) return '—'
  const provider = providers?.find(p => p.id === providerId)
  return provider?.name ?? providerId
}

function getSubmissionBadgeColor(status: string): 'success' | 'error' {
  return status === 'ok' ? 'success' : 'error'
}

function getBaseColumns(t: ReturnType<typeof useTranslation>['t'], providers?: { id: string; name: string }[]): ColumnDef<RecoveryApplicationListItem>[] {
  return [
  {
    id: 'name',
    header: t('tables.recovery.application'),
    cell: (app) => (
      <>
        <span className="block font-semibold text-text-primary">{app.data.application.name}</span>
        <span className="mt-0.5 block text-[11px] text-text-subtle">{app.data.application.description}</span>
      </>
    ),
  },
  {
    id: 'environment',
    header: t('tables.recovery.environment'),
    cell: (app) => <Badge color="info" size="sm">{app.data.application.environment}</Badge>,
  },
  {
    id: 'platform',
    header: t('tables.recovery.platform'),
    cell: (app) => <span className="text-[13px] text-text-secondary">{getProviderLabel(app.data.application.platform, providers)}</span>,
  },
  {
    id: 'tiers',
    header: t('tables.recovery.tiers'),
    cell: (app) => <span className="text-[13px] text-text-secondary text-right">{Object.keys(app.data.application.tiers).length}</span>,
  },
  {
    id: 'status',
    header: t('tables.recovery.status'),
    cell: (app) => {
      const status = getApplicationStatus(app)
      return <Badge color={getStatusBadgeColor(status)} size="sm">{t(status === 'Active' ? 'tables.recovery.active' : 'tables.recovery.draft')}</Badge>
    },
  },
  {
    id: 'submission',
    header: t('tables.recovery.submission'),
    cell: (app) => {
      if (!app.submission) return <span className="text-text-subtle">—</span>
      return <Badge color={getSubmissionBadgeColor(app.submission.status)} size="sm">{app.submission.status}</Badge>
    },
  },
  ]
}

function getRecoveryApplicationJson(app: RecoveryApplicationListItem) {
  return {
    id: app.id,
    ...(app.policySetId !== undefined ? { policy_set_id: app.policySetId } : {}),
    application: app.data.application,
    ...(app.airflowRunId !== undefined ? { airflow_run_id: app.airflowRunId } : {}),
    ...(app.pushToOrchestrator !== undefined ? { push_to_orchestrator: app.pushToOrchestrator } : {}),
  }
}

export function RecoveryApplicationsTable({
  applications,
  providers,
  onEdit,
  error = null,
  isRetrying = false,
  onRetry = () => undefined,
}: RecoveryApplicationsTableProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryApplicationFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryApplicationFilters>(EMPTY_FILTERS)

  const filterOptions = useMemo(() => ({
    environments: Array.from(new Set(
      applications.map(app => app.data.application.environment),
    )).sort(),
    platforms: Array.from(new Set(
      applications.map(app => app.data.application.platform).filter(Boolean),
    )).sort(),
  }), [applications])

  const rows = useMemo(() => applications.filter((app) => {
    const application = app.data.application
    return (
      (!filters.environment || application.environment === filters.environment)
      && (!filters.platform || application.platform === filters.platform)
    )
  }), [applications, filters])
  const selected = rows.find((app) => app.id === selectedId) ?? null
  const jsonViewed = rows.find((app) => app.id === jsonViewId) ?? null
  const activeFilterCount = Number(Boolean(filters.environment)) + Number(Boolean(filters.platform))

  const columns = useMemo(() => [
    ...getBaseColumns(t, providers),
    {
      id: 'json',
      header: t('tables.recovery.json'),
      cell: (app: RecoveryApplicationListItem) => (
        <Button
          size="xs"
          variant="soft"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            setJsonViewId(app.id)
          }}
        >
          {t('tables.recovery.viewJson')}
        </Button>
      ),
    },
  ], [t, providers])

  const table = useTableState(rows, {
    searchFields: ['id'],
  })

  const prepareFilters = () => {
    setPendingFilters(filters)
  }

  const applyFilters = () => {
    setFilters(pendingFilters)
    table.setPage(1)
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
        searchPlaceholder={t('pages.recovery.searchPlaceholder')}
        searchLabel={t('pages.recovery.searchLabel')}
        density={table.density}
        onDensityChange={table.setDensity}
        filterTitle={t('pages.recovery.filters.title')}
        filterButtonLabel={t('pages.recovery.filters.button')}
        cancelLabel={t('buttons.cancel')}
        clearLabel={t('buttons.clearAll')}
        applyLabel={t('buttons.apply')}
        activeFilterCount={activeFilterCount}
        onFilterOpen={prepareFilters}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        filterPanel={
          <>
            <Field
              label={t('pages.recovery.filters.environment')}
              htmlFor="recovery-application-environment-filter"
            >
              <Select
                id="recovery-application-environment-filter"
                value={pendingFilters.environment}
                onChange={(event) => {
                  setPendingFilters(current => ({
                    ...current,
                    environment: event.target.value,
                  }))
                }}
              >
                <option value="">{t('pages.recovery.filters.allEnvironments')}</option>
                {filterOptions.environments.map(environment => (
                  <option key={environment} value={environment}>{environment}</option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('pages.recovery.filters.platform')}
              htmlFor="recovery-application-platform-filter"
            >
              <Select
                id="recovery-application-platform-filter"
                value={pendingFilters.platform}
                onChange={(event) => {
                  setPendingFilters(current => ({
                    ...current,
                    platform: event.target.value,
                  }))
                }}
              >
                <option value="">{t('pages.recovery.filters.allPlatforms')}</option>
                {filterOptions.platforms.map(platform => (
                  <option key={platform} value={platform}>{getProviderLabel(platform)}</option>
                ))}
              </Select>
            </Field>
          </>
        }
      />

      <DataTableRequestState
        error={error ? {
          title: t('pages.recovery.error.title'),
          description: error.message,
          retryLabel: t('pages.recovery.error.retryButton'),
          isRetrying,
          onRetry,
        } : null}
      >
        <DataTable
          columns={columns}
          rows={table.pageItems}
          rowKey={(app) => app.id}
          density={table.density}
          minWidthClassName="min-w-250"
          ariaLabel={t('pages.recovery.tableAriaLabel')}
          onRowClick={(app) => { setSelectedId(app.id) }}
          selectedRowKey={selectedId}
          emptyContent={applications.length > 0 ? t('messages.noResults') : t('pages.recovery.empty.noApplications')}
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
        eyebrow={t('drawer.selectedApplication')}
        title={selected?.data.application.name ?? ''}
        ariaLabel={t('drawer.applicationDetail')}
        closeLabel={t('drawer.closeApplication')}
        footer={selected && onEdit ? (
          <Button
            onClick={() => { onEdit(selected.id); setSelectedId(null) }}
            size="sm"
            className="w-full"
          >
            {t('buttons.edit')}
          </Button>
        ) : null}
      >
        {selected ? (
          <dl className="px-5 py-2 space-y-3">
            <DetailRow label={t('details.description')} value={selected.data.application.description ?? '-'} />
            <DetailRow label={t('details.environment')} value={selected.data.application.environment} />
            <DetailRow label={t('details.platform')} value={getProviderLabel(selected.data.application.platform)} />
            <DetailRow label={t('details.tiers')} value={String(Object.keys(selected.data.application.tiers).length)} />
            <DetailRow
              label={t('details.status')}
              value={<Badge color={getStatusBadgeColor(getApplicationStatus(selected))} size="sm">{t(getApplicationStatus(selected) === 'Active' ? 'details.statusActive' : 'details.statusDraft')}</Badge>}
            />
            {selected.submission && (
              <DetailRow
                label={t('details.submission')}
                value={
                  <>
                    <Badge color={getSubmissionBadgeColor(selected.submission.status)} size="sm">{selected.submission.status}</Badge>
                    <span className="mt-1 block font-mono text-[11px] text-text-subtle">{selected.submission.remotePath}</span>
                  </>
                }
              />
            )}
          </dl>
        ) : null}
      </DetailDrawer>

      <JsonViewerModal
        open={jsonViewed !== null}
        title={t('recovery.modal.jsonViewer.title')}
        data={jsonViewed ? getRecoveryApplicationJson(jsonViewed) : null}
        closeLabel={t('buttons.close')}
        onClose={() => { setJsonViewId(null) }}
      />
    </div>
  )
}
