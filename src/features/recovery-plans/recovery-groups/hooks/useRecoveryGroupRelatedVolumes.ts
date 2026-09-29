import { useQueries } from '@tanstack/react-query'
import { selectVdisks, vdisksByVmQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'

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
      ...vdisksByVmQuery(vmName, vmProviderId ?? undefined, flashcopyProviderId ?? undefined),
      select: selectVdisks,
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
