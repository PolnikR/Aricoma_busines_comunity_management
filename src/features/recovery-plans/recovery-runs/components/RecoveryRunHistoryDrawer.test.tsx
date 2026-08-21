import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunHistoryDrawer } from './RecoveryRunHistoryDrawer'
import { useAppRunHistory } from '../hooks/useAppRunHistory'
import type { RecoveryRunHistoryEntity } from './RecoveryRunHistoryDrawer'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useAppRunHistory', () => ({
  useAppRunHistory: vi.fn(),
}))
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [{ id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' }],
  }),
}))

afterEach(cleanup)

const entity: RecoveryRunHistoryEntity = { id: 'finance_recovery', name: 'Finance Recovery', dagId: 'dag_260818094526_2918dccb', providerId: 'airflow-01' }

describe('RecoveryRunHistoryDrawer', () => {
  it('is closed when no entity is selected', () => {
    vi.mocked(useAppRunHistory).mockReturnValue({ data: { runs: [], total: 0 }, isLoading: false, error: null })

    render(<RecoveryRunHistoryDrawer entity={null} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows the full run history and explains its refresh policy for the selected entity', () => {
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

    render(<RecoveryRunHistoryDrawer entity={entity} onClose={vi.fn()} />)

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('finance_recovery')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText("Loaded on demand for this entity. Page 1 refreshes every 15 seconds while its newest run is active; terminal runs and older pages refresh every 5 minutes.")).toBeInTheDocument()
    expect(useAppRunHistory).toHaveBeenCalledWith({ providerId: 'airflow-01', dagId: 'dag_260818094526_2918dccb', page: 1, pageSize: 10 })

    expect(screen.getByRole('link', { name: /View in Airflow/ })).toHaveAttribute(
      'href',
      'https://airflow.dynamic.test:8443/dags/dag_260818094526_2918dccb',
    )
  })
})
