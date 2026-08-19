// A recovery application that has an actual Airflow DAG to query — proven by
// having an airflow_run_id, not just the push_to_orchestrator intent flag.
export interface OrchestratedApp {
  id: string
  name: string
  dagId: string
}

// A recovery application or recovery group that has an actual Airflow DAG to
// query, normalized so callers (table, runs-fetching hook, history drawer)
// don't need to know which domain object it came from. Unlike OrchestratedApp,
// providerId travels with the entity since Recovery Groups resolve their own
// orchestration provider per-record, while Applications currently share one
// eligible-provider lookup (see useOrchestratedApps).
export interface OrchestratedEntity {
  entityType: 'application' | 'group'
  id: string
  name: string
  dagId: string
  providerId: string
}

export interface OrchestratorRun {
  runId: string
  status: string
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
}

export interface OrchestratorRunsPage {
  runs: OrchestratorRun[]
  total: number
}
