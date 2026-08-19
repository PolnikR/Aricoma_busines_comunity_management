// A recovery application or recovery group that has an actual Airflow DAG to
// query, normalized so callers (table, runs-fetching hook, history drawer)
// don't need to know which domain object it came from. Both Applications and
// Recovery Groups resolve their own orchestration provider per-record (see
// useOrchestratedApps and useOrchestratedGroups).
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
