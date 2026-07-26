import type { DiscoveredVirtualMachine, DiscoveryInventory } from '../../model/discoveryTypes'
import type { VirtualMachine, VirtualMachinesPageData } from '../types'

function mapVirtualMachine(vm: DiscoveredVirtualMachine): VirtualMachine {
  const diskCapacityGb = vm.disks.reduce((total, disk) => total + disk.capacityGb, 0)

  return {
    id: vm.id,
    name: vm.name,
    powerState: vm.powerState,
    connectionState: vm.connectionState,
    guestOs: vm.guestOs,
    hostname: vm.hostname,
    ipAddress: vm.ipAddress,
    vcpu: vm.vcpu,
    memoryGb: vm.memoryGb,
    host: vm.host,
    cluster: vm.cluster,
    datastore: vm.primaryDatastore,
    folder: vm.folder,
    vmPath: vm.vmPath,
    providerId: vm.providerId,
    providerType: vm.providerType,
    diskCount: vm.disks.length,
    diskCapacityGb,
    vdisks: vm.disks,
    snapshotCount: vm.snapshotCount,
    toolsStatus: vm.toolsStatus,
    tags: vm.tags,
  }
}

function getSortedValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second))
}

export interface AllVirtualMachinesData {
  virtualMachines: VirtualMachine[]
  metrics: VirtualMachinesPageData['metrics']
  filterOptions: VirtualMachinesPageData['filterOptions']
}

export function mapInventoryToVirtualMachines(inventory: DiscoveryInventory): AllVirtualMachinesData {
  const virtualMachines = inventory.virtualMachines.map(mapVirtualMachine)

  return {
    virtualMachines,
    metrics: {
      total: virtualMachines.length,
      poweredOn: virtualMachines.filter((vm) => vm.powerState === 'poweredOn').length,
      clusters: new Set(virtualMachines.map((vm) => vm.cluster).filter(Boolean)).size,
      totalCpu: virtualMachines.reduce((total, vm) => total + vm.vcpu, 0),
      totalMemoryGb: virtualMachines.reduce((total, vm) => total + vm.memoryGb, 0),
    },
    filterOptions: {
      clusters: getSortedValues(virtualMachines.map((vm) => vm.cluster)),
      powerStates: getSortedValues(virtualMachines.map((vm) => vm.powerState)),
      connectionStates: getSortedValues(virtualMachines.map((vm) => vm.connectionState)),
    },
  }
}
