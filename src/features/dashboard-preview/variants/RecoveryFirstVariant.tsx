import { Badge } from '@/shared/components/badge/Badge'
import { StateCell } from '@/shared/components/data-table'
import { CollapsibleMetrics } from '@/shared/components/stat-card/CollapsibleMetrics'
import { DiskIcon, LayersIcon, PlugIcon, ServerIcon } from '@/shared/icons/Icons'
import { ActivityChart, ActivityLegend } from '../components/Charts'
import { DashboardPanel, DrillAction } from '../components/DashboardPanel'
import { KpiTile } from '../components/KpiTile'
import { ProtectionSummary, RecentRunsTable } from '../components/RecoveryBlocks'
import { AttentionList } from '../components/StatusBlocks'
import type { DashboardData } from '../model/mockDashboardData'

// Variant B: the recovery use-case leads. Posture band (coverage + run health),
// then activity next to what is failing or running now; inventory is a collapsed strip at the bottom.
export function RecoveryFirstVariant({ data }: { data: DashboardData }) {
  const { inventory, recoveryActivity } = data
  const recoveryIssues = data.attention.filter(item => item.category === 'Recovery run' || item.category === 'Metro Mirror')
  const inFlight = data.recentRuns.filter(run => run.status === 'running' || run.status === 'queued')

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <DashboardPanel
          title="Protection coverage"
          description="Share of VMs in at least one recovery group"
          action={<DrillAction label="Unprotected VMs" target="Inventory → VM, filtered to unprotected" />}
          className="lg:col-span-2 xl:col-span-5"
        >
          <ProtectionSummary protection={data.protection} size="lg" />
        </DashboardPanel>

        <DashboardPanel title="Recovery health" description="Runs in the last 7 days" className="xl:col-span-4">
          <div className="flex flex-col gap-3">
            <p className="text-3xl font-semibold leading-none tracking-[-0.02em] text-text-primary tabular-nums">
              {recoveryActivity.successRatePercent}%
              <span className="ml-1.5 text-sm font-medium tracking-normal text-text-muted">success rate</span>
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <KpiTile size="sm" label="Successful" value={recoveryActivity.totals.successful} tone="on" detail="completed" drillTo="Recovery runs → Success" />
              <KpiTile size="sm" label="Failed" value={recoveryActivity.totals.failed} tone="error" detail="2 unresolved" drillTo="Recovery runs → Failed" />
              <KpiTile size="sm" label="Running" value={recoveryActivity.totals.running} tone="off" detail="+1 queued" drillTo="Recovery runs → Running" />
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recovery groups" description="Replication model of configured groups" className="xl:col-span-3">
          <div className="flex flex-col gap-3">
            <p className="text-3xl font-semibold leading-none tracking-[-0.02em] text-text-primary tabular-nums">
              {inventory.recoveryGroups}
              <span className="ml-1.5 text-sm font-medium tracking-normal text-text-muted">groups</span>
            </p>
            <dl className="divide-y divide-border text-xs">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-text-muted">Local (snapshots)</dt>
                <dd className="font-semibold text-text-primary tabular-nums">{inventory.localRecoveryGroups}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-text-muted">Remote · Metro Mirror</dt>
                <dd className="font-semibold text-text-primary tabular-nums">{inventory.remoteRecoveryGroups}</dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-text-muted">Metro Mirror relationships</dt>
                <dd><StateCell tone="warn" label={`${String(inventory.healthyMetroMirrorRelationships)} / ${String(inventory.metroMirrorRelationships)} consistent`} /></dd>
              </div>
            </dl>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardPanel
          title="Recovery activity"
          description="Runs per day, last 7 days"
          action={<ActivityLegend totals={recoveryActivity.totals} />}
          className="xl:col-span-7"
          bodyClassName="flex flex-col"
        >
          <ActivityChart days={recoveryActivity.days} heightClassName="min-h-44 flex-1" />
        </DashboardPanel>

        <DashboardPanel
          title="Failed and degraded"
          description="Recovery problems to resolve"
          tone="attention"
          action={<Badge color="error" size="sm">{recoveryIssues.length} open</Badge>}
          className="xl:col-span-5"
        >
          <AttentionList items={recoveryIssues} />
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-subtle">In progress</p>
            <ul className="flex flex-col gap-1">
              {inFlight.map(run => (
                <li key={run.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{run.name}</span>
                  <span className="text-text-muted">{run.action}</span>
                  <Badge color={run.status === 'running' ? 'info' : 'light'} size="sm">{run.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent recovery runs"
        description="Latest runs across recovery groups and applications"
        action={<DrillAction label="All runs" target="Recovery runs" />}
        bodyClassName="p-0"
      >
        <RecentRunsTable runs={data.recentRuns} />
      </DashboardPanel>

      <section aria-label="Infrastructure summary" className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">Infrastructure</h2>
        <CollapsibleMetrics
          storageKey="dashboard-preview.b.infrastructure-collapsed"
          items={[
            { label: 'Virtual machines', value: String(inventory.virtualMachines), helper: `${String(inventory.runningVms)} running`, icon: <ServerIcon className="size-4" /> },
            { label: 'Storage volumes', value: String(inventory.storageVolumes), helper: `${String(inventory.protectedVolumes)} protected`, icon: <DiskIcon className="size-4" /> },
            { label: 'Providers', value: String(inventory.providers), helper: `${String(inventory.healthyProviders)} healthy`, icon: <PlugIcon className="size-4" /> },
            { label: 'Consistency groups', value: String(inventory.consistencyGroups), helper: `${String(inventory.snapshots)} snapshots`, icon: <LayersIcon className="size-4" /> },
          ]}
        />
      </section>
    </div>
  )
}
