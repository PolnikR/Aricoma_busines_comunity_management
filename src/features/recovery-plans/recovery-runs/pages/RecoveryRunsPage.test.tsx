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
    vi.mocked(useOrchestratedEntityRuns).mockReturnValue([
      { entity: financeApp, latestRun: { runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: null }, isLoading: false },
      { entity: billingGroup, latestRun: null, isLoading: false },
    ])
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
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => (
      passedEntities.map(entity => ({ entity, latestRun: null, isLoading: false }))
    ))
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
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => (
      passedEntities.map(entity => ({ entity, latestRun: null, isLoading: false }))
    ))
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
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => (
      passedEntities.map(entity => ({ entity, latestRun: null, isLoading: false }))
    ))
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    renderPage(['/?tab=groups&entityId=billing_group'])

    // Appears twice: the filtered table row and the auto-opened history drawer title.
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
    vi.mocked(useOrchestratedEntityRuns).mockImplementation(passedEntities => (
      passedEntities.map(entity => ({ entity, latestRun: null, isLoading: false }))
    ))
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    renderPage()

    fireEvent.click(screen.getByText('Finance Recovery'))

    expect(useAppRunHistory).toHaveBeenLastCalledWith({ providerId: 'airflow-01', dagId: 'dag_260818094526_2918dccb', page: 1, pageSize: 10 })
  })
})
