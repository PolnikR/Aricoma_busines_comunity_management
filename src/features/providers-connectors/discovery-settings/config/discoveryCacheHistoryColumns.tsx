import { Badge } from '@/shared/components/badge/Badge'
import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../../providers/helpers/providerTypeLabel'
import type { DiscoveryCacheRun } from '../model/discoveryCacheTypes'

type Translate = ReturnType<typeof useTranslation>['t']

function formatStartedAt(startedAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(startedAt)
  if (!match) return startedAt

  const year = match[1]
  const month = match[2]
  const day = match[3]
  const hour = match[4]
  const minute = match[5]
  const second = match[6]
  if (!year || !month || !day || !hour || !minute || !second) return startedAt

  return `${String(Number(day))}. ${String(Number(month))}. ${year} ${hour}:${minute}:${second}`
}

export function getDiscoveryCacheHistoryColumns(t: Translate): ColumnDef<DiscoveryCacheRun>[] {
  return [
    {
      id: 'startedAt',
      header: t('pages.discoverySettings.history.table.columns.started'),
      cell: run => <span className="whitespace-nowrap tabular-nums">{formatStartedAt(run.startedAt)}</span>,
    },
    {
      id: 'providerId',
      header: t('pages.discoverySettings.history.table.columns.provider'),
      cell: run => <span className="font-mono text-[12px]">{run.providerId}</span>,
    },
    {
      id: 'providerType',
      header: t('pages.discoverySettings.history.table.columns.providerType'),
      cell: run => <Badge color="info" size="sm">{providerTypeLabel(run.providerType)}</Badge>,
    },
    {
      id: 'triggeredBy',
      header: t('pages.discoverySettings.history.table.columns.triggeredBy'),
      cell: run => (
        <Badge color="light" size="sm">
          {t(`pages.discoverySettings.history.trigger.${run.triggeredBy}`)}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: t('pages.discoverySettings.history.table.columns.status'),
      cell: run => (
        <StateCell
          tone={run.success ? 'on' : 'warn'}
          label={t(run.success
            ? 'pages.discoverySettings.history.status.success'
            : 'pages.discoverySettings.history.status.failed')}
        />
      ),
    },
    {
      id: 'duration',
      header: t('pages.discoverySettings.history.table.columns.duration'),
      cell: run => <span className="whitespace-nowrap tabular-nums">{run.durationMs} ms</span>,
      align: 'right',
    },
    {
      id: 'records',
      header: t('pages.discoverySettings.history.table.columns.records'),
      cell: run => <span className="tabular-nums">{run.recordCount ?? '—'}</span>,
      align: 'right',
    },
  ]
}
