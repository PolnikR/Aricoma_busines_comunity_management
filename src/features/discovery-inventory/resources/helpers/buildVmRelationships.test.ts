import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'
import type { VirtualMachine } from '../types/virtualMachineTypes'
import { buildVmRelationships } from './buildVmRelationships'

const vm = {
  id: 'vmware-vcenter-01:vm-42',
  name: 'TEST-WEB02',
  powerState: 'poweredOn',
  providerId: 'vmware-vcenter-01',
  vdisks: [{ id: 'd1', label: 'Hard disk 1' }, { id: 'd2', label: 'Hard disk 2' }],
} as unknown as VirtualMachine

const providers: ProviderRecord[] = [
  { id: 'vmware-vcenter-01', name: 'Production vCenter', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'ibm-flashsystem-01', name: 'IBM Flash Source 01', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok' },
]

function volume(key: string, storageProviderId: string, snapshots: Partial<StorageVolume['snapshots']> = {}): StorageVolume {
  return {
    key,
    naa: key,
    volumeId: '1',
    id: '1',
    name: key,
    volumeName: key,
    capacity: '1.00TB',
    status: 'online',
    pool: 'Pool0',
    ioGroupName: 'io_grp0',
    storageProviderId,
    type: 'striped',
    protocol: 'scsi',
    vdiskUid: key.toUpperCase(),
    copyCount: '1',
    fcMapCount: '0',
    snapshots: { hasSnapshots: false, snapshotCount: 0, isSnapshot: false, sourceMappings: [], targetMappings: [], ...snapshots },
  }
}

const mapping = { id: '0', name: 'fcmap0', sourceVdiskId: '1', sourceVdiskName: 'src', targetVdiskId: '7', targetVdiskName: 'snap', status: 'copied', progress: '100', copyRate: '50', cleanProgress: '100', startTime: '' }

describe('buildVmRelationships', () => {
  it('links the vCenter provider to the VM and the VM to every backing volume', () => {
    const result = buildVmRelationships(vm, [volume('naa.a', 'ibm-flashsystem-01')], providers)

    expect(result.computeProvider).toMatchObject({ entityId: 'provider:vmware-vcenter-01', provider: providers[0] })
    expect(result.workload).toEqual({ entityId: 'vm:vmware-vcenter-01:vm-42', name: 'TEST-WEB02', powerState: 'poweredOn', diskCount: 2 })
    expect(result.edges).toEqual([
      { from: 'provider:vmware-vcenter-01', to: 'vm:vmware-vcenter-01:vm-42', kind: 'neutral', relation: 'discovers' },
      { from: 'vm:vmware-vcenter-01:vm-42', to: 'volume:naa.a', kind: 'backing', relation: 'backing' },
    ])
  })

  it('groups volumes by storage provider and keeps unknown providers by raw id', () => {
    const result = buildVmRelationships(vm, [
      volume('naa.a', 'ibm-flashsystem-01'),
      volume('naa.b', 'ibm-flashsystem-09'),
      volume('naa.c', 'ibm-flashsystem-01'),
    ], providers)

    expect(result.groups.map(group => [group.storage.providerId, group.storage.provider?.name ?? null, group.rows.map(row => row.volume.naa)])).toEqual([
      ['ibm-flashsystem-01', 'IBM Flash Source 01', ['naa.a', 'naa.c']],
      ['ibm-flashsystem-09', null, ['naa.b']],
    ])
  })

  it('keeps a volume without snapshots and adds a FlashCopy node only for real mappings', () => {
    const result = buildVmRelationships(vm, [
      volume('naa.a', 'ibm-flashsystem-01'),
      volume('naa.b', 'ibm-flashsystem-01', { snapshotCount: 1, sourceMappings: [mapping], targetMappings: [{ ...mapping, sourceVdiskName: 'origin' }] }),
    ], providers)
    const [plain, copied] = result.groups[0]?.rows ?? []

    expect(plain?.flashCopy).toBeNull()
    expect(copied?.flashCopy).toEqual({ entityId: 'flashcopy:naa.b', snapshotCount: 1, targets: ['snap'], sources: ['origin'] })
    expect(result.edges.filter(edge => edge.relation === 'flashCopy')).toEqual([{ from: 'volume:naa.b', to: 'flashcopy:naa.b', kind: 'neutral', relation: 'flashCopy' }])
  })

  it('never invents a virtual disk to volume edge', () => {
    const result = buildVmRelationships(vm, [volume('naa.a', 'ibm-flashsystem-01'), volume('naa.b', 'ibm-flashsystem-01')], providers)

    expect(result.edges.some(edge => /disk|d1|d2/.test(edge.from + edge.to))).toBe(false)
  })

  it('keeps the provider and VM when no volume was resolved', () => {
    const result = buildVmRelationships(vm, [], providers)

    expect(result.groups).toEqual([])
    expect(result.edges).toHaveLength(1)
  })
})
