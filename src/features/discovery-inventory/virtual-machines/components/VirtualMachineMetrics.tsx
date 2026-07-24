import { CpuIcon, LayersIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
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
        <article key={metric.label} className="flex items-center gap-2.5 rounded-xl border border-[#dfeaf5] bg-white px-3 py-2 shadow-[0_12px_28px_-24px_rgba(37,72,112,0.5)]">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#edf7ff] text-[#118ccc]">
            {metric.icon}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-semibold leading-tight text-[#17233d]">{metric.value}</strong>
            <p className="truncate text-xs font-medium leading-tight text-[#52627b]">{metric.label}</p>
            <p className="truncate text-[10px] leading-tight text-[#8a98ad]">{metric.helper}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
