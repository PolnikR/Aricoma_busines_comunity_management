import { apiFetch } from '@/shared/api/apiClient'
import type { VmStorageVolumes } from '../model/vdisksTypes'
import { vdisksResponseSchema } from './schemas/vdisksSchema'
import { mapVdisks } from '../helpers/mapVdisks'

const VDISKS_BY_VM_URL = '/api/vdisks_by_vm'

// GET /api/vdisks_by_vm?vm_name=<name>[&provider_id=<id>]
// Returns the IBM storage volumes backing a VM. vm_name is required; provider_id
// is optional.
export async function fetchVdisksByVm(vmName: string, providerId?: string): Promise<VmStorageVolumes> {
  const params = new URLSearchParams({ vm_name: vmName })
  if (providerId) params.set('provider_id', providerId)

  const response = await apiFetch(`${VDISKS_BY_VM_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Vdisks request failed with status ${String(response.status)}`)
  }

  const payload: unknown = await response.json()
  const parsed = vdisksResponseSchema.parse(payload)
  return mapVdisks(parsed)
}
