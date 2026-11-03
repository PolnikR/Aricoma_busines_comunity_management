import { Link } from 'react-router'
import type { UseQueryResult } from '@tanstack/react-query'
import { routes } from '@/app/routes'
import { useGetRecoveryGroups } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { useGetRecoveryApps } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { DataTable, type ColumnDef } from '@/shared/components/data-table/DataTable'
import { DataTableSurface } from '@/shared/components/data-table/DataTableSurface'
import { ExternalLinkIcon, GridIcon, LayersIcon } from '@/shared/icons/Icons'
import { findPolicySetConsumers, type ReferenceConsumer } from '../../references/model/policyReferences'

interface UsageSourceProps {
  source: 'groups' | 'applications'
  query: UseQueryResult<ReferenceConsumer[]>
}

function UsageSource({ source, query }: UsageSourceProps) {
  const { t } = useTranslation()
  const label = t(`policyReferences.sources.${source}`)
  const path = source === 'groups' ? routes.recoveryGroups : routes.recoveryApplications
  const SourceIcon = source === 'groups' ? LayersIcon : GridIcon
  const columns: ColumnDef<ReferenceConsumer>[] = [
    { id: 'id', header: t('policyReferences.columns.id'), cell: consumer => (
      <span className="font-mono text-xs text-text-primary wrap-anywhere">{consumer.id}</span>
    ), cellClassName: 'w-2/5' },
    { id: 'name', header: t('policyReferences.columns.name'), cell: consumer => (
      <span className="font-semibold text-text-primary wrap-anywhere">{consumer.name}</span>
    ), cellClassName: 'w-2/5' },
    { id: 'open-detail', header: t('policyReferences.columns.openDetail'), cell: consumer => (
      <Link className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-secondary hover:bg-accent-soft hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        to={{ pathname: path, search: new URLSearchParams({ detail: consumer.id }).toString() }}
        aria-label={t('policyReferences.openDetail', { name: consumer.name })}>
        {t('policyReferences.columns.openDetail')}<ExternalLinkIcon className="h-4 w-4 shrink-0 text-accent" />
      </Link>
    ) },
  ]
  const errorContent = query.isError ? (
    <div className="space-y-2 p-3 text-left wrap-anywhere">
      <Alert variant={query.data === undefined ? 'error' : 'warning'}
        title={t(query.data === undefined ? 'policyReferences.usedIn.error' : 'policyReferences.usedIn.cachedError', { source: label })}
        description={resolveUserFacingErrorMessage(query.error, '')} />
      <Button size="sm" variant="outline" disabled={query.isFetching || query.isPaused} onClick={() => { void query.refetch() }}>
        {t('policyReferences.usedIn.retry', { source: label })}
      </Button>
    </div>
  ) : null
  const toolbar = (
    <header className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2">
      <SourceIcon className="h-4 w-4 shrink-0 text-text-muted" />
      <h4 className="min-w-0 flex-1 text-sm font-semibold text-text-primary wrap-anywhere">{label}</h4>
      {query.data !== undefined ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-primary">{query.data.length}</span> : null}
      {query.isPaused ? <p role="status" className="w-full text-xs text-text-muted">{t('policyReferences.usedIn.paused')}</p>
        : query.isFetching && query.data !== undefined ? <p role="status" className="w-full text-xs text-text-muted">{t('policyReferences.usedIn.refreshing')}</p> : null}
    </header>
  )
  return (
    <DataTableSurface ariaLabel={label} toolbar={toolbar}>
      <div className={`h-full min-h-0 overflow-hidden ${query.isError && query.data !== undefined ? 'grid grid-rows-[minmax(0,1fr)_minmax(5.25rem,1fr)]' : 'flex flex-col'}`}>
        {query.isError && query.data !== undefined ? (
          <div tabIndex={0} className="custom-scrollbar min-h-0 touch-auto overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus">
            {errorContent}
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          <DataTable columns={columns} rows={query.data ?? []} rowKey={consumer => consumer.id}
            density="compact" layout="scroll" minWidthClassName="w-144 min-w-full" fillHeight
            headerCellClassName="whitespace-nowrap px-2 @min-[80rem]/data-table:px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
            ariaLabel={query.isLoading ? t('policyReferences.usedIn.loading') : label}
            isLoading={query.isLoading} loadingRowCount={3}
            emptyContent={query.isError && query.data === undefined ? errorContent
              : query.isSuccess && !query.isFetching && !query.isPaused ? (
                <p className="text-sm text-text-muted">{t('policyReferences.usedIn.sourceEmpty', { source: label })}</p>
              ) : <span />}
          />
        </div>
      </div>
    </DataTableSurface>
  )
}

export function PolicySetUsage({ policySetId }: { policySetId: string }) {
  const { t } = useTranslation()
  const groups = useGetRecoveryGroups({ query: {
    select: response => findPolicySetConsumers(policySetId, response.recovery_groups, []).groups,
  } })
  const applications = useGetRecoveryApps({ query: {
    select: response => findPolicySetConsumers(policySetId, [], response.applications).applications,
  } })
  const isUnused = groups.isSuccess && applications.isSuccess && !groups.isFetching && !applications.isFetching
    && !groups.isPaused && !applications.isPaused && groups.data.length === 0 && applications.data.length === 0
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {isUnused ? <p role="status" className="shrink-0 text-sm text-text-muted">{t('policyReferences.usedIn.empty')}</p> : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <UsageSource source="groups" query={groups} />
        <UsageSource source="applications" query={applications} />
      </div>
    </div>
  )
}
