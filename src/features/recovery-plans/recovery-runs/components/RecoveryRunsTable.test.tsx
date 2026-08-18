import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryRunsTable } from './RecoveryRunsTable'
import type { RecoveryRunRow } from './RecoveryRunsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const rows: RecoveryRunRow[] = [
  {
    id: 'finance_recovery',
    name: 'Finance Recovery',
    latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-17T22:00:00Z', endedAt: '2026-08-17T22:04:12Z', durationSeconds: 252 },
  },
  {
    id: 'billing_dr',
    name: 'Billing DR',
    latestRun: null,
  },
]

describe('RecoveryRunsTable', () => {
  it('renders one row per app with its latest status, and a placeholder when there are no runs yet', () => {
    render(
      <RecoveryRunsTable
        rows={rows}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectApp={vi.fn()}
        selectedAppId={null}
      />,
    )

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('Billing DR')).toBeInTheDocument()
    expect(screen.getByText('No runs yet')).toBeInTheDocument()
  })

  it('calls onSelectApp with the row id when a row is clicked', () => {
    const onSelectApp = vi.fn()
    render(
      <RecoveryRunsTable
        rows={rows}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectApp={onSelectApp}
        selectedAppId={null}
      />,
    )

    fireEvent.click(screen.getByText('Finance Recovery'))
    expect(onSelectApp).toHaveBeenCalledWith('finance_recovery')
  })

  it('shows a loading skeleton instead of the table while loading', () => {
    render(
      <RecoveryRunsTable
        rows={[]}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectApp={vi.fn()}
        selectedAppId={null}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the empty state distinct from the no-matches state', () => {
    render(
      <RecoveryRunsTable
        rows={[]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectApp={vi.fn()}
        selectedAppId={null}
      />,
    )

    expect(screen.getByText('No orchestrated applications yet.')).toBeInTheDocument()
  })
})
