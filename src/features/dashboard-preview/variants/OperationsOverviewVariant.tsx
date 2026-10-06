import { Badge } from '@/shared/components/badge/Badge'
import { DashboardPanel, DrillAction } from '../components/DashboardPanel'
import { KpiTile } from '../components/KpiTile'
import { ProtectionSummary, RecentRunsTable } from '../components/RecoveryBlocks'
import { StorageSummary } from '../components/InventoryBlocks'
import { AttentionList, HealthList } from '../components/StatusBlocks'
import type { DashboardData } from '../model/mockDashboardData'

// Variant A: conservative enterprise layout. KPI row, then a main column
// (health, storage, recent runs) and a side rail (attention, protection).
export function OperationsOverviewVariant({ data }: { data: DashboardData }) {
  const { inventory } = data
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Virtual machines" value={inventory.virtualMachines} detail={`${String(inventory.runningVms)} running`} drillTo="Inventory → VM" />
        <KpiTile label="Storage volumes" value={inventory.storageVolumes} detail={`${String(inventory.protectedVolumes)} protected`} drillTo="Inventory → Volumes" />
        <KpiTile label="Recovery groups" value={inventory.recoveryGroups} detail={`${String(inventory.localRecoveryGroups)} local · ${String(inventory.remoteRecoveryGroups)} Metro Mirror`} drillTo="Recovery groups" />
        <KpiTile label="Providers" value={inventory.providers} tone="error" detail="1 unreachable" drillTo="Providers & connectors" />
        <KpiTile label="Active runs" value={inventory.activeRecoveryRuns} detail="2 running · 1 queued" drillTo="Recovery runs → Running" />
        <KpiTile label="VM disks" value={inventory.vmDisks} detail="2.1 per VM" drillTo="Inventory → VM disks" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <DashboardPanel
            title="Infrastructure health"
            description="Status distribution per resource type"
            action={<DrillAction label="Inventory" target="Discovery & inventory" />}
            bodyClassName="px-2 py-1.5"
          >
            <HealthList rows={data.health} />
          </DashboardPanel>

          <DashboardPanel title="Storage overview" description="Disks, volumes and copies">
            <StorageSummary storage={data.storage} className="md:grid-cols-4" />
          </DashboardPanel>

          <DashboardPanel
            title="Recent recovery runs"
            description="Latest 8 runs across recovery groups and applications"
            action={<DrillAction label="All runs" target="Recovery runs" />}
            bodyClassName="p-0"
          >
            <RecentRunsTable runs={data.recentRuns} />
          </DashboardPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <DashboardPanel
            title="Attention required"
            description="Issues that need an operator"
            tone="attention"
            action={<Badge color="error" size="sm">{data.attention.length} open</Badge>}
          >
            <AttentionList items={data.attention} />
          </DashboardPanel>

          <DashboardPanel
            title="Protection overview"
            description="VMs covered by a recovery group"
            action={<DrillAction label="Unprotected" target="Inventory → VM, filtered to unprotected" />}
          >
            <ProtectionSummary protection={data.protection} />
          </DashboardPanel>
        </div>
      </div>
    </div>
  )
}
