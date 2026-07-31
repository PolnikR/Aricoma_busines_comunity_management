import { StateCell } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import type { PowerPartitionResource } from '../../model/discoveryTypes'

interface PowerColumnLabels {
  partition: string
  os: string
  device: string
  bootMode: string
  hypervisor: string
  volumeCapacity: string
  volume: string
  volumeState: string
  provider: string
}

export function createPowerColumns(labels: PowerColumnLabels): ColumnDef<PowerPartitionResource>[] {
  return [
    {
      id: 'partition',
      header: labels.partition,
      cell: (partition) => (
        <>
          <span className="block max-w-60 truncate font-semibold text-[#17233d]" title={partition.partitionName}>{partition.partitionName || '-'}</span>
          <span className="text-[11px] text-[#93a0b5]">{partition.partitionKind}</span>
        </>
      ),
    },
    { id: 'os', header: labels.os, cell: (partition) => partition.operatingSystemType || '-' },
    { id: 'device', header: labels.device, cell: (partition) => partition.deviceName || '-' },
    { id: 'bootMode', header: labels.bootMode, cell: (partition) => partition.bootMode || '-' },
    { id: 'hypervisor', header: labels.hypervisor, cell: (partition) => partition.powerOnWithHypervisor || '-' },
    { id: 'volumeCapacity', header: labels.volumeCapacity, cell: (partition) => partition.volumeCapacity || '-', align: 'right' },
    { id: 'volume', header: labels.volume, cell: (partition) => partition.volumeName || '-' },
    {
      id: 'volumeState',
      header: labels.volumeState,
      cell: (partition) => <StateCell tone={partition.volumeState.toLowerCase() === 'active' ? 'on' : 'off'} label={partition.volumeState || '-'} />,
    },
    { id: 'provider', header: labels.provider, cell: (partition) => partition.providerId || '-' },
  ]
}
