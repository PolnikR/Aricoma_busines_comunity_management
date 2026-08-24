import { useMemo } from 'react'
import { useRecoveryGroups } from '@/features/recovery-plans/recovery-groups/hooks/useRecoveryGroups'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'

interface UseOrchestratedGroupsResult {
  entities: OrchestratedEntity[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
}

// Recovery Groups already carry their own orchestrationProviderId per record
// (unlike Applications, which currently share one eligible-provider lookup —
// see useOrchestratedApps), so a group only needs pushToOrchestrator, a real
// airflowRunId, and a resolved orchestrationProviderId to be queryable.
export function useOrchestratedGroups(): UseOrchestratedGroupsResult {
  const { groups, isLoading, isFetching, error, refresh } = useRecoveryGroups()

  const entities = useMemo(() => {
    const orchestrated: OrchestratedEntity[] = []
    for (const group of groups) {
      if (!group.pushToOrchestrator) continue
      const runId = group.airflowRunId
      const providerId = group.orchestrationProviderId
      if (!runId || !providerId) continue
      orchestrated.push({
        entityType: 'group',
        id: group.id,
        name: group.name,
        dagId: `dag_${runId}`,
        providerId,
      })
    }
    return orchestrated
  }, [groups])

  return {
    entities,
    isLoading,
    isFetching,
    error: error instanceof Error ? error : null,
    refetch: () => { void refresh() },
  }
}
