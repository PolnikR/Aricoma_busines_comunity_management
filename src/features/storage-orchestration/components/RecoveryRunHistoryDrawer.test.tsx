import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunHistoryDrawer } from './RecoveryRunHistoryDrawer'
import { useAppRunHistory } from '../hooks/useAppRunHistory'
import type { OrchestratedApp } from '../model/recoveryRunTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useAppRunHistory', () => ({
  useAppRunHistory: vi.fn(),
}))

afterEach(cleanup)

const app: OrchestratedApp = { id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb' }

describe('RecoveryRunHistoryDrawer', () => {
  it('is closed when no app is selected', () => {
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    render(<RecoveryRunHistoryDrawer app={null} providerId="airflow-01" onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows the full run history for the selected app, one call for this app alone', () => {
    vi.mocked(useAppRunHistory).mockReturnValue({
      data: {
        runs: [
          { runId: 'scheduled__2026-08-17T22:00:00+00:00', status: 'success', startedAt: '2026-08-17T22:00:00Z', endedAt: '2026-08-17T22:04:12Z', durationSeconds: 252 },
          { runId: 'scheduled__2026-08-16T22:00:00+00:00', status: 'failed', startedAt: '2026-08-16T22:00:00Z', endedAt: '2026-08-16T22:00:42Z', durationSeconds: 42 },
        ],
        total: 22,
      },
      isLoading: false,
      error: null,
    })

    render(<RecoveryRunHistoryDrawer app={app} providerId="airflow-01" onClose={vi.fn()} />)

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('finance_recovery')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(useAppRunHistory).toHaveBeenCalledWith({ providerId: 'airflow-01', dagId: 'dag_260818094526_2918dccb', page: 1, pageSize: 10 })
  })
})
