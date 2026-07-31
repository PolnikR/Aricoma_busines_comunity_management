import type { PowerInventory } from '../model/discoveryTypes'
import type { PowerInventoryPayload } from '../api/schemas/powerInventorySchema'

function asDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function stableFingerprint(record: Record<string, unknown>): string {
  const serialized = Object.entries(record)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join('|')

  let hash = 2166136261
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fallback-${(hash >>> 0).toString(36)}`
}

export function mapPowerInventory(payload: PowerInventoryPayload, providerId = ''): PowerInventory {
  const inventoryProviderId = asDisplayValue(payload.provider_id) || providerId
  const identityOccurrences = new Map<string, number>()
  const partitions = payload.vms.flatMap((virtualMachine, index) => {
    const hasLpar = Object.keys(virtualMachine.lpar).length > 0
    const hasVios = Object.keys(virtualMachine.vios).length > 0
    if (!hasLpar && !hasVios) return []

    const partitionKind = hasLpar ? 'LPAR' as const : 'VIOS' as const
    const partitionData = hasLpar ? virtualMachine.lpar : virtualMachine.vios
    const resourceProviderId = asDisplayValue(virtualMachine.provider_id)
      || asDisplayValue(partitionData['provider_id'])
      || inventoryProviderId
    const identity = [
      partitionData.PartitionUUID,
      partitionData['LogicalSerialNumber'],
      partitionData['PartitionID'],
      partitionData.PartitionName,
    ].map(asDisplayValue).find(Boolean) ?? stableFingerprint(partitionData)
    const identityKey = `${resourceProviderId}:${partitionKind}:${identity}`
    const occurrence = (identityOccurrences.get(identityKey) ?? 0) + 1
    identityOccurrences.set(identityKey, occurrence)
    const uniqueIdentity = occurrence === 1
      ? identityKey
      : `${identityKey}:${String(occurrence)}-${String(index)}`

    return [{
      id: uniqueIdentity,
      providerId: resourceProviderId,
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
