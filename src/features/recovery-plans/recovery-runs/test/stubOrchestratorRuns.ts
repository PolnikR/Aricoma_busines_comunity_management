import { vi } from 'vitest'

interface WireRun {
  id: string
  state: string
}

// Airflow's GET /dagRuns body as the backend forwards it.
export function runsBody(runs: WireRun[], total = runs.length) {
  return {
    provider_id: 'airflow-01',
    dag_id: 'dag_x',
    dag_runs: runs.map(run => ({ dag_run_id: run.id, state: run.state, duration: null })),
    total_entries: total,
  }
}

// Answers each fetch with the next queued reply; the last one repeats.
export function stubOrchestratorRuns(...replies: { status?: number, body: unknown }[]) {
  let call = 0
  const mock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(() => {
    const reply = replies[Math.min(call++, replies.length - 1)] ?? { body: runsBody([]) }
    return Promise.resolve(new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

export function requestedRuns(mock: ReturnType<typeof stubOrchestratorRuns>) {
  return mock.mock.calls.map(([input]) => {
    const url = new URL(input, 'http://localhost')
    return { path: url.pathname, params: Object.fromEntries(url.searchParams) }
  })
}
