import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { Badge } from '@/shared/components/badge/Badge'
import { DataTablePagination } from '@/shared/components/data-table'
import { DetailView, DetailViewSection } from '@/shared/components/detail-view'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'
import { buildAirflowDagUrl } from '@/config/externalServices'
import { ExecutionIcon, ExternalLinkIcon } from '@/shared/icons/Icons'
import { useAppRunHistory } from '../hooks/useAppRunHistory'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'

const PAGE_SIZE = 10

export interface RecoveryRunHistoryEntity {
  id: string
  name: string
  dagId: string
  providerId: string
}

interface RecoveryRunHistoryDetailViewProps {
  entity: RecoveryRunHistoryEntity | null
  onClose: () => void
}

// Full paginated history for exactly one entity (Application or Recovery
// Group), fetched only while this detail view is open — the overview table never
// fetches more than each entity's latest run.
export function RecoveryRunHistoryDetailView({ entity, onClose }: RecoveryRunHistoryDetailViewProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, error, refetch } = useAppRunHistory({
    providerId: entity?.providerId ?? null,
    dagId: entity?.dagId ?? null,
    page,
    pageSize: PAGE_SIZE,
  })
  const { data: platformProviders = [] } = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const providerUrl = platformProviders.find(
    provider => provider.id === entity?.providerId,
  )?.url
  const hasHistory = data.runs.length > 0

  if (!entity) return null

  return (
    <DetailView
      open
      size="md"
      onClose={() => { setPage(1); onClose() }}
      entityLabel={t('recoveryRuns.drawer.entity')}
      title={entity.name}
      meta={<span className="font-mono">{entity.id}</span>}
      ariaLabel={t('recoveryRuns.drawer.label')}
      closeLabel={t('recoveryRuns.drawer.close')}
      headerActions={
        <>
        <a
          href={buildAirflowDagUrl(entity.dagId, providerUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
        >
          {t('recoveryRuns.drawer.viewInAirflow')}
          <ExternalLinkIcon className="size-3.5 shrink-0" />
        </a>
        <KeyedHelpPopover helpKey="recoveryRuns.help" sections={['source', 'refresh', 'airflow']} />
        </>
      }
    >
      <DetailViewSection id="runs" title={t('recoveryRuns.drawer.runs')} icon={ExecutionIcon} count={data.total} description={t('recoveryRuns.drawer.note')}>
        {error ? (
          <FetchErrorAlert
            title={t(hasHistory ? 'recoveryRuns.drawer.refreshFailed' : 'recoveryRuns.drawer.loadFailed')}
            retryLabel={t('buttons.retry')}
            isRetrying={isFetching}
            onRetry={() => { void refetch() }}
          />
        ) : null}

        {isLoading ? (
          <p className="mt-4 text-sm text-text-muted" role="status">{t('recoveryRuns.loading')}</p>
        ) : hasHistory ? (
          <ul className="mt-2 divide-y divide-border">
            {data.runs.map(run => (
              <li key={run.runId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Badge color={runStatusBadgeColor(run.status)} size="sm">{run.status}</Badge>
                  <p className="mt-1 truncate font-mono text-[10.5px] text-text-subtle" title={run.runId}>{run.runId}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{formatRunTimestamp(run.startedAt)}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-text-muted tabular-nums">{formatRunDuration(run.durationSeconds)}</span>
              </li>
            ))}
          </ul>
        ) : !error ? (
          <p className="mt-4 text-sm text-text-muted">{t('recoveryRuns.table.noRuns')}</p>
        ) : null}

        {/* The pagination brings its own padding and divider; align it with the section edges. */}
        <div className="-mx-5 mt-2">
          <DataTablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            pageSizeOptions={[PAGE_SIZE]}
            onPageChange={setPage}
            onPageSizeChange={() => { /* fixed page size for run history */ }}
          />
        </div>
      </DetailViewSection>
    </DetailView>
  )
}
