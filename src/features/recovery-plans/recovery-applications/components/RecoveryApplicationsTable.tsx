import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { routes } from '@/app/routes'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Field, Select } from '@/shared/components/form/FormControls'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
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
import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useLatestOrchestratorRun } from '@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '@/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { normalizeAirflowDagId } from '@/config/externalServices'
import { AirflowDagLink } from '@/shared/components/airflow/AirflowDagLink'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import type { RollbackReport } from '../api/schemas/recoveryApplicationsSchema'
import { toRecoveryApplicationJson } from '../helpers/mapRecoveryApplications'
import { RecoveryApplicationRollbackResultModal } from './RecoveryApplicationRollbackResultModal'

interface RecoveryApplicationsTableProps {
  applications: RecoveryApplicationListItem[]
  providers?: { id: string; name: string }[]
  onEdit?: (id: string) => void
  onDelete?: (app: RecoveryApplicationListItem) => Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }>
  isDeleting?: boolean
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

export function RecoveryApplicationsTable({
  applications,
  providers,
  onEdit,
  onDelete,
  isDeleting = false,
  error = null,
  isRetrying = false,
  onRetry = () => undefined,
}: RecoveryApplicationsTableProps) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [jsonViewId, setJsonViewId] = useState<string | null>(null)
  const [filters, setFilters] = useState<RecoveryApplicationFilters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<RecoveryApplicationFilters>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<RecoveryApplicationListItem | null>(null)
  const [rollbackResult, setRollbackResult] = useState<{ appName: string; report: RollbackReport } | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'orchestration'>('overview')
  const errorDescription = resolveUserFacingErrorMessage(error, '')

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

  const navigate = useNavigate()
  const { data: platformProviders = [] } = usePlatformProviders()
  const selectedOrchestrationProviderUrl = platformProviders.find(
    provider => provider.id === selected?.orchestrationProviderId,
  )?.url
  const selectedAirflowRunId = selected?.pushToOrchestrator ? selected.airflowRunId : null
  const isSelectedOrchestrated = Boolean(
    selectedAirflowRunId && selected?.orchestrationProviderId,
  )
  const selectedDagId = selectedAirflowRunId ? normalizeAirflowDagId(selectedAirflowRunId) : null
  const { latestRun } = useLatestOrchestratorRun(
    isSelectedOrchestrated ? (selected?.orchestrationProviderId ?? null) : null,
    selectedDagId,
  )

  const columns = useMemo(() => [
    ...getBaseColumns(t, providers),
    {
      id: 'airflowDagId',
      header: t('details.airflowDagId'),
      cell: (app: RecoveryApplicationListItem) => {
        if (!app.airflowRunId) return <span className="text-text-subtle">—</span>

        const providerUrl = platformProviders.find(
          provider => provider.id === app.orchestrationProviderId,
        )?.url
        return (
          <AirflowDagLink
            runId={app.airflowRunId}
            providerUrl={providerUrl}
            stopPropagation
          />
        )
      },
    },
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
  ], [t, providers, platformProviders])

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
        hasCachedData={applications.length > 0}
        error={error ? {
          title: t('pages.recovery.error.title'),
          ...(errorDescription ? { description: errorDescription } : {}),
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
          onRowClick={(app) => { setSelectedId(app.id); setDetailTab('overview') }}
          selectedRowKey={selectedId}
          emptyContent={applications.length > 0 ? t('messages.noResults') : t('pages.recovery.empty.noApplications')}
        />
      </DataTableRequestState>

      {(!error || applications.length > 0) ? (
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
        footer={selected ? (
          <>
            {onDelete ? (
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                onClick={() => { setDeleteTarget(selected) }}
              >
                {t('buttons.delete')}
              </Button>
            ) : null}
            {onEdit ? (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => { onEdit(selected.id); setSelectedId(null) }}
              >
                {t('buttons.edit')}
              </Button>
            ) : null}
          </>
        ) : null}
      >
        {selected ? (
          <>
            <Tabs
              items={[
                { value: 'overview' as const, label: t('details.tabs.overview') },
                { value: 'orchestration' as const, label: t('details.tabs.orchestration') },
              ]}
              value={detailTab}
              onChange={setDetailTab}
              ariaLabel={t('drawer.applicationDetail')}
              indicator="inset"
              className="px-5"
            />
            {detailTab === 'overview' ? (
              <dl className="px-5 py-4 space-y-3">
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
            ) : (
              <dl className="px-5 py-4 space-y-3">
                <DetailRow
                  label={t('details.orchestration')}
                  value={
                    <Badge color={selected.pushToOrchestrator ? 'success' : 'light'} size="sm">
                      {t(selected.pushToOrchestrator ? 'common.yes' : 'common.no')}
                    </Badge>
                  }
                />
                {isSelectedOrchestrated ? (
                  <>
                    <DetailRow
                      label={t('details.airflowDagId')}
                      value={
                        selectedAirflowRunId ? (
                          <AirflowDagLink
                            runId={selectedAirflowRunId}
                            providerUrl={selectedOrchestrationProviderUrl}
                          />
                        ) : (
                          <span className="font-mono text-xs">{selectedDagId}</span>
                        )
                      }
                    />
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
                        void navigate(`${routes.recoveryRuns}?tab=applications&entityType=application&entityId=${encodeURIComponent(selected.id)}`)
                      }}
                    >
                      {t('buttons.viewRecoveryRuns')}
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-text-subtle">{t('details.notOrchestrated')}</p>
                )}
              </dl>
            )}
          </>
        ) : null}
      </DetailDrawer>

      {jsonViewed ? (() => {
        const checks = [
          {
            name: t('recovery.modal.applicationId'),
            detail: jsonViewed.id,
            status: 'ok' as const,
          },
          ...(jsonViewed.airflowRunId ? [{
            name: t('recovery.modal.airflowRunId'),
            detail: jsonViewed.airflowRunId,
            status: 'ok' as const,
          }] : []),
          {
            name: t('recovery.modal.pushToOrchestrator'),
            detail: jsonViewed.pushToOrchestrator ? t('common.yes') : t('common.no'),
            status: 'ok' as const,
          },
        ]
        return (
        <ChecklistResultDialog
          open={true}
          title={t('recovery.modal.jsonViewer.title')}
          primaryName={jsonViewed.data.application.name}
          subtitle={jsonViewed.id}
          badges={[
            { label: jsonViewed.data.application.environment, color: 'info' },
            { label: jsonViewed.data.application.platform, color: 'warning' },
          ]}
          statusBar={{
            title: t('recovery.application.loaded'),
            status: 'success',
            passedCount: checks.length,
            totalCount: checks.length,
          }}
          checks={checks}
          responseData={toRecoveryApplicationJson(jsonViewed)}
          responseSchemaType="RecoveryApplicationRecord"
          onClose={() => { setJsonViewId(null) }}
        />
        )
      })() : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('dialogs.deleteRecoveryApplication')}
        message={t(deleteTarget?.pushToOrchestrator
          ? 'dialogs.deleteRecoveryApplicationOrchestratedMessage'
          : 'dialogs.deleteRecoveryApplicationMessage').replace('{name}', deleteTarget?.data.application.name ?? '')}
        confirmLabel={t('buttons.delete')}
        loadingLabel={t('buttons.deleting')}
        cancelLabel={t('buttons.cancel')}
        isLoading={isDeleting}
        tone="danger"
        onCancel={() => { setDeleteTarget(null) }}
        onConfirm={() => {
          if (!deleteTarget || !onDelete || isDeleting) return
          const target = deleteTarget
          void (async () => {
            try {
              const result = await onDelete(target)
              if (result.rollback) {
                setRollbackResult({ appName: target.data.application.name, report: result.rollback })
              }
              setDeleteTarget(null)
              setSelectedId(null)
            } catch {
              setDeleteTarget(null)
            }
          })()
        }}
      />

      <RecoveryApplicationRollbackResultModal
        open={rollbackResult !== null}
        onClose={() => { setRollbackResult(null) }}
        applicationName={rollbackResult?.appName ?? ''}
        report={rollbackResult?.report ?? null}
      />
    </div>
  )
}
