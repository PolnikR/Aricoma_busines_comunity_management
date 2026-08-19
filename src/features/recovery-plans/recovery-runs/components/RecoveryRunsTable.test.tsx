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
    entityType: 'application',
    dagId: 'dag_260818094526_2918dccb',
    latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-17T22:00:00Z', endedAt: '2026-08-17T22:04:12Z', durationSeconds: 252 },
  },
  {
    id: 'billing_group',
    name: 'Billing Group',
    entityType: 'group',
    dagId: 'dag_260817113000_aa11bb',
    latestRun: null,
  },
]

describe('RecoveryRunsTable', () => {
  it('renders one row per entity with its latest status, and a placeholder when there are no runs yet', () => {
    render(
      <RecoveryRunsTable
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityId={null}
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
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityId={null}
      />,
    )
    expect(screen.queryByText('Recovery Group')).not.toBeInTheDocument()

    rerender(
      <RecoveryRunsTable
        rows={rows}
        showEntityType
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityId={null}
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
        rows={rows}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={onSelectEntity}
        selectedEntityId={null}
      />,
    )

    fireEvent.click(screen.getByText('Finance Recovery'))
    expect(onSelectEntity).toHaveBeenCalledWith('finance_recovery')
  })

  it('shows a loading skeleton instead of the table while loading', () => {
    render(
      <RecoveryRunsTable
        rows={[]}
        showEntityType={false}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityId={null}
      />,
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the empty state distinct from the no-matches state', () => {
    render(
      <RecoveryRunsTable
        rows={[]}
        showEntityType={false}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
        onSelectEntity={vi.fn()}
        selectedEntityId={null}
      />,
    )

    expect(screen.getByText('No orchestrated entities yet.')).toBeInTheDocument()
  })
})
