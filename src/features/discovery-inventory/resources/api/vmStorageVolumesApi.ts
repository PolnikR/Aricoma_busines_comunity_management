import { vdisksByVmVdisksByVmGet } from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { VmStorageVolumes } from '../model/vmStorageVolumesTypes'
import { vdisksResponseSchema } from './schemas/vmStorageVolumesSchema'
import { mapVdisks } from '../helpers/mapVmStorageVolumes'

// Returns the IBM storage volumes backing a VM. Explicit provider identifiers
// prevent the backend defaults from selecting the wrong infrastructure source.
export async function fetchVdisksByVm(
  vmName: string,
  providerId?: string,
  ibmProviderId?: string,
): Promise<VmStorageVolumes> {
  try {
    const payload = await vdisksByVmVdisksByVmGet({
      vm_name: vmName,
      ...(providerId ? { provider_id: providerId } : {}),
      ...(ibmProviderId ? { ibm_provider_id: ibmProviderId } : {}),
    })
    return mapVdisks(vdisksResponseSchema.parse(payload))
  } catch (error) {
    if (error instanceof OrvalApiError) {
      throw new Error(`Vdisks request failed with status ${String(error.status)}`, { cause: error })
    }
    throw error
  }
}
