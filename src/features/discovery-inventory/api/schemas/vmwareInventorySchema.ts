import { z } from 'zod'

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
  vm_path: z.string().catch('-'),
  provider_id: z.string().catch('-'),
  provider_type: z.string().catch('-'),
  vdisks: z.array(virtualDiskSchema).catch([]),
  snapshot_count: z.number().catch(0),
  vmware_tools_status: z.string().catch('-'),
  tags: z.array(z.string()).catch([]),
})

export const vmwareInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  vms: z.array(virtualMachineSchema),
})

export type VmwareInventoryPayload = z.infer<typeof vmwareInventoryResponseSchema>
export type VmwareVirtualMachinePayload = z.infer<typeof virtualMachineSchema>
export type VmwareVirtualDiskPayload = z.infer<typeof virtualDiskSchema>
