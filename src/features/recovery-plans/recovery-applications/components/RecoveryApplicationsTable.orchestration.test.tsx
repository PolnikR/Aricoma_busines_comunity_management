import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'
import { application, createQueryWrapper, deferredResponse, provider, stubSelectedOrchestration } from '../../recovery-runs/test/selectedOrchestrationFixtures'
import { runsBody } from '../../recovery-runs/test/stubOrchestratorRuns'
import { getGetOrchestratorRunsQueryKey } from '@/generated/query/operations/operations.gen'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

function Location() { return <output>{useLocation().search}</output> }

function setup(changes: Partial<typeof application> = {}, others: typeof application[] = []) {
  const app = { ...application, ...changes }
  const { client, Wrapper } = createQueryWrapper()
  const content = (record: typeof application) => <MemoryRouter><Routes>
    <Route path="/" element={<RecoveryApplicationsTable applications={[record, ...others]} />} />
    <Route path="/recovery-plans/recovery-runs" element={<Location />} />
  </Routes></MemoryRouter>
  const view = render(content(app), { wrapper: Wrapper })
  const open = () => { fireEvent.click(screen.getByText(app.data.application.name)) }
  const section = (name: string) => {
    const detail = screen.getByRole('dialog', { name: 'Application detail' })
    fireEvent.click(within(detail).getByRole('button', { name }))
    return within(detail).getByRole('region', { name })
  }
  return { ...view, client, open, section, update: (next: Partial<typeof application>) => { view.rerender(content({ ...app, ...next })) } }
}

