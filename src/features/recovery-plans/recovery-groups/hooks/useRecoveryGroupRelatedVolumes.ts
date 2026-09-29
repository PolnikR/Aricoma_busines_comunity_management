import { useQueries } from '@tanstack/react-query'
import { discoveryInventoryKeys } from '@/features/discovery-inventory/resources/api/resourceInventoryQueryKeys'
import { fetchVdisksByVm } from '@/features/discovery-inventory/resources/api/vmStorageVolumesApi'

interface RecoveryGroupRelatedVolumes {
  flashcopyProviderId: string | null
  discoveredVolumeNames: string[]
  isLoading: boolean
}

// The FlashSystem is chosen explicitly by the user: the providers contract no
// longer links a vCenter to a default FlashSystem, and with several FlashSystems
// the one holding the VMs' disks cannot be derived.
export function useRecoveryGroupRelatedVolumes(
  vmProviderId: string | null,
  vmNames: string[],
  flashcopyProviderId: string | null,
  enabled: boolean,
): RecoveryGroupRelatedVolumes {
  const queryEnabled = enabled && Boolean(vmProviderId) && Boolean(flashcopyProviderId)

  const results = useQueries({
    queries: vmNames.map(vmName => ({
      queryKey: discoveryInventoryKeys.vdisksByVm(
        vmName,
        vmProviderId ?? undefined,
        flashcopyProviderId ?? undefined,
      ),
      queryFn: () => fetchVdisksByVm(vmName, vmProviderId ?? undefined, flashcopyProviderId ?? undefined),
      enabled: queryEnabled,
    })),
  })

  const discoveredVolumeNames = Array.from(new Set(
    results.flatMap(result => (
      result.data?.volumes.map(volume => volume.name.trim()).filter(Boolean) ?? []
    )),
  ))

  return {
    flashcopyProviderId,
    discoveredVolumeNames,
    isLoading: queryEnabled && results.some(result => result.isLoading),
  }
}
