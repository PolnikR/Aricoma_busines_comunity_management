// A recovery application that has an actual Airflow DAG to query — proven by
// having an airflow_run_id, not just the push_to_orchestrator intent flag.
export interface OrchestratedApp {
  id: string
  name: string
  dagId: string
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