describe('Application selected orchestration HTTP contract', () => {
  it('preserves the latest execution timestamp and duration in the existing presentation', async () => {
    stubSelectedOrchestration({ latest: () => Response.json({
      ...runsBody([]),
      dag_runs: [{ dag_run_id: 'latest', state: 'success', start_date: '2026-08-19T08:51:00Z', duration: 7.45 }],
    }) })
    const view = setup()
    view.open()
    const section = view.section('Orchestration')
    await within(section).findByText('success')
    expect(section).toHaveTextContent(new Date('2026-08-19T08:51:00Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
    expect(within(section).getByText('Duration').nextElementSibling).toHaveTextContent('7s')
  })

  it('retains the existing error precedence when a cached latest run fails to refresh', async () => {
    let failed = false
    stubSelectedOrchestration({ latest: () => failed
      ? Response.json({ detail: 'unavailable' }, { status: 503 })
      : Response.json(runsBody([{ id: 'cached', state: 'success' }])) })
    const view = setup()
    view.open()
    const section = view.section('Orchestration')
    await within(section).findByText('success')
    failed = true
    await act(async () => { await view.client.refetchQueries({ queryKey: getGetOrchestratorRunsQueryKey() }) })
    await within(section).findByText('Latest run unavailable')
    expect(section).not.toHaveTextContent('success')
  })

  it('polls only the selected active detail and stops when it closes', async () => {
    vi.useFakeTimers()
    const http = stubSelectedOrchestration({ latest: () => Response.json(runsBody([{ id: 'active', state: 'running' }])) })
    const view = setup()
    view.open()
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(http.params('get_orchestrator_runs')).toHaveLength(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(15000) })
    expect(http.params('get_orchestrator_runs')).toHaveLength(2)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Close application' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(30000) })
    expect(http.params('get_orchestrator_runs')).toHaveLength(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each([
    ['pending', 'Loading...'], ['failed', 'Latest run unavailable'], ['absent', 'Orchestrator unavailable'],
  ])('starts latest lookup independently of a %s provider catalog', async (catalog, expected) => {
    const pending = deferredResponse()
    const http = stubSelectedOrchestration({ providers: () => catalog === 'pending' ? pending.promise
      : Response.json(catalog === 'failed' ? { detail: 'unavailable' } : { providers: [] }, { status: catalog === 'failed' ? 503 : 200 }) })
    const view = setup()
    view.open()
    const section = view.section('Orchestration')
    await waitFor(() => { expect(http.params('get_orchestrator_runs')).toHaveLength(1) })
    await within(section).findByText(expected)
    expect(within(section).getByRole('button', { name: /View recovery runs/ })).toBeInTheDocument()
    await act(async () => { pending.resolve(Response.json({ providers: [provider] })); await pending.promise })
  })

  it('uses the central fallback URL when the catalog provider has no URL', async () => {
    stubSelectedOrchestration({ providers: () => Response.json({ providers: [{ ...provider, url: null }] }) })
    const view = setup()
    view.open()
    const section = view.section('Orchestration')
    await within(section).findByText('success')
    expect(within(section).getByRole('link')).toHaveAttribute('href', 'http://10.99.99.55:8080/dags/dag_run-1')
  })

  it.each([['pending', 'Loading...'], ['failed', 'Latest run unavailable'], ['empty', 'No runs yet']])(
    'presents a %s latest response through the real query', async (status, expected) => {
      const pending = deferredResponse()
      stubSelectedOrchestration({ latest: () => status === 'pending' ? pending.promise
        : Response.json(status === 'failed' ? { detail: 'unavailable' } : runsBody([]), { status: status === 'failed' ? 503 : 200 }) })
      const view = setup()
      view.open()
      const section = view.section('Orchestration')
      await waitFor(() => { expect(view.client.isFetching({ queryKey: ['/get_platform_providers'] })).toBe(0) })
      await within(section).findByText(expected)
      await act(async () => { pending.resolve(Response.json(runsBody([]))); await pending.promise })
    },
  )

  it('preserves the disabled query identity when provider ID is missing', async () => {
    const http = stubSelectedOrchestration()
    const view = setup({ orchestrationProviderId: null })
    view.open()
    await waitFor(() => { expect(view.client.isFetching()).toBe(0) })
    expect(view.client.getQueryState(getGetOrchestratorRunsQueryKey({
      provider_id: '', dag_id: 'dag_run-1', limit: 1, order_by: '-logical_date',
    }))?.fetchStatus).toBe('idle')
    expect(http.params('get_orchestrator_runs')).toEqual([])
  })

  it('isolates rapid selections, ignores a delayed old response and reuses a fresh cached identity', async () => {
    const pending = deferredResponse()
    const http = stubSelectedOrchestration({ latest: url => url.searchParams.get('dag_id') === 'dag_run-1'
      ? pending.promise : Response.json(runsBody([{ id: 'second', state: 'failed' }])) })
    const second = { ...application, id: 'second', data: { application: { ...application.data.application, name: 'Second Application' } },
      airflowRunId: 'run-2', orchestrationProviderId: 'airflow-01' }
    const view = setup({}, [second])
    view.open()
    await waitFor(() => { expect(http.params('get_orchestrator_runs')).toHaveLength(1) })
    fireEvent.click(screen.getByText('Second Application'))
    let section = view.section('Orchestration')
    await within(section).findByText('failed')
    await act(async () => { pending.resolve(Response.json(runsBody([{ id: 'old', state: 'success' }]))); await pending.promise })
    expect(section).not.toHaveTextContent('success')
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Application detail' })).getByRole('button', { name: 'Close application' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Second Application'))
    section = view.section('Orchestration')
    await within(section).findByText('failed')
    expect(http.params('get_orchestrator_runs')).toHaveLength(2)
  })

  it('changes identity on provider-only and DAG-only edits, sharing cache across entity IDs', async () => {
    const http = stubSelectedOrchestration()
    const view = setup()
    view.open()
    await within(view.section('Orchestration')).findByText('success')
    view.update({ orchestrationProviderId: 'airflow-02' })
    await waitFor(() => { expect(http.params('get_orchestrator_runs')).toHaveLength(2) })
    view.update({ orchestrationProviderId: 'airflow-02', airflowRunId: 'run-2' })
    await waitFor(() => { expect(http.params('get_orchestrator_runs')).toHaveLength(3) })
    view.update({ id: 'same-identity', orchestrationProviderId: 'airflow-02', airflowRunId: 'run-2' })
    fireEvent.click(screen.getByText('Selected Application'))
    expect(http.params('get_orchestrator_runs').map(params => [params['provider_id'], params['dag_id']])).toEqual([
      ['airflow-01', 'dag_run-1'], ['airflow-02', 'dag_run-1'], ['airflow-02', 'dag_run-2'],
    ])
  })

  it('fetches one normalized latest identity only after selection and preserves encoded navigation', async () => {
    const http = stubSelectedOrchestration()
    const view = setup({ airflowRunId: 'dag_run-1' })
    await waitFor(() => { expect(http.params('get_platform_providers')).toEqual([{ type: 'all' }]) })
    expect(http.params('get_orchestrator_runs')).toEqual([])
    view.open()
    const section = view.section('Orchestration')
    await within(section).findByText('success')
    expect(http.params('get_orchestrator_runs')).toEqual([
      { provider_id: 'airflow-01', dag_id: 'dag_run-1', limit: '1', order_by: '-logical_date' },
    ])
    expect(http.params('get_platform_providers')).toHaveLength(1)
    fireEvent.click(within(section).getByRole('button', { name: /View recovery runs/ }))
    expect(await screen.findByText('?tab=applications&entityType=application&entityId=app%20%2F%20one')).toBeInTheDocument()
  })

  it.each([
    { pushToOrchestrator: false }, { orchestrationProviderId: null }, { airflowRunId: null },
  ])('does not fetch latest for disabled metadata %j', async changes => {
    const http = stubSelectedOrchestration()
    const view = setup(changes)
    view.open()
    const section = view.section('Orchestration')
    await waitFor(() => { expect(view.client.isFetching()).toBe(0) })
    expect(http.params('get_orchestrator_runs')).toEqual([])
    expect(within(section).queryByRole('button', { name: /View recovery runs/ })).not.toBeInTheDocument()
  })

  it('keeps a stored row link with Push off, but hides its detail reference and inventory', async () => {
    const http = stubSelectedOrchestration()
    const view = setup({ pushToOrchestrator: false })
    const link = await screen.findByRole('link', { name: /dag_run-1/ })
    await waitFor(() => { expect(link).toHaveAttribute('href', 'https://airflow.test/dags/dag_run-1') })
    fireEvent.click(link)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.open()
    expect(within(view.section('Orchestration')).queryByRole('link')).not.toBeInTheDocument()
    view.section('Inventory')
    await waitFor(() => { expect(view.client.isFetching()).toBe(0) })
    expect(http.params('get_recovery_app_inventory')).toEqual([])
    expect(http.params('get_orchestrator_runs')).toEqual([])
  })

  it('retains Push-gated inventory when the orchestration provider ID is missing', async () => {
    const http = stubSelectedOrchestration()
    const view = setup({ orchestrationProviderId: null })
    view.open()
    expect(within(view.section('Orchestration')).queryByRole('link')).not.toBeInTheDocument()
    const inventory = view.section('Inventory')
    await within(inventory).findByText('Recovered Application')
    expect(http.params('get_recovery_app_inventory')).toEqual([{ run_id: 'run-1', compute_provider_id: 'target' }])
    expect(http.params('get_orchestrator_runs')).toEqual([])
  })
})
