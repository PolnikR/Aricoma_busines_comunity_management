import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunsPage } from './RecoveryRunsPage'
import { useOrchestratedEntities } from '../hooks/useOrchestratedEntities'
import { useOrchestratedEntityRuns } from '../hooks/useOrchestratedEntityRuns'
import { useAppRunHistory } from '../hooks/useAppRunHistory'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useOrchestratedEntities', () => ({ useOrchestratedEntities: vi.fn() }))
vi.mock('../hooks/useOrchestratedEntityRuns', () => ({ useOrchestratedEntityRuns: vi.fn() }))
vi.mock('../hooks/useAppRunHistory', () => ({ useAppRunHistory: vi.fn() }))
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({ data: [] }),
}))

afterEach(cleanup)

const financeApp = { entityType: 'application' as const, id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb', providerId: 'airflow-01' }
const billingGroup = { entityType: 'group' as const, id: 'billing_group', name: 'Billing Group', dagId: 'dag_260817113000_aa11bb', providerId: 'airflow-02' }
const entities = [financeApp, billingGroup]

function renderPage(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RecoveryRunsPage />
    </MemoryRouter>,
  )
}

describe('RecoveryRunsPage', () => {
  it('shows the bounded scope note and one row per orchestrated entity across both types by default', () => {
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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    renderPage()

    expect(screen.getByText('Showing 2 orchestrated entities — entities never pushed to orchestration have no runs and aren\'t queried.')).toBeInTheDocument()
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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: true, error: null })

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
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: true, error: null })

    renderPage(['/?entityType=application&entityId=finance_recovery'])

    expect(screen.queryByText('Updating')).not.toBeInTheDocument()
  })
})
