import { Card } from '@/shared/components/card/Card'
import { StateCell } from '@/shared/components/data-table'
import type { StateTone } from '@/shared/components/data-table'
import { ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { ActivityChart, ActivityLegend, SegmentedBar } from '../components/Charts'
import { DashboardPanel, DrillAction } from '../components/DashboardPanel'
import { PerformancePlaceholder } from '../components/InventoryBlocks'
import { ProviderList } from '../components/StatusBlocks'
import type { DashboardData, HealthRow } from '../model/mockDashboardData'
import { toneTextClass } from '../model/statusTone'

function countTone(row: HealthRow, tone: StateTone) {
  return row.slices.filter(slice => slice.tone === tone).reduce((sum, slice) => sum + slice.value, 0)
}

function CountCell({ value, tone }: { value: number, tone: StateTone }) {
  return (
    <td className={cn('px-3 py-2 text-right text-[13px] tabular-nums', value > 0 ? cn('font-semibold', toneTextClass[tone]) : 'text-text-subtle')}>
      {value}
    </td>
  )
}

// Variant C: dense operations console. Inventory band, status matrix next to providers,
// a protection chain from VM to replication, then telemetry placeholders and activity.
export function ControlCenterVariant({ data }: { data: DashboardData }) {
  const { inventory } = data
  const domains = [
    {
      title: 'Compute',
      value: inventory.virtualMachines,
      unit: 'VMs',
      rows: [['Running', inventory.runningVms], ['Powered off', 9], ['VM disks', inventory.vmDisks]] as const,
      slices: data.health[0]?.slices ?? [],
    },
    {
      title: 'Storage',
      value: inventory.storageVolumes,
      unit: 'volumes',
      rows: [['Protected', inventory.protectedVolumes], ['Snapshots', inventory.snapshots], ['CGs', inventory.consistencyGroups]] as const,
      slices: data.health[1]?.slices ?? [],
    },
    {
      title: 'Replication',
      value: inventory.metroMirrorRelationships,
      unit: 'MM relationships',
      rows: [['Consistent', inventory.healthyMetroMirrorRelationships], ['Degraded', 1], ['Remote RGs', inventory.remoteRecoveryGroups]] as const,
      slices: data.health[3]?.slices ?? [],
    },
    {
      title: 'Providers',
      value: inventory.providers,
      unit: 'connected',
      rows: [['Healthy', inventory.healthyProviders], ['Unreachable', 1], ['Active runs', inventory.activeRecoveryRuns]] as const,
      slices: data.health[2]?.slices ?? [],
    },
  ]
  const chain = [
    { label: 'Virtual machines', value: inventory.virtualMachines, note: `${String(data.protection.protectedVms)} protected` },
    { label: 'VM disks', value: inventory.vmDisks, note: 'mapped to volumes' },
    { label: 'Volumes', value: inventory.storageVolumes, note: `${String(inventory.protectedVolumes)} protected` },
    { label: 'Consistency groups', value: inventory.consistencyGroups, note: `${String(inventory.snapshots)} snapshots` },
    { label: 'Metro Mirror', value: inventory.metroMirrorRelationships, note: `${String(inventory.healthyMetroMirrorRelationships)} consistent`, tone: 'warn' as const },
    { label: 'Recovery groups', value: inventory.recoveryGroups, note: `${String(inventory.localRecoveryGroups)} local · ${String(inventory.remoteRecoveryGroups)} remote` },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden p-0! sm:p-0!">
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
          {domains.map(domain => (
            <section key={domain.title} aria-label={domain.title} className="flex min-w-0 flex-col gap-2.5 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">{domain.title}</h2>
                <DrillAction label="Open" target={`Inventory → ${domain.title}`} />
              </div>
              <p className="text-2xl font-semibold leading-none tracking-[-0.01em] text-text-primary tabular-nums">
                {domain.value}
                <span className="ml-1.5 text-xs font-medium tracking-normal text-text-muted">{domain.unit}</span>
              </p>
              <SegmentedBar slices={domain.slices} />
              <dl className="grid grid-cols-3 gap-2 text-xs">
                {domain.rows.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="truncate text-[11px] text-text-muted">{label}</dt>
                    <dd className="font-semibold text-text-primary tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashboardPanel title="Status distribution" description="Health by resource type" className="xl:col-span-8" bodyClassName="p-0">
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[34rem]">
              <thead className="border-b border-border bg-surface-subtle">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
                  <th className="px-3 py-2.5 text-left">Resource type</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                  <th className="px-3 py-2.5 text-right">Healthy</th>
                  <th className="px-3 py-2.5 text-right">Warning</th>
                  <th className="px-3 py-2.5 text-right">Critical</th>
                  <th className="w-[32%] px-3 py-2.5 text-left">Distribution</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.health.map(row => (
                  <tr key={row.id} title={`Opens ${row.drillTo} (not wired in preview)`} className="group cursor-pointer transition-colors hover:bg-accent-soft">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-medium text-text-primary">{row.label}</td>
                    <td className="px-3 py-2 text-right text-[13px] font-semibold text-text-primary tabular-nums">{row.total}</td>
                    <CountCell value={countTone(row, 'on')} tone="on" />
                    <CountCell value={countTone(row, 'warn')} tone="warn" />
                    <CountCell value={countTone(row, 'error')} tone="error" />
                    <td className="px-3 py-2"><SegmentedBar slices={row.slices} /></td>
                    <td className="pr-3"><ChevronRightIcon className="size-4 text-text-subtle group-hover:text-accent" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Providers"
          description={`${String(inventory.healthyProviders)} of ${String(inventory.providers)} healthy`}
          action={<DrillAction label="All" target="Providers & connectors" />}
          className="xl:col-span-4"
        >
          <ProviderList providers={data.providers} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="Protection chain" description="From workload to replication — each step is a drill-down into inventory">
        <ol className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
          {chain.map((step, index) => (
            <li key={step.label} className="relative min-w-0">
              <button
                type="button"
                title={`Opens Inventory → ${step.label} (not wired in preview)`}
                className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-border bg-surface-subtle px-3 py-2.5 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
              >
                <span className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wide text-text-subtle">{index + 1}. {step.label}</span>
                <span className="text-lg font-semibold leading-tight text-text-primary tabular-nums">{step.value}</span>
                {step.tone ? <StateCell tone={step.tone} label={step.note} /> : <span className="text-[11px] text-text-muted">{step.note}</span>}
              </button>
              {index < chain.length - 1 ? (
                <ChevronRightIcon className="absolute -right-2.5 top-1/2 z-10 hidden size-3.5 -translate-y-1/2 rounded-full bg-surface text-text-subtle xl:block" />
              ) : null}
            </li>
          ))}
        </ol>
      </DashboardPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <PerformancePlaceholder metrics={data.performance} className="xl:col-span-7" />
        <DashboardPanel
          title="Recovery activity"
          description="Last 7 days"
          action={<DrillAction label="Runs" target="Recovery runs" />}
          className="xl:col-span-5"
        >
          <div className="flex flex-col gap-3">
            <ActivityChart days={data.recoveryActivity.days} heightClassName="h-28" />
            <ActivityLegend totals={data.recoveryActivity.totals} />
          </div>
        </DashboardPanel>
      </div>
    </div>
  )
}
