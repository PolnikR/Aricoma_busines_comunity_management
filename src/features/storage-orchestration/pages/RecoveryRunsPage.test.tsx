import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunsPage } from './RecoveryRunsPage'
import { useOrchestratedApps } from '../hooks/useOrchestratedApps'
import { useOrchestratedAppRuns } from '../hooks/useOrchestratedAppRuns'
import { useAppRunHistory } from '../hooks/useAppRunHistory'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useOrchestratedApps', () => ({ useOrchestratedApps: vi.fn() }))
vi.mock('../hooks/useOrchestratedAppRuns', () => ({ useOrchestratedAppRuns: vi.fn() }))
vi.mock('../hooks/useAppRunHistory', () => ({ useAppRunHistory: vi.fn() }))

afterEach(cleanup)

const financeApp = { id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb' }
const billingApp = { id: 'billing_dr', name: 'Billing DR', dagId: 'dag_260817113000_aa11bb' }
const apps = [financeApp, billingApp]

describe('RecoveryRunsPage', () => {
  it('shows the bounded scope note and one row per orchestrated app', () => {
    vi.mocked(useOrchestratedApps).mockReturnValue({
      apps,
      providerId: 'airflow-01',
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedAppRuns).mockReturnValue([
      { app: financeApp, latestRun: { runId: 'r1', status: 'success', startedAt: null, endedAt: null, durationSeconds: null }, isLoading: false },
      { app: billingApp, latestRun: null, isLoading: false },
    ])
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    render(<RecoveryRunsPage />)

    expect(screen.getByText('Showing 2 orchestrated applications — apps never pushed to orchestration have no runs and aren\'t queried.')).toBeInTheDocument()
    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Billing DR')).toBeInTheDocument()
  })

  it('opens the run history drawer for the clicked app', () => {
    vi.mocked(useOrchestratedApps).mockReturnValue({
      apps,
      providerId: 'airflow-01',
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    })
    vi.mocked(useOrchestratedAppRuns).mockReturnValue([
      { app: financeApp, latestRun: null, isLoading: false },
      { app: billingApp, latestRun: null, isLoading: false },
    ])
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    render(<RecoveryRunsPage />)

    fireEvent.click(screen.getByText('Finance Recovery'))

    expect(useAppRunHistory).toHaveBeenLastCalledWith({ providerId: 'airflow-01', dagId: 'dag_260818094526_2918dccb', page: 1, pageSize: 10 })
  })
})
