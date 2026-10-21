import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import { requestedRuns, runsBody, stubOrchestratorRuns } from '../test/stubOrchestratorRuns'
import { MemoryRouter, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunsPage } from './RecoveryRunsPage'
import { useOrchestratedEntities } from '../hooks/useOrchestratedEntities'
import { useOrchestratedEntityRuns } from '../hooks/useOrchestratedEntityRuns'
import { useAppRunHistory } from '../hooks/useAppRunHistory'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useOrchestratedEntities', () => ({ useOrchestratedEntities: vi.fn() }))
vi.mock('../hooks/useOrchestratedEntityRuns', () => ({ useOrchestratedEntityRuns: vi.fn() }))
vi.mock('../hooks/useAppRunHistory', () => ({ useAppRunHistory: vi.fn() }))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({ data: [] }),
}))

afterEach(cleanup)

const financeApp = { entityType: 'application' as const, id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb', providerId: 'airflow-01' }
const billingGroup = { entityType: 'group' as const, id: 'billing_group', name: 'Billing Group', dagId: 'dag_260817113000_aa11bb', providerId: 'airflow-02' }
const entities = [financeApp, billingGroup]

function historyResult(isLoading = false) {
  return {
    data: { runs: [], total: 0 },
    isLoading,
    isFetching: isLoading,
    error: null,
    refetch: vi.fn(),
  }
}

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RecoveryRunsPage />
    </MemoryRouter>,
  )
}

function HistoryNavigation() {
  const navigate = useNavigate()
  return <>
    <button onClick={() => { void navigate('/?entityType=group&entityId=shared') }}>Select group URL</button>
    <button onClick={() => { void navigate('/') }}>Clear entity URL</button>
  </>
}

