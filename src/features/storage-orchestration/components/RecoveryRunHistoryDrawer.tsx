import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import { DataTablePagination, DetailDrawer } from '@/shared/components/data-table'
import { useAppRunHistory } from '../hooks/useAppRunHistory'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '../helpers/formatRecoveryRun'
import type { OrchestratedApp } from '../model/recoveryRunTypes'

const PAGE_SIZE = 10

interface RecoveryRunHistoryDrawerProps {
  app: OrchestratedApp | null
  providerId: string | null
  onClose: () => void
}

// Full paginated history for exactly one app, fetched only while this drawer
// is open — the overview table never fetches more than each app's latest run.
export function RecoveryRunHistoryDrawer({ app, providerId, onClose }: RecoveryRunHistoryDrawerProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAppRunHistory({
    providerId,
    dagId: app?.dagId ?? null,
    page,
    pageSize: PAGE_SIZE,
  })

  return (
    <DetailDrawer
      open={app !== null}
      onClose={() => { setPage(1); onClose() }}
      eyebrow={t('recoveryRuns.drawer.eyebrow')}
      title={app?.name ?? ''}
      subtitle={<span className="font-mono">{app?.id}</span>}
      ariaLabel={t('recoveryRuns.drawer.label')}
      closeLabel={t('recoveryRuns.drawer.close')}
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
