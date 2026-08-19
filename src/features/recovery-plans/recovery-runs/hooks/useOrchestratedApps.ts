import { useMemo } from 'react'
import { useRecoveryApplications } from '@/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'

interface UseOrchestratedAppsResult {
  entities: OrchestratedEntity[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => void
}

// Only recovery applications with a real airflow_run_id have a queryable
// Airflow DAG — push_to_orchestrator is just an intent flag and doesn't
// guarantee a run id was ever received (the submission could have failed
// partway). The DAG id itself is `dag_${airflow_run_id}`, not the app's own
// id (confirmed against the OpenAPI spec's description text for the
// rollback endpoints, which reference the same "dag_<run_id>" convention).
// Applications now carry their own orchestrationProviderId per record, same
// as Recovery Groups (see useOrchestratedGroups), so an app is only queryable
// once it has both a real airflowRunId and a resolved orchestrationProviderId.
export function useOrchestratedApps(): UseOrchestratedAppsResult {
  const applicationsQuery = useRecoveryApplications()

  const entities = useMemo(() => {
    const records = applicationsQuery.data ?? []
    const orchestrated: OrchestratedEntity[] = []
    for (const record of records) {
      const runId = record.airflowRunId
      const providerId = record.orchestrationProviderId
      if (!runId || !providerId) continue
      orchestrated.push({
        entityType: 'application',
        id: record.id,
        name: record.data.application.name,
        dagId: `dag_${runId}`,
        providerId,
      })
    }
    return orchestrated
  }, [applicationsQuery.data])

  return {
    entities,
    isLoading: applicationsQuery.isLoading,
    isFetching: applicationsQuery.isFetching,
    error: applicationsQuery.error instanceof Error ? applicationsQuery.error : null,
    refetch: () => { void applicationsQuery.refetch() },
  }
}
