import { z } from 'zod'
import type {
  DiscoveredVirtualDisk,
  DiscoveredVirtualMachine,
  DiscoveryInventory,
} from '../model/discoveryTypes'

const DISCOVERY_INVENTORY_URL = '/fixtures/apiResponse.json'

const virtualDiskSchema = z.object({
  uuid: z.string().catch(''),
  label: z.string().catch('Unknown disk'),
  capacity_gb: z.number().catch(0),
  datastore: z.string().catch('-'),
  file: z.string().catch('-'),
  thin_provisioned: z.boolean().catch(false),
})

const virtualMachineSchema = z.object({
  moId: z.string().min(1),
  name: z.string().min(1),
  power_state: z.string().catch('unknown'),
  connection_state: z.string().catch('unknown'),
  guest_os: z.string().catch('-'),
  guest_hostname: z.string().catch('-'),
  ip_address: z.string().catch('-'),
  vcpu: z.number().catch(0),
  memory_gb: z.number().catch(0),
  host: z.string().catch('-'),
  cluster: z.string().catch('-'),
  datastore: z.string().catch('-'),
  folder: z.string().catch('-'),
  vdisks: z.array(virtualDiskSchema).catch([]),
  snapshot_count: z.number().catch(0),
  vmware_tools_status: z.string().catch('-'),
  tags: z.array(z.string()).catch([]),
})

const discoveryInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  vms: z.array(virtualMachineSchema),
})

function mapVirtualDisk(
  disk: z.infer<typeof virtualDiskSchema>,
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
  virtualMachine: z.infer<typeof virtualMachineSchema>,
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
    disks: virtualMachine.vdisks.map((disk, index) => (
      mapVirtualDisk(disk, virtualMachine.moId, index)
    )),
    snapshotCount: virtualMachine.snapshot_count,
    toolsStatus: virtualMachine.vmware_tools_status,
    tags: virtualMachine.tags,
  }
}

export async function fetchDiscoveryInventory(): Promise<DiscoveryInventory> {
  const response = await fetch(DISCOVERY_INVENTORY_URL)

  if (!response.ok) {
    throw new Error(`Discovery inventory request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = discoveryInventoryResponseSchema.parse(payload)

  return {
    reportedCount: parsed.count,
    virtualMachines: parsed.vms.map(mapVirtualMachine),
  }
}
