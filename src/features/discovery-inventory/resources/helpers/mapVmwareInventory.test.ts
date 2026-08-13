import { describe, expect, it } from 'vitest'
import {
  VmsResponse as VmsResponseSchema,
  type VmsResponse as VmsResponseInput,
} from '@/generated/api/zod.gen'
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
})
