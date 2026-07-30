import { z } from 'zod'
import { apiFetch } from '@/shared/api/apiClient'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  DiscoveredVirtualDisk,
  DiscoveredVirtualMachine,
  DiscoveryInventory,
  FlashSystemInventory,
  PowerInventory,
} from '../model/discoveryTypes'

const DISCOVERY_INVENTORY_URL = '/api/vms'
const DISCOVERY_INVENTORY_BY_TAG_URL = '/api/vms_by_tag'
const POWER_INVENTORY_URL = '/api/get_power_vm'
const FLASHSYSTEM_INVENTORY_URL = '/api/get_volumes'

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

const discoveryInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  vms: z.array(virtualMachineSchema),
})

const powerPartitionSchema = z.object({
  PartitionUUID: z.string().optional(),
  PartitionName: z.string().optional(),
  PartitionType: z.string().optional(),
  PartitionState: z.string().optional(),
  SystemName: z.string().optional(),
}).loose()

const powerInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  counts_by_type: z.object({
    LogicalPartition: z.number().int().nonnegative(),
    VirtualIOServer: z.number().int().nonnegative(),
  }),
  vms: z.array(z.object({
    lpar: powerPartitionSchema,
    vios: powerPartitionSchema,
  })),
})

const flashSystemRelatedResourceSchema = z.object({
  name: z.string().catch('-'),
}).loose()

const flashSystemVolumeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  status: z.string().catch('unknown'),
  capacity: z.string().catch('-'),
  type: z.string().catch('-'),
  vdisk_UID: z.string().catch(''),
  mdisk_grp_id: z.string().catch(''),
  mdisk_grp_name: z.string().catch('-'),
  host_maps: z.array(z.object({
    host_id: z.string(),
    scsi_id: z.string(),
  })).catch([]),
}).loose()

const flashSystemInventoryResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  volumes: z.array(flashSystemVolumeSchema),
  pools: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
  hosts: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
  clusters: z.record(z.string(), flashSystemRelatedResourceSchema).catch({}),
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

export async function fetchVmwareInventory(providerId?: string, tag?: string): Promise<DiscoveryInventory> {
  // A tag selects the by-tag endpoint; provider is an optional extra param on
  // either endpoint.
  const params = new URLSearchParams()
  if (tag) params.set('tag', tag)
  if (providerId) params.set('provider_id', providerId)
  const base = tag ? DISCOVERY_INVENTORY_BY_TAG_URL : DISCOVERY_INVENTORY_URL
  const search = params.toString()
  const url = search ? `${base}?${search}` : base

  const response = await apiFetch(url)

  // A 400/500 while a provider or tag filter is active means the backend can't
  // serve that combination (e.g. a non-VMWARE provider) — surface it as an
  // empty inventory, not an error.
  if ((response.status === 400 || response.status === 500) && (providerId || tag)) {
    return { reportedCount: 0, virtualMachines: [] }
  }

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

async function fetchProviderPayload(url: string, providerId: string, label: string): Promise<unknown> {
  const params = new URLSearchParams({ provider_id: providerId })
  const response = await apiFetch(`${url}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`${label} inventory request failed with status ${String(response.status)}`)
  }

  return response.json()
}

export async function fetchPowerInventory(providerId: string): Promise<PowerInventory> {
  const payload = await fetchProviderPayload(POWER_INVENTORY_URL, providerId, 'IBM Power')
  const parsed = powerInventoryResponseSchema.parse(payload)

  return {
    reportedCount: parsed.count,
    countsByType: parsed.counts_by_type,
    virtualMachines: parsed.vms,
  }
}

export async function fetchFlashSystemInventory(providerId: string): Promise<FlashSystemInventory> {
  const payload = await fetchProviderPayload(FLASHSYSTEM_INVENTORY_URL, providerId, 'IBM FlashSystem')
  const parsed = flashSystemInventoryResponseSchema.parse(payload)

  return {
    reportedCount: parsed.count,
    volumes: parsed.volumes,
    pools: parsed.pools,
    hosts: parsed.hosts,
    clusters: parsed.clusters,
  }
}

export type ProviderInventory =
  | { source: 'vmware'; provider: ProviderRecord; inventory: DiscoveryInventory }
  | { source: 'power'; provider: ProviderRecord; inventory: PowerInventory }
  | { source: 'flashsystem'; provider: ProviderRecord; inventory: FlashSystemInventory }

export async function fetchInventory(provider: ProviderRecord, tag?: string): Promise<ProviderInventory> {
  switch (provider.type) {
    case 'VMWARE':
      return {
        source: 'vmware',
        provider,
        inventory: await fetchVmwareInventory(provider.id, tag),
      }
    case 'IBM_POWER':
      return {
        source: 'power',
        provider,
        inventory: await fetchPowerInventory(provider.id),
      }
    case 'FLASHCOPY':
      return {
        source: 'flashsystem',
        provider,
        inventory: await fetchFlashSystemInventory(provider.id),
      }
  }
}
