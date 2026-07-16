import { z } from 'zod'
import type { VirtualMachine } from '../types'

const vmDiskSchema = z.object({
  capacity_gb: z.number().catch(0),
})

const vmSchema = z.object({
  name: z.string().catch('Unknown VM'),
  moId: z.string().catch('unknown'),
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
  vdisks: z.array(vmDiskSchema).catch([]),
  snapshot_count: z.number().catch(0),
  vmware_tools_status: z.string().catch('-'),
})

const responseSchema = z.object({
  count: z.number(),
  vms: z.array(vmSchema),
})

function mapVirtualMachine(vm: z.infer<typeof vmSchema>): VirtualMachine {
  const diskCapacityGb = vm.vdisks.reduce((total, disk) => total + disk.capacity_gb, 0)

  return {
    id: vm.moId,
    name: vm.name,
    powerState: vm.power_state,
    connectionState: vm.connection_state,
    guestOs: vm.guest_os,
    hostname: vm.guest_hostname,
    ipAddress: vm.ip_address,
    vcpu: vm.vcpu,
    memoryGb: vm.memory_gb,
    host: vm.host,
    cluster: vm.cluster,
    datastore: vm.datastore,
    folder: vm.folder,
    diskCount: vm.vdisks.length,
    diskCapacityGb,
    snapshotCount: vm.snapshot_count,
    toolsStatus: vm.vmware_tools_status,
  }
}

export async function fetchVirtualMachines(): Promise<VirtualMachine[]> {
  const response = await fetch('/fixtures/apiResponse.json')

  if (!response.ok) {
    throw new Error(`Discovery fixture request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = responseSchema.parse(payload)

  return parsed.vms.map(mapVirtualMachine)
}