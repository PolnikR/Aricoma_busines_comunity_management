import { CpuIcon, LayersIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
import { StatCard } from '@/shared/components/stat-card/StatCard'
import type { ReactNode } from 'react'
import { formatCapacityBytes, parseCapacityBytes } from '../helpers/parseCapacity'
import type {
  FlashSystemInventory,
  FlashSystemVolumeResource,
  PowerPartitionResource,
} from '../model/discoveryTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

interface MetricLabels {
  total: string
  active: string
  third: string
  fourth: string
  validated: string
}

interface FlashSystemMetricsProps {
  resources: FlashSystemVolumeResource[]
  inventories: { provider: ProviderRecord; inventory: FlashSystemInventory }[]
  labels: MetricLabels
  helperLabels?: { pools: string; hosts: string }
  isLoading?: boolean
}

export function FlashSystemMetrics({ resources, inventories, labels, helperLabels, isLoading = false }: FlashSystemMetricsProps) {
  const pools = new Map<string, { capacity: number; free: number }>()
  inventories.forEach(({ provider, inventory }) => {
    Object.entries(inventory.pools).forEach(([poolId, pool]) => {
      const key = `${provider.id}:${poolId}`
      pools.set(key, {
        capacity: parseCapacityBytes(pool.capacity) ?? 0,
        free: parseCapacityBytes(pool.free_capacity) ?? 0,
      })
    })
  })
  const totalCapacity = [...pools.values()].reduce((sum, pool) => sum + pool.capacity, 0)
  const freeCapacity = [...pools.values()].reduce((sum, pool) => sum + pool.free, 0)
  const items = [
    { label: labels.total, value: resources.length.toLocaleString(), helper: labels.validated, icon: <ServerIcon className="size-4" /> },
    { label: labels.active, value: resources.filter((resource) => resource.status.toLowerCase() === 'online').length.toLocaleString(), helper: labels.validated, icon: <LayersIcon className="size-4" /> },
    { label: labels.third, value: formatCapacityBytes(totalCapacity), helper: `${String(pools.size)} ${helperLabels?.pools ?? ''}`.trim(), icon: <MemoryIcon className="size-4" /> },
    { label: labels.fourth, value: formatCapacityBytes(freeCapacity), helper: `${String(new Set(resources.flatMap((resource) => resource.resolvedHostMaps.map((host) => `${resource.providerId}:${host.host_id}`))).size)} ${helperLabels?.hosts ?? ''}`.trim(), icon: <CpuIcon className="size-4" /> },
  ]
  return <MetricGrid items={items} isLoading={isLoading} dynamicHelperIndexes={[2, 3]} />
}

interface PowerMetricsProps {
  resources: PowerPartitionResource[]
  labels: MetricLabels
  isLoading?: boolean
}

export function PowerMetrics({ resources, labels, isLoading = false }: PowerMetricsProps) {
  const items = [
    { label: labels.total, value: resources.length.toLocaleString(), helper: labels.validated, icon: <ServerIcon className="size-4" /> },
    { label: labels.active, value: resources.filter((resource) => resource.partitionState.toLowerCase() === 'running').length.toLocaleString(), helper: labels.validated, icon: <LayersIcon className="size-4" /> },
    { label: labels.third, value: resources.filter((resource) => resource.partitionKind === 'LPAR').length.toLocaleString(), helper: labels.validated, icon: <CpuIcon className="size-4" /> },
    { label: labels.fourth, value: resources.filter((resource) => resource.partitionKind === 'VIOS').length.toLocaleString(), helper: labels.validated, icon: <MemoryIcon className="size-4" /> },
  ]
  return <MetricGrid items={items} isLoading={isLoading} />
}

interface MetricItem {
  label: string
  value: string
  helper: string
  icon: ReactNode
}

function MetricGrid({ items, isLoading, dynamicHelperIndexes = [] }: { items: MetricItem[]; isLoading: boolean; dynamicHelperIndexes?: number[] }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 xl:grid-cols-4">
      {items.map((item, index) => <StatCard key={item.label} size="sm" isLoading={isLoading} isHelperLoading={isLoading && dynamicHelperIndexes.includes(index)} {...item} />)}
    </div>
  )
}
