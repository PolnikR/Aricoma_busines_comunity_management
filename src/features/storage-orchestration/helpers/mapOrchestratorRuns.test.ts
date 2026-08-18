import { describe, expect, it } from 'vitest'
import { mapOrchestratorRuns } from './mapOrchestratorRuns'

describe('mapOrchestratorRuns', () => {
  it('maps a real captured Airflow response', () => {
    const result = mapOrchestratorRuns({
      provider_id: 'airflow-01',
      dag_id: 'dag_260818094526_2918dccb',
      dag_runs: [
        {
          dag_run_id: 'scheduled__2026-08-18T00:00:00+00:00',
          dag_id: 'dag_260818094526_2918dccb',
          logical_date: '2026-08-18T00:00:00Z',
          queued_at: '2026-08-18T09:46:40.595164Z',
          start_date: '2026-08-18T09:46:40.607667Z',
          end_date: '2026-08-18T09:46:50.636064Z',
          duration: 10.028397,
          state: 'failed',
        },
      ],
      total_entries: 1,
      next_cursor: null,
      previous_cursor: null,
    })

    expect(result).toEqual({
      runs: [{
        runId: 'scheduled__2026-08-18T00:00:00+00:00',
        status: 'failed',
        startedAt: '2026-08-18T09:46:40.607667Z',
        endedAt: '2026-08-18T09:46:50.636064Z',
        durationSeconds: 10.028397,
      }],
      total: 1,
    })
  })

  it('falls back to logical_date and leaves duration/end_date null for a queued run', () => {
    const result = mapOrchestratorRuns({
      provider_id: 'airflow-01',
      dag_id: 'dag_x',
      dag_runs: [
        {
          dag_run_id: 'scheduled__2026-08-19T00:00:00+00:00',
          logical_date: '2026-08-19T00:00:00Z',
          start_date: null,
          end_date: null,
          duration: null,
          state: 'queued',
        },
      ],
      total_entries: 1,
    })

    expect(result.runs[0]).toEqual({
      runId: 'scheduled__2026-08-19T00:00:00+00:00',
      status: 'queued',
      startedAt: '2026-08-19T00:00:00Z',
      endedAt: null,
      durationSeconds: null,
    })
  })

  it('returns an empty page when dag_runs is missing or malformed', () => {
    expect(mapOrchestratorRuns({ provider_id: 'p', dag_id: 'd' })).toEqual({ runs: [], total: 0 })
    expect(mapOrchestratorRuns({ provider_id: 'p', dag_id: 'd', dag_runs: 'not-an-array' })).toEqual({ runs: [], total: 0 })
  })

  it('drops individual run entries with no dag_run_id instead of throwing', () => {
    const result = mapOrchestratorRuns({
      provider_id: 'p',
      dag_id: 'd',
      dag_runs: [{ state: 'success' }, null, 'garbage'],
      total_entries: 3,
    })

    expect(result.runs).toEqual([])
    expect(result.total).toBe(3)
  })
})
