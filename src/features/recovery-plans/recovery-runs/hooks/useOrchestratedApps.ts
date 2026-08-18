import { useMemo } from 'react'
import { useRecoveryApplications } from '@/features/recovery-plans/recovery-applications/hooks/useRecoveryApplications'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { getEligiblePlatformProviders } from '@/features/recovery-plans/recovery-applications/utils/eligibleProviders'
import type { OrchestratedApp } from '../model/recoveryRunTypes'

interface UseOrchestratedAppsResult {
  apps: OrchestratedApp[]
  providerId: string | null
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
export function useOrchestratedApps(): UseOrchestratedAppsResult {
  const applicationsQuery = useRecoveryApplications()
  const platformProvidersQuery = usePlatformProviders()

  const apps = useMemo(() => {
    const records = applicationsQuery.data ?? []
    const orchestrated: OrchestratedApp[] = []
    for (const record of records) {
      const runId = record.airflowRunId
      if (!runId) continue
      orchestrated.push({
        id: record.id,
        name: record.data.application.name,
        dagId: `dag_${runId}`,
      })
    }
    return orchestrated
  }, [applicationsQuery.data])

  const providerId = useMemo(() => {
    const eligible = getEligiblePlatformProviders(platformProvidersQuery.data ?? [])
    return eligible[0]?.id ?? null
  }, [platformProvidersQuery.data])

  return {
    apps,
    providerId,
    isLoading: applicationsQuery.isLoading || platformProvidersQuery.isLoading,
    isFetching: applicationsQuery.isFetching || platformProvidersQuery.isFetching,
    error: applicationsQuery.error instanceof Error
      ? applicationsQuery.error
      : platformProvidersQuery.error instanceof Error
        ? platformProvidersQuery.error
        : null,
    refetch: () => {
      void applicationsQuery.refetch()
      void platformProvidersQuery.refetch()
    },
  }
}
