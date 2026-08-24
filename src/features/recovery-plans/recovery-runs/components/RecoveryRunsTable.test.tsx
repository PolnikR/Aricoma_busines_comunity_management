import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryRunsTable } from './RecoveryRunsTable'
import type { RecoveryRunRow } from './RecoveryRunsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

const rows: [RecoveryRunRow, RecoveryRunRow] = [
  {
    id: 'finance_recovery',
    name: 'Finance Recovery',
    entityType: 'application',
    dagId: 'dag_260818094526_2918dccb',
    latestRunState: { status: 'data', run: { runId: 'r1', status: 'success', startedAt: '2026-08-17T22:00:00Z', endedAt: '2026-08-17T22:04:12Z', durationSeconds: 252 }, refreshError: null },
  },
  {
    id: 'billing_group',
    name: 'Billing Group',
    entityType: 'group',
    dagId: 'dag_260817113000_aa11bb',
    latestRunState: { status: 'empty', refreshError: null },
  },
]

const tableStateProps = {
  search: '',
  onSearchChange: vi.fn(),
  page: 1,
  pageSize: 10,
  total: rows.length,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
}

describe('RecoveryRunsTable', () => {
  it('renders one row per entity with its latest status, and a placeholder when there are no runs yet', () => {
    render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
    expect(screen.getByText('Billing Group')).toBeInTheDocument()
    expect(screen.getByText('No runs yet')).toBeInTheDocument()
  })

  it('shows the entity type column only when showEntityType is true', () => {
    const { rerender } = render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )
    expect(screen.queryByText('Recovery Group')).not.toBeInTheDocument()

    rerender(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={rows}
        showEntityType
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )
    expect(screen.getByText('Recovery Group')).toBeInTheDocument()
    // 'Application' appears both as the name column header and the type badge.
    expect(screen.getAllByText('Application').length).toBeGreaterThanOrEqual(2)
  })

  it('calls onSelectEntity with the row id when a row is clicked', () => {
    const onSelectEntity = vi.fn()
    render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={onSelectEntity}
        selectedEntityKey={null}
      />,
    )

    fireEvent.click(screen.getByText('Finance Recovery'))
    expect(onSelectEntity).toHaveBeenCalledWith('application', 'finance_recovery')
  })

  it('shows a loading skeleton instead of the table while loading', () => {
    render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={[]}
        showEntityType={false}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('distinguishes loading and failed latest-run lookups from a successful empty result', () => {
    const onRetry = vi.fn()
    render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={[
          { ...rows[0], latestRunState: { status: 'loading' } },
          { ...rows[1], latestRunState: { status: 'error', error: new Error('Airflow unavailable') } },
        ]}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={onRetry}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )

    expect(screen.getByText('Loading latest run…')).toBeInTheDocument()
    expect(screen.getByText('Latest run unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('No runs yet')).not.toBeInTheDocument()
  })

  it('shows the empty state distinct from the no-matches state', () => {
    render(
      <RecoveryRunsTable
        {...tableStateProps}
        rows={[]}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityKey={null}
      />,
    )

    expect(screen.getByText('No orchestrated entities yet.')).toBeInTheDocument()
  })

  it('shows supported backend detail in the retryable load state', () => {
    const error = new Error('Fetch runs request failed with status 503', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'Orchestrator is unavailable.' }),
    })
    render(<RecoveryRunsTable {...tableStateProps} rows={[]} total={0} showEntityType={false} isLoading={false} error={error} isRetrying={false} onRetry={vi.fn()} onSelectEntity={vi.fn()} selectedEntityKey={null} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Orchestrator is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
