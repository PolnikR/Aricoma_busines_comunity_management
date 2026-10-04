import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'
import type { VirtualMachine } from '../types/virtualMachineTypes'
import { buildWorkloadRelationships } from './workloadRelationships'

export interface VmWorkload {
  name: string
  powerState: string
  diskCount: number
}

// vCenter provider → VM → backing volumes resolved through VMware NAA → FlashCopy.
// The volumes keep their NAA; no edge ties a virtual disk to a volume, because the
// lookup does not report that mapping.
export function buildVmRelationships(
  virtualMachine: VirtualMachine,
  volumes: readonly StorageVolume[],
  providers: readonly ProviderRecord[],
) {
  return buildWorkloadRelationships<VmWorkload>(
    virtualMachine.providerId,
    {
      entityId: `vm:${virtualMachine.id}`,
      name: virtualMachine.name,
      powerState: virtualMachine.powerState,
      diskCount: virtualMachine.vdisks.length,
    },
    volumes,
    providers,
  )
}
