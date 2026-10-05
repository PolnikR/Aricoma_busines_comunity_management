import { describe, expect, it } from 'vitest'
import {
  VmsResponse as VmsResponseSchema,
  type VmsResponse as VmsResponseInput,
} from '@/generated/query/zod'
import { mapVmwareInventory } from './mapVmwareInventory'

function createVm(providerId: string): VmsResponseInput['vms'][number] {
  return {
    moId: 'vm-101',
    name: 'application-01',
    power_state: 'poweredOn',
    connection_state: 'connected',
    guest_os: 'Linux',
    guest_hostname: 'application-01',
    ip_address: '10.0.0.10',
    vcpu: 4,
    memory_gb: 8,
    host: 'esx-01',
    cluster: 'cluster-01',
    datastore: 'datastore-01',
    folder: 'Applications',
    vm_path: '[datastore-01] application-01/application-01.vmx',
    provider_id: providerId,
    provider_type: 'VMWARE',
    vdisks: [{
      uuid: '',
      label: 'Hard disk 1',
      capacity_gb: 100,
      datastore: 'datastore-01',
      file: '[datastore-01] application-01/disk.vmdk',
      thin_provisioned: true,
    }],
    snapshot_count: 0,
    vmware_tools_status: 'toolsOk',
    tags: [],
  }
}

describe('mapVmwareInventory', () => {
  it('creates provider-scoped VM and fallback disk identifiers', () => {
    const inventory = mapVmwareInventory(VmsResponseSchema.parse({
      count: 2,
      vms: [createVm('vcenter-01'), createVm('vcenter-02')],
    }))

    expect(inventory.virtualMachines.map((vm) => vm.id)).toEqual([
      'vcenter-01:vm-101',
      'vcenter-02:vm-101',
    ])
    expect(inventory.virtualMachines.map((vm) => vm.disks[0]?.id)).toEqual([
      'vcenter-01:vm-101:disk:0',
      'vcenter-02:vm-101:disk:0',
    ])
  })

  it.each([
    ['one NAA', ['naa.60050763808104d94000000000000015']],
    ['several NAA in API order', ['naa.B', 'naa.A']],
    ['no NAA', []],
  ])('keeps the disk NAA list as returned by the API (%s)', (_case, naa) => {
    const vm = createVm('vcenter-01')
    const [disk] = vm.vdisks ?? []
    if (!disk) throw new Error('fixture has no disk')
    const inventory = mapVmwareInventory(VmsResponseSchema.parse({ count: 1, vms: [{ ...vm, vdisks: [{ ...disk, naa }] }] }))

    expect(inventory.virtualMachines[0]?.disks[0]?.naa).toEqual(naa)
  })

  it('maps a disk without an NAA field to an empty list through the API default', () => {
    const inventory = mapVmwareInventory(VmsResponseSchema.parse({ count: 1, vms: [createVm('vcenter-01')] }))

    expect(inventory.virtualMachines[0]?.disks[0]?.naa).toEqual([])
  })
})
