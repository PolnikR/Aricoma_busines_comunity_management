import { Badge } from '@/shared/components/badge/Badge'
import { Card } from '@/shared/components/card/Card'
import { StateCell } from '@/shared/components/data-table'
import type { StateTone } from '@/shared/components/data-table'
import { AlertTriangleIcon, ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { Sparkline } from '../components/Charts'
import { DashboardPanel, DrillAction } from '../components/DashboardPanel'
import { RecentRunsTable } from '../components/RecoveryBlocks'
import { AttentionList } from '../components/StatusBlocks'
import type { DashboardData } from '../model/mockDashboardData'
import { toneSoftClass } from '../model/statusTone'

interface BoardRow {
  domain: string
  tone: StateTone
  status: string
  metric: string
  metricLabel: string
  detail: string
  trend: number[]
  drillTo: string
}

// Variant D: exceptions first. One status line, the issue inbox as full-width rows,
// then a status board with one row per domain instead of a grid of cards.
export function StatusBoardVariant({ data }: { data: DashboardData }) {
  const { inventory, trends } = data
  const critical = data.attention.filter(item => item.severity === 'error').length
  const warnings = data.attention.length - critical
  const board: BoardRow[] = [
    { domain: 'Protection', tone: 'warn', status: 'Gaps', metric: `${String(data.protection.coveragePercent)}%`, metricLabel: 'VM coverage', detail: `${String(data.protection.totalVms - data.protection.protectedVms)} VMs without a recovery group`, trend: trends.protection, drillTo: 'Inventory → VM, unprotected' },
    { domain: 'Recovery runs', tone: 'error', status: 'Failures', metric: `${String(data.recoveryActivity.successRatePercent)}%`, metricLabel: 'success, 7 days', detail: '3 failed · 2 running · 1 queued', trend: trends.recovery, drillTo: 'Recovery runs' },
    { domain: 'Compute', tone: 'on', status: 'Healthy', metric: String(inventory.virtualMachines), metricLabel: 'virtual machines', detail: `${String(inventory.runningVms)} running · ${String(inventory.vmDisks)} disks`, trend: trends.compute, drillTo: 'Inventory → VM' },
    { domain: 'Storage', tone: 'error', status: '1 offline', metric: String(inventory.storageVolumes), metricLabel: 'volumes', detail: `4 degraded · ${String(inventory.snapshots)} snapshots · ${String(inventory.consistencyGroups)} CGs`, trend: trends.storage, drillTo: 'Inventory → Volumes' },
    { domain: 'Replication', tone: 'warn', status: 'Degraded', metric: `${String(inventory.healthyMetroMirrorRelationships)}/${String(inventory.metroMirrorRelationships)}`, metricLabel: 'MM consistent', detail: `${String(inventory.remoteRecoveryGroups)} remote recovery groups depend on it`, trend: trends.replication, drillTo: 'Inventory → Metro Mirror' },
    { domain: 'Providers', tone: 'error', status: '1 unreachable', metric: `${String(inventory.healthyProviders)}/${String(inventory.providers)}`, metricLabel: 'healthy', detail: 'vc-ostrava-02 not discovered for 3 h', trend: trends.providers, drillTo: 'Providers & connectors' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-4">
        <div className="flex min-w-64 flex-1 items-center gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneSoftClass.error)}>
            <AlertTriangleIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-text-primary">{data.attention.length} issues need attention</p>
            <p className="text-xs text-text-muted">Overall state: degraded · checked {data.generatedAt}</p>
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <div><dt className="text-text-muted">Critical</dt><dd className="text-lg font-semibold text-error-600 tabular-nums dark:text-error-400">{critical}</dd></div>
          <div><dt className="text-text-muted">Warning</dt><dd className="text-lg font-semibold text-warning-600 tabular-nums dark:text-warning-400">{warnings}</dd></div>
          <div><dt className="text-text-muted">Domains healthy</dt><dd className="text-lg font-semibold text-text-primary tabular-nums">{board.filter(row => row.tone === 'on').length} / {board.length}</dd></div>
        </dl>
      </Card>

      <DashboardPanel
        title="Attention required"
        description="Sorted by severity, newest first"
        tone="attention"
        action={<Badge color="error" size="sm">{data.attention.length} open</Badge>}
      >
        <AttentionList items={data.attention} layout="rows" />
      </DashboardPanel>

      <DashboardPanel title="Status board" description="One row per domain · trend over 14 days" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {board.map(row => (
            <li key={row.domain}>
              <button
                type="button"
                title={`Opens ${row.drillTo} (not wired in preview)`}
                className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus md:grid-cols-[9rem_8rem_9rem_minmax(0,1fr)_8rem_auto]"
              >
                <span className="text-[13px] font-semibold text-text-primary">{row.domain}</span>
                <span className="justify-self-end md:justify-self-start"><StateCell tone={row.tone} label={row.status} /></span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-tight text-text-primary tabular-nums">{row.metric}</span>
                  <span className="block truncate text-[11px] text-text-muted">{row.metricLabel}</span>
                </span>
                <span className="min-w-0 truncate text-xs text-text-secondary">{row.detail}</span>
                <Sparkline points={row.trend} className="hidden text-accent md:block" />
                <ChevronRightIcon className="hidden size-4 text-text-subtle transition group-hover:text-accent md:block" />
              </button>
            </li>
          ))}
        </ul>
      </DashboardPanel>

      <DashboardPanel
        title="Recent recovery runs"
        action={<DrillAction label="All runs" target="Recovery runs" />}
        bodyClassName="p-0"
      >
        <RecentRunsTable runs={data.recentRuns.slice(0, 5)} />
      </DashboardPanel>
    </div>
  )
}
