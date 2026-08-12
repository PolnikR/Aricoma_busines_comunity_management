import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { PowerPartitionResource } from '../model/discoveryTypes'

interface PowerColumnLabels {
  partition: string
  status: string
  os: string
  system: string
  managementIp: string
  compute: string
  provider: string
}

function value(partition: PowerPartitionResource, key: string): string {
  const field = partition.partitionData[key]
  return field === null || field === undefined ? '' : String(field).trim()
}

function formatMemoryMegabytes(raw: string): string {
  const memoryMegabytes = Number(raw)
  if (!Number.isFinite(memoryMegabytes) || memoryMegabytes <= 0) return raw
  if (memoryMegabytes < 1024) return `${raw} MB`
  const memoryGigabytes = memoryMegabytes / 1024
  return `${memoryGigabytes.toLocaleString(undefined, { maximumFractionDigits: 1 })} GB`
}

export function createPowerColumns(labels: PowerColumnLabels): ColumnDef<PowerPartitionResource>[] {
  return [
    {
      id: 'partition',
      header: labels.partition,
      cell: (partition) => {
        const partitionId = value(partition, 'PartitionID')
        const context = [partition.partitionKind, partitionId ? `ID ${partitionId}` : ''].filter(Boolean).join(' · ')
        return (
          <>
            <span className="block max-w-60 truncate font-semibold text-text-primary" title={partition.partitionName}>{partition.partitionName || '-'}</span>
            <span className="text-[11px] text-text-subtle">{context}</span>
          </>
        )
      },
    },
    {
      id: 'status',
      header: labels.status,
      cell: (partition) => (
        <StateCell
          tone={['running', 'active'].includes(partition.partitionState.toLowerCase()) ? 'on' : 'off'}
          label={partition.partitionState || '-'}
        />
      ),
    },
    {
      id: 'os',
      header: labels.os,
      cell: (partition) => value(partition, 'OperatingSystemVersion') || partition.operatingSystemType || '-',
    },
    { id: 'system', header: labels.system, cell: (partition) => partition.systemName || '-' },
    {
      id: 'managementIp',
      header: labels.managementIp,
      cell: (partition) => value(partition, 'ResourceMonitoringIPAddress') || value(partition, 'IPAddress') || '-',
    },
    {
      id: 'compute',
      header: labels.compute,
      cell: (partition) => {
        const processors = value(partition, 'CurrentProcessors')
        const memory = value(partition, 'CurrentMemory')
        const parts = [
          processors ? `${processors} CPU` : '',
          memory ? formatMemoryMegabytes(memory) : '',
        ].filter(Boolean)
        return parts.join(' · ') || '-'
      },
    },
    { id: 'provider', header: labels.provider, cell: (partition) => partition.providerId || '-' },
  ]
}
