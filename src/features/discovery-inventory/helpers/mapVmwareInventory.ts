import type {
  DiscoveredVirtualDisk,
  DiscoveredVirtualMachine,
  DiscoveryInventory,
} from '../model/discoveryTypes'
import type {
  VmwareInventoryPayload,
  VmwareVirtualDiskPayload,
  VmwareVirtualMachinePayload,
} from '../api/schemas/vmwareInventorySchema'

function mapVirtualDisk(
  disk: VmwareVirtualDiskPayload,
  virtualMachineId: string,
  index: number,
): DiscoveredVirtualDisk {
  return {
    id: disk.uuid || `${virtualMachineId}:disk:${String(index)}`,
    label: disk.label,
    capacityGb: disk.capacity_gb,
    datastore: disk.datastore,
    filePath: disk.file,
    thinProvisioned: disk.thin_provisioned,
  }
}

function mapVirtualMachine(
  virtualMachine: VmwareVirtualMachinePayload,
): DiscoveredVirtualMachine {
  return {
    id: virtualMachine.moId,
    name: virtualMachine.name,
    powerState: virtualMachine.power_state,
    connectionState: virtualMachine.connection_state,
    guestOs: virtualMachine.guest_os,
    hostname: virtualMachine.guest_hostname,
    ipAddress: virtualMachine.ip_address,
    vcpu: virtualMachine.vcpu,
    memoryGb: virtualMachine.memory_gb,
    host: virtualMachine.host,
    cluster: virtualMachine.cluster,
    primaryDatastore: virtualMachine.datastore,
    folder: virtualMachine.folder,
    vmPath: virtualMachine.vm_path,
    providerId: virtualMachine.provider_id,
    providerType: virtualMachine.provider_type,
    disks: virtualMachine.vdisks.map((disk, index) => (
      mapVirtualDisk(disk, virtualMachine.moId, index)
    )),
    snapshotCount: virtualMachine.snapshot_count,
    toolsStatus: virtualMachine.vmware_tools_status,
    tags: virtualMachine.tags,
  }
}

export function mapVmwareInventory(payload: VmwareInventoryPayload): DiscoveryInventory {
  return {
    reportedCount: payload.count,
    virtualMachines: payload.vms.map(mapVirtualMachine),
  }
}
