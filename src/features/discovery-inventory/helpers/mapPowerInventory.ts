import type { PowerInventory } from '../model/discoveryTypes'
import type { PowerInventoryPayload } from '../api/schemas/powerInventorySchema'

function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

export function mapPowerInventory(payload: PowerInventoryPayload, providerId = ''): PowerInventory {
  const partitions = payload.vms.flatMap((virtualMachine, index) => {
    const hasLpar = Object.keys(virtualMachine.lpar).length > 0
    const hasVios = Object.keys(virtualMachine.vios).length > 0
    if (!hasLpar && !hasVios) return []

    const partitionKind = hasLpar ? 'LPAR' as const : 'VIOS' as const
    const partitionData = hasLpar ? virtualMachine.lpar : virtualMachine.vios
    const identity = asDisplayValue(
      partitionData.PartitionUUID
      ?? partitionData['LogicalSerialNumber']
      ?? partitionData['PartitionID']
      ?? partitionData.PartitionName
      ?? index,
    )

    return [{
      id: `${providerId}:${partitionKind}:${identity}`,
      providerId,
      providerType: 'IBM_POWER' as const,
      partitionKind,
      partitionData,
      lpar: virtualMachine.lpar,
      vios: virtualMachine.vios,
      partitionName: asDisplayValue(partitionData.PartitionName),
      partitionState: asDisplayValue(partitionData.PartitionState),
      systemName: asDisplayValue(partitionData.SystemName),
      operatingSystemType: asDisplayValue(partitionData['OperatingSystemType']),
      deviceName: asDisplayValue(partitionData['DeviceName']),
      bootMode: asDisplayValue(partitionData['BootMode']),
      powerOnWithHypervisor: asDisplayValue(partitionData['PowerOnWithHypervisor']),
      volumeCapacity: asDisplayValue(partitionData['VolumeCapacity']),
      volumeName: asDisplayValue(partitionData['VolumeName']),
      volumeState: asDisplayValue(partitionData['VolumeState']),
    }]
  })

  return {
    reportedCount: payload.count,
    countsByType: payload.counts_by_type,
    virtualMachines: payload.vms,
    partitions,
  }
}
