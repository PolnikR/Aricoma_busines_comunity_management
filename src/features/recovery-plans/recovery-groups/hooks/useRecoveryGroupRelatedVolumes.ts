import { useQueries } from '@tanstack/react-query'
import {
  DISCOVERY_INVENTORY_GC_TIME_MS,
  DISCOVERY_INVENTORY_STALE_TIME_MS,
  discoveryInventoryKeys,
} from '@/features/discovery-inventory/resources/api/resourceInventoryQueryKeys'
import { fetchVdisksByVm } from '@/features/discovery-inventory/resources/api/vmStorageVolumesApi'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

export function resolveDefaultFlashcopyProviderId(
  vmProviderId: string | null,
  providers: ProviderRecord[],
): string | null {
  const vmProvider = providers.find(provider => provider.id === vmProviderId)
  const flashcopyProvider = providers.find(provider => (
    provider.id === vmProvider?.defaultFlashcopyProviderId
    && provider.type === 'FLASHCOPY'
    && provider.credentialStatus === 'ok'
  ))
  return flashcopyProvider?.id ?? null
}

interface RecoveryGroupRelatedVolumes {
  flashcopyProviderId: string | null
  discoveredVolumeNames: string[]
  isLoading: boolean
}

export function useRecoveryGroupRelatedVolumes(
  vmProviderId: string | null,
  vmNames: string[],
  providers: ProviderRecord[],
  enabled: boolean,
): RecoveryGroupRelatedVolumes {
  const flashcopyProviderId = resolveDefaultFlashcopyProviderId(vmProviderId, providers)
  const queryEnabled = enabled && Boolean(vmProviderId) && Boolean(flashcopyProviderId)

  const results = useQueries({
    queries: queryEnabled ? vmNames.map(vmName => ({
      queryKey: discoveryInventoryKeys.vdisksByVm(
        vmName,
        vmProviderId ?? undefined,
        flashcopyProviderId ?? undefined,
      ),
      queryFn: () => fetchVdisksByVm(vmName, vmProviderId ?? undefined, flashcopyProviderId ?? undefined),
      enabled: true,
      staleTime: DISCOVERY_INVENTORY_STALE_TIME_MS,
      gcTime: DISCOVERY_INVENTORY_GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    })) : [],
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
