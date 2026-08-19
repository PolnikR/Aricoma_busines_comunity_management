import { useMemo } from 'react'
import { useOrchestratedApps } from './useOrchestratedApps'
import { useOrchestratedGroups } from './useOrchestratedGroups'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'

interface UseOrchestratedEntitiesResult {
  entities: OrchestratedEntity[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
}

// Merges orchestrated Applications and Recovery Groups into one normalized
// list. Both resolve their own providerId per-record (useOrchestratedApps,
// useOrchestratedGroups), so this is a flat concatenation.
export function useOrchestratedEntities(): UseOrchestratedEntitiesResult {
  const appsResult = useOrchestratedApps()
  const groupsResult = useOrchestratedGroups()

  const entities = useMemo<OrchestratedEntity[]>(
    () => [...appsResult.entities, ...groupsResult.entities],
    [appsResult.entities, groupsResult.entities],
  )

  return {
    entities,
    isLoading: appsResult.isLoading || groupsResult.isLoading,
    isFetching: appsResult.isFetching || groupsResult.isFetching,
    error: appsResult.error ?? groupsResult.error,
    refetch: () => {
      appsResult.refetch()
      groupsResult.refetch()
    },
  }
}
