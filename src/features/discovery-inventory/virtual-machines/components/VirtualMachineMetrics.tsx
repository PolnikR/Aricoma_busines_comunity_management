import { CpuIcon, LayersIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
import { StatCard } from '@/shared/components/stat-card/StatCard'
import type { VirtualMachineMetricsData } from '../types'

interface VirtualMachineMetricsProps {
  metrics: VirtualMachineMetricsData
}

export function VirtualMachineMetrics({ metrics }: VirtualMachineMetricsProps) {
  const metricItems = [
    { label: 'Discovered VMs', value: metrics.total.toLocaleString(), helper: 'Validated inventory', icon: <ServerIcon className="size-4" /> },
    { label: 'Powered on', value: metrics.poweredOn.toLocaleString(), helper: `${String(Math.round((metrics.poweredOn / Math.max(metrics.total, 1)) * 100))}% of inventory`, icon: <LayersIcon className="size-4" /> },
    { label: 'Clusters', value: metrics.clusters.toLocaleString(), helper: 'Active placements', icon: <CpuIcon className="size-4" /> },
    { label: 'Allocated memory', value: `${metrics.totalMemoryGb.toLocaleString()} GB`, helper: `${metrics.totalCpu.toLocaleString()} total vCPU`, icon: <MemoryIcon className="size-4" /> },
  ]

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4">
      {metricItems.map((metric) => (
        <StatCard key={metric.label} size="sm" {...metric} />
      ))}
    </div>
  )
}
