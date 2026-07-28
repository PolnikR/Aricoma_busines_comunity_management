import { CpuIcon, LayersIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
import { StatCard } from '@/shared/components/stat-card/StatCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { VirtualMachineMetricsData } from '../types'

interface VirtualMachineMetricsProps {
  metrics: VirtualMachineMetricsData
}

export function VirtualMachineMetrics({ metrics }: VirtualMachineMetricsProps) {
  const { t } = useTranslation()
  const metricItems = [
    { label: t('vm.metrics.discovered'), value: metrics.total.toLocaleString(), helper: t('vm.metrics.validated'), icon: <ServerIcon className="size-4" /> },
    { label: t('vm.metrics.poweredOn'), value: metrics.poweredOn.toLocaleString(), helper: `${String(Math.round((metrics.poweredOn / Math.max(metrics.total, 1)) * 100))}% ${t('vm.metrics.ofInventory')}`, icon: <LayersIcon className="size-4" /> },
    { label: t('vm.metrics.clusters'), value: metrics.clusters.toLocaleString(), helper: t('vm.metrics.activePlacements'), icon: <CpuIcon className="size-4" /> },
    { label: t('vm.metrics.allocatedMemory'), value: `${metrics.totalMemoryGb.toLocaleString()} GB`, helper: `${metrics.totalCpu.toLocaleString()} ${t('vm.metrics.totalVcpu')}`, icon: <MemoryIcon className="size-4" /> },
  ]

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4">
      {metricItems.map((metric) => (
        <StatCard key={metric.label} size="sm" {...metric} />
      ))}
    </div>
  )
}
