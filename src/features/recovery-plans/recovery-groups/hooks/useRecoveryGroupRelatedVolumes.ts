import { useQueries } from '@tanstack/react-query'
import { selectVdisks, vdisksByVmQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'

interface RecoveryGroupRelatedVolumes {
  flashcopyProviderId: string | null
  discoveredVolumeNames: string[]
  isLoading: boolean
  isResolved: boolean
  error?: Error | null
  refetch?: () => void
}

// Source remains the wizard's storage context. The discovery endpoint now accepts
// only the VM and compute provider; storage resolution belongs to the backend.
export function useRecoveryGroupRelatedVolumes(
  vmProviderId: string | null,
  vmNames: string[],
  flashcopyProviderId: string | null,
  enabled: boolean,
): RecoveryGroupRelatedVolumes {
  const queryEnabled = enabled && Boolean(vmProviderId) && Boolean(flashcopyProviderId)

  const results = useQueries({
    queries: vmNames.map(vmName => ({
      ...vdisksByVmQuery(vmName, vmProviderId ?? undefined),
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
    isResolved: results.every(result => result.isFetched || result.isError),
    error: results.find(result => result.error)?.error ?? null,
    refetch: () => { results.forEach(result => { void result.refetch() }) },
  }
}