describe('RecoveryRunsPage', () => {
  it.each(['providerId', 'dagId'] as const)('resets the history before querying a changed %s', field => {
    const state = { entities: [financeApp], isLoading: false, isFetching: false, error: null, refetch: vi.fn() }
    vi.mocked(useOrchestratedEntities).mockReturnValue(state)
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({ rows: [], isFetching: false, refetch: vi.fn() })
    vi.mocked(useAppRunHistory).mockReturnValue({ ...historyResult(), data: { runs: [], total: 30 } })
    const view = renderPage(['/?entityType=application&entityId=finance_recovery'])
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Run history detail' })).getByRole('button', { name: 'Page 3' }))
    vi.mocked(useAppRunHistory).mockClear()
    vi.mocked(useOrchestratedEntities).mockReturnValue({ ...state, entities: [{ ...financeApp, [field]: 'changed' }] })
    view.rerender(<MemoryRouter initialEntries={['/?entityType=application&entityId=finance_recovery']}><RecoveryRunsPage /></MemoryRouter>)
    expect(vi.mocked(useAppRunHistory).mock.calls.length).toBeGreaterThan(0)
    expect(vi.mocked(useAppRunHistory).mock.calls.every(([params]) => params.page === 1)).toBe(true)
  })

  it('resets history for app/group with matching ID, provider and DAG, including URL close/reopen', () => {
    const app = { ...financeApp, id: 'shared' }
    const group = { ...app, entityType: 'group' as const, name: 'Group with same identity fields' }
    vi.mocked(useOrchestratedEntities).mockReturnValue({ entities: [app, group], isLoading: false, isFetching: false, error: null, refetch: vi.fn() })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({ rows: [], isFetching: false, refetch: vi.fn() })
    vi.mocked(useAppRunHistory).mockReturnValue({ ...historyResult(), data: { runs: [], total: 30 } })
    render(<MemoryRouter initialEntries={['/?entityType=application&entityId=shared']}><HistoryNavigation /><RecoveryRunsPage /></MemoryRouter>)
    const pageThree = () => { fireEvent.click(within(screen.getByRole('dialog', { name: 'Run history detail' })).getByRole('button', { name: 'Page 3' })) }
    pageThree()
    expect(vi.mocked(useAppRunHistory).mock.lastCall?.[0].page).toBe(3)
    vi.mocked(useAppRunHistory).mockClear()
    fireEvent.click(screen.getByText('Select group URL'))
    expect(vi.mocked(useAppRunHistory).mock.calls.every(([params]) => params.page === 1)).toBe(true)
    pageThree()
    fireEvent.click(screen.getByText('Clear entity URL'))
    expect(screen.queryByRole('dialog', { name: 'Run history detail' })).not.toBeInTheDocument()
    vi.mocked(useAppRunHistory).mockClear()
    fireEvent.click(screen.getByText('Select group URL'))
    expect(vi.mocked(useAppRunHistory).mock.calls.every(([params]) => params.page === 1)).toBe(true)
  })

  it('retries only the failed row using the real latest-run queries', async () => {
    const actual = await vi.importActual<typeof import('../hooks/useOrchestratedEntityRuns')>('../hooks/useOrchestratedEntityRuns')
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(actual.useOrchestratedEntityRuns)
    const refetchEntities = vi.fn()
    vi.mocked(useOrchestratedEntities).mockReturnValue({ entities, isLoading: false, isFetching: false, error: null, refetch: refetchEntities })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())
    const mock = stubOrchestratorRuns({ status: 503, body: { detail: 'Unavailable' } }, { body: runsBody([]) }, { body: runsBody([{ id: 'recovered', state: 'success' }]) })
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    const view = render(<QueryClientProvider client={client}><MemoryRouter><RecoveryRunsPage /></MemoryRouter></QueryClientProvider>)
    try {
      fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
      await waitFor(() => { expect(screen.getByText('success')).toBeInTheDocument() })
      expect(requestedRuns(mock).map(request => request.params.provider_id)).toEqual(['airflow-01', 'airflow-02', 'airflow-01'])
      expect(refetchEntities).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('shows a static surface header and one row per orchestrated entity across both types by default', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({
      rows: [
        { entity: financeApp, latestRunState: { status: 'data', run: { runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: null }, refreshError: null } },
        { entity: billingGroup, latestRunState: { status: 'empty', refreshError: null } },
      ],
      isFetching: false,
      refetch: vi.fn(),
    })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Recovery runs' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Orchestrated entities' })).toBeInTheDocument()
    expect(screen.getByText('Latest run per orchestrated entity. Entities never pushed to orchestration aren\'t queried.')).toBeInTheDocument()
    expect(screen.getAllByText('Execution history and status of recovery runs.')).toHaveLength(1)
    expect(screen.queryByText(/^Showing \d+ orchestrated entities/)).not.toBeInTheDocument()
    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Billing Group')).toBeInTheDocument()
  })

  it('filters to only applications when the Applications tab is selected via the URL', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage(['/?tab=applications'])

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.queryByText('Billing Group')).not.toBeInTheDocument()
  })

  it('filters to only recovery groups when the Recovery Groups tab is selected via the URL', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage(['/?tab=groups'])

    expect(screen.getByText('Billing Group')).toBeInTheDocument()
    expect(screen.queryByText('Finance Recovery')).not.toBeInTheDocument()
  })

  it('filters to a single entity when entityId is present in the URL (deep-link from a detail panel)', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage(['/?tab=groups&entityType=group&entityId=billing_group'])

    // Appears twice: the filtered table row and the auto-opened history drawer title.
    expect(screen.getAllByText('Billing Group').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Finance Recovery')).not.toBeInTheDocument()
  })

  it('queries latest runs only for entities on the current page', () => {
    const pageEntities = Array.from({ length: 12 }, (_, index) => ({
      entityType: 'application' as const,
      id: `app-${String(index + 1)}`,
      name: `Application ${String(index + 1)}`,
      dagId: `dag-${String(index + 1)}`,
      providerId: 'airflow-01',
    }))
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities: pageEntities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage()

    expect(vi.mocked(useOrchestratedEntityRuns).mock.lastCall?.[0]).toEqual(pageEntities.slice(0, 10))
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(vi.mocked(useOrchestratedEntityRuns).mock.lastCall?.[0]).toEqual(pageEntities.slice(10))
  })

  it('uses entity type to disambiguate entities with the same domain id', () => {
    const collidingEntities = [
      { ...financeApp, id: 'shared-id' },
      { ...billingGroup, id: 'shared-id' },
    ]
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities: collidingEntities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage(['/?entityType=group&entityId=shared-id'])

    expect(vi.mocked(useOrchestratedEntityRuns).mock.lastCall?.[0]).toEqual([collidingEntities[1]])
    expect(screen.getAllByText('Billing Group').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Finance Recovery')).not.toBeInTheDocument()
  })

  it('opens the run history drawer for the clicked entity', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => ({
      rows: passedEntities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    }))
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage()

    fireEvent.click(screen.getByText('Finance Recovery'))

    expect(useAppRunHistory).toHaveBeenLastCalledWith({ providerId: 'airflow-01', dagId: 'dag_260818094526_2918dccb', page: 1, pageSize: 10 })
  })

  it('refreshes entity collections and visible latest runs from the toolbar', () => {
    const entityRefetch = vi.fn()
    const latestRunsRefetch = vi.fn()
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: entityRefetch,
    })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({
      rows: entities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: latestRunsRefetch,
    })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(entityRefetch).toHaveBeenCalledTimes(1)
    expect(latestRunsRefetch).toHaveBeenCalledTimes(1)
  })

  it('shows Updating while overview data is fetching and keeps existing rows visible', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({
      rows: entities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult())

    renderPage()

    expect(screen.getByText('Updating')).toBeInTheDocument()
    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Billing Group')).toBeInTheDocument()
  })

  it('shows Updating for latest-run fetching', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({
      rows: entities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: true,
      refetch: vi.fn(),
    })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult(true))

    renderPage(['/?entityType=application&entityId=finance_recovery'])

    expect(screen.getByText('Updating')).toBeInTheDocument()
    expect(screen.getAllByText('Finance Recovery').length).toBeGreaterThanOrEqual(1)
  })

  it('does not show page-level Updating for history-only fetching', () => {
    vi.mocked(useOrchestratedEntities).mockReturnValue({
      entities,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue({
      rows: entities.map(entity => ({ entity, latestRunState: { status: 'empty' as const, refreshError: null } })),
      isFetching: false,
      refetch: vi.fn(),
    })
    vi.mocked(useAppRunHistory).mockReturnValue(historyResult(true))

    renderPage(['/?entityType=application&entityId=finance_recovery'])

    expect(screen.queryByText('Updating')).not.toBeInTheDocument()
  })
})
