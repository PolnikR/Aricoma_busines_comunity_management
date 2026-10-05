import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PowerPartitionResource } from '../model/discoveryTypes'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'
import { buildWorkloadRelationships } from './workloadRelationships'

export interface LparWorkload {
  name: string
  state: string
}

// IBM Power provider → LPAR → backing volumes resolved through NPIV WWPNs and the
// matching FlashSystem host (one LPAR may use several FlashSystems) → FlashCopy.
// The host and WWPNs are not reported by the lookup, so they are not drawn.
export function buildLparRelationships(
  partition: PowerPartitionResource,
  volumes: readonly StorageVolume[],
  providers: readonly ProviderRecord[],
) {
  return buildWorkloadRelationships<LparWorkload>(
    partition.providerId,
    { entityId: `lpar:${partition.id}`, name: partition.partitionName, state: partition.partitionState },
    volumes,
    providers,
  )
}
