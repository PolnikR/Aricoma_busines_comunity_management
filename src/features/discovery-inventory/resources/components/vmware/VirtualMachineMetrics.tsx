import { CpuIcon, LayersIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
import { CollapsibleMetrics } from '@/shared/components/stat-card/CollapsibleMetrics'
import { useTranslation } from '@/hooks/useTranslation'
import { RESOURCE_METRICS_COLLAPSED_KEY } from '../../state/resourceMetricsPreference'
import type { VirtualMachineMetricsData } from '../../types/virtualMachineTypes'

interface VirtualMachineMetricsProps {
  metrics?: VirtualMachineMetricsData
  isLoading?: boolean
}

export function VirtualMachineMetrics({ metrics, isLoading = false }: VirtualMachineMetricsProps) {
  const { t } = useTranslation()
  const values = metrics ?? { total: 0, poweredOn: 0, clusters: 0, totalCpu: 0, totalMemoryGb: 0 }
  const metricItems = [
    { label: t('vm.metrics.discovered'), value: values.total.toLocaleString(), helper: t('vm.metrics.validated'), icon: <ServerIcon className="size-4" /> },
    { label: t('vm.metrics.poweredOn'), value: values.poweredOn.toLocaleString(), helper: `${String(Math.round((values.poweredOn / Math.max(values.total, 1)) * 100))}% ${t('vm.metrics.ofInventory')}`, isHelperLoading: isLoading, icon: <LayersIcon className="size-4" /> },
    { label: t('vm.metrics.clusters'), value: values.clusters.toLocaleString(), helper: t('vm.metrics.activePlacements'), icon: <CpuIcon className="size-4" /> },
    { label: t('vm.metrics.allocatedMemory'), value: `${values.totalMemoryGb.toLocaleString()} GB`, helper: `${values.totalCpu.toLocaleString()} ${t('vm.metrics.totalVcpu')}`, isHelperLoading: isLoading, icon: <MemoryIcon className="size-4" /> },
  ]

  return <CollapsibleMetrics items={metricItems} storageKey={RESOURCE_METRICS_COLLAPSED_KEY} isLoading={isLoading} />
}
