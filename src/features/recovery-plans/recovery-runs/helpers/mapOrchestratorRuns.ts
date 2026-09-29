import type { OrchestratorRunsResponseOutput } from '@/generated/query/zod'
import type { OrchestratorRun, OrchestratorRunsPage } from '../model/recoveryRunTypes'

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

// Maps one raw Airflow dag_runs entry. Field names are confirmed against a
// real captured response, not the OpenAPI doc comment alone:
// dag_run_id, state, start_date, end_date, duration, logical_date.
function mapRun(raw: unknown): OrchestratorRun | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>
  const runId = toStringOrNull(record['dag_run_id'])
  if (!runId) return null

  return {
    runId,
    status: toStringOrNull(record['state']) ?? 'unknown',
    // start_date is the actual execution start; logical_date is only the
    // scheduled time, used as a fallback while a run is still queued.
    startedAt: toStringOrNull(record['start_date']) ?? toStringOrNull(record['logical_date']),
    endedAt: toStringOrNull(record['end_date']),
    // Airflow already computes duration (seconds) — not derived here.
    durationSeconds: toNumberOrNull(record['duration']),
  }
}

// The spec lists only provider_id/dag_id; the Airflow fields (dag_runs,
// total_entries) arrive as unlisted keys kept by validatingMutator.
type OrchestratorRunsWire = OrchestratorRunsResponseOutput & Record<string, unknown>

export function mapOrchestratorRuns(response: OrchestratorRunsWire): OrchestratorRunsPage {
  const rawRuns = response['dag_runs']
  const runs = Array.isArray(rawRuns)
    ? rawRuns.map(mapRun).filter((run): run is OrchestratorRun => run !== null)
    : []
  const total = toNumberOrNull(response['total_entries']) ?? runs.length

  return { runs, total }
}
