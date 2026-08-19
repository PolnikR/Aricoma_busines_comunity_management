import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import { DataTablePagination, DetailDrawer } from '@/shared/components/data-table'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { buildAirflowDagUrl } from '@/config/externalServices'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import { useAppRunHistory } from '../hooks/useAppRunHistory'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'

const PAGE_SIZE = 10

export interface RecoveryRunHistoryEntity {
  id: string
  name: string
  dagId: string
  providerId: string
}

interface RecoveryRunHistoryDrawerProps {
  entity: RecoveryRunHistoryEntity | null
  onClose: () => void
}

// Full paginated history for exactly one entity (Application or Recovery
// Group), fetched only while this drawer is open — the overview table never
// fetches more than each entity's latest run.
export function RecoveryRunHistoryDrawer({ entity, onClose }: RecoveryRunHistoryDrawerProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAppRunHistory({
    providerId: entity?.providerId ?? null,
    dagId: entity?.dagId ?? null,
    page,
    pageSize: PAGE_SIZE,
  })
  const { data: platformProviders = [] } = usePlatformProviders()
  const providerUrl = platformProviders.find(
    provider => provider.id === entity?.providerId,
  )?.url

  return (
    <DetailDrawer
      open={entity !== null}
      onClose={() => { setPage(1); onClose() }}
      eyebrow={t('recoveryRuns.drawer.eyebrow')}
      title={entity?.name ?? ''}
      subtitle={<span className="font-mono">{entity?.id}</span>}
      ariaLabel={t('recoveryRuns.drawer.label')}
      closeLabel={t('recoveryRuns.drawer.close')}
      headerExtra={entity ? (
        <a
          href={buildAirflowDagUrl(entity.dagId, providerUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
        >
          {t('recoveryRuns.drawer.viewInAirflow')}
          <ExternalLinkIcon className="size-3.5 shrink-0" />
        </a>
      ) : null}
    >
      <div className="px-5 py-3">
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-text-subtle">
          {t('recoveryRuns.drawer.note')}
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-text-muted" role="status">{t('recoveryRuns.loading')}</p>
        ) : (
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
        )}
      </div>

      <DataTablePagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.total}
        onPageChange={setPage}
        onPageSizeChange={() => { /* fixed page size for run history */ }}
      />
    </DetailDrawer>
  )
}
