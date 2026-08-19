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
// list. Applications currently resolve providerId via a single shared
// eligible-provider lookup (useOrchestratedApps); Recovery Groups resolve it
// per-record (useOrchestratedGroups) — both are folded into OrchestratedEntity
// here so downstream consumers (tabs, runs-fetching, detail panels) never
// need to know about that asymmetry.
export function useOrchestratedEntities(): UseOrchestratedEntitiesResult {
  const appsResult = useOrchestratedApps()
  const groupsResult = useOrchestratedGroups()

  const { apps, providerId } = appsResult

  const entities = useMemo<OrchestratedEntity[]>(() => {
    if (!providerId) return groupsResult.entities
    const appEntities: OrchestratedEntity[] = apps.map(app => ({
      entityType: 'application' as const,
      id: app.id,
      name: app.name,
      dagId: app.dagId,
      providerId,
    }))
    return [...appEntities, ...groupsResult.entities]
  }, [apps, providerId, groupsResult.entities])

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
