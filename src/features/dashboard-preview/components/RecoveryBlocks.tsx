import { Badge } from '@/shared/components/badge/Badge'
import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import {
  formatRunDuration,
  formatRunTimestamp,
  runStatusBadgeColor,
} from '@/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun'
import type { DashboardData, RecentRun } from '../model/mockDashboardData'
import { SegmentedBar, SliceLegend } from './Charts'

interface ProtectionSummaryProps {
  protection: DashboardData['protection']
  size?: 'md' | 'lg'
}

export function ProtectionSummary({ protection, size = 'md' }: ProtectionSummaryProps) {
  const unprotected = protection.totalVms - protection.protectedVms
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className={size === 'lg' ? 'text-4xl font-semibold leading-none tracking-[-0.02em] text-text-primary tabular-nums' : 'text-3xl font-semibold leading-none tracking-[-0.02em] text-text-primary tabular-nums'}>
            {protection.coveragePercent}%
            <span className="ml-1.5 text-sm font-medium tracking-normal text-text-muted">protected</span>
          </p>
          <p className="mt-1.5 text-xs text-text-muted">
            <strong className="font-semibold text-text-secondary tabular-nums">{protection.protectedVms} / {protection.totalVms}</strong> virtual machines
          </p>
        </div>
        <Badge color="warning" size="sm">{unprotected} unprotected</Badge>
      </div>
      <SegmentedBar slices={protection.slices} className={size === 'lg' ? 'h-3' : 'h-2'} />
      <SliceLegend slices={protection.slices} />
    </div>
  )
}

const columns: ColumnDef<RecentRun>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: row => (
      <>
        <span className="block font-semibold text-text-primary">{row.name}</span>
        <span className="mt-0.5 block text-[11px] text-text-subtle">{row.type}</span>
      </>
    ),
  },
  {
    id: 'action',
    header: 'Action',
    cell: row => <span className="whitespace-nowrap">{row.action}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: row => <Badge color={runStatusBadgeColor(row.status)} size="sm">{row.status}</Badge>,
  },
  {
    id: 'started',
    header: 'Started',
    cell: row => <span className="whitespace-nowrap font-mono text-xs">{formatRunTimestamp(row.startedAt)}</span>,
  },
  {
    id: 'duration',
    header: 'Duration',
    align: 'right',
    cell: row => (
      <span className="whitespace-nowrap font-mono text-xs tabular-nums">
        {row.status === 'running' || row.status === 'queued' ? 'in progress' : formatRunDuration(row.durationSeconds)}
      </span>
    ),
  },
]


// Same DataTable, Badge colours and timestamp/duration formatting as the Recovery runs page.
export function RecentRunsTable({ runs }: { runs: RecentRun[] }) {
  return (
    <DataTable
      columns={columns}
      rows={runs}
      rowKey={row => row.id}
      rowAriaLabel={row => row.name}
      onRowClick={() => undefined}
      ariaLabel="Recent recovery runs"
    />
  )
}
