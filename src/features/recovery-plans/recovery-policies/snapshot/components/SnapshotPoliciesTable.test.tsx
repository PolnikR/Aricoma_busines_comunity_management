import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { SnapshotPolicy } from '../model/snapshotPolicyTypes'
import { SnapshotPoliciesTable } from './SnapshotPoliciesTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeleteSnapshotPolicy', () => ({
  useDeleteSnapshotPolicy: () => ({ mutate: vi.fn(), isPending: false }),
}))

const policy: SnapshotPolicy = {
  id: 'critical-15m',
  name: 'Critical — 15 min',
  description: 'Every 15 minutes, retained 3 hours.',
  level: 'critical',
  frequencyValue: 15,
  frequencyUnit: 'minutes',
  retentionValue: 3,
  retentionUnit: 'hours',
  maxSnapshots: 12,
  enabled: true,
}

const archivePolicy: SnapshotPolicy = {
  id: 'archive-24h',
  name: 'Archive — daily',
  description: 'Once a day, retained 90 days.',
  level: 'low',
  frequencyValue: 24,
  frequencyUnit: 'hours',
  retentionValue: 90,
  retentionUnit: 'days',
  maxSnapshots: null,
  enabled: false,
}

describe('SnapshotPoliciesTable', () => {
  it('shows the policy schedule and opens an accessible detail drawer', async () => {
    render(
      <SnapshotPoliciesTable
        policies={[policy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search snapshot policies' })).toBeInTheDocument()
    expect(screen.getByText('Every 15 minutes')).toBeInTheDocument()
    expect(screen.getByText('3 hours')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Critical — 15 min'))
    expect(screen.getByRole('dialog', { name: 'Snapshot policy detail' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the snapshot policy submit payload without opening the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <SnapshotPoliciesTable
        policies={[policy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Snapshot Policy JSON' })
    expect(dialog).toHaveTextContent('"frequency_value": 15')
    expect(dialog).toHaveTextContent('"retention_unit": "hours"')
    expect(dialog).toHaveTextContent('"max_snapshots": 12')
    expect(dialog).not.toHaveTextContent('"frequencyValue"')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('keeps table controls available while showing a shared request error', () => {
    render(
      <SnapshotPoliciesTable
        policies={[]}
        isLoading={false}
        error={new Error('private backend details')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('private backend details')
  })

  it('shows supported backend detail in the load error', () => {
    render(<SnapshotPoliciesTable policies={[]} isLoading={false} error={new OrvalApiError(503, 'Unavailable', { detail: 'Snapshot service unavailable.' })} isRetrying={false} onRetry={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Snapshot service unavailable.')
  })

  it('shows a Filters button that opens a level and status filter panel', async () => {
    const user = userEvent.setup()
    render(
      <SnapshotPoliciesTable
        policies={[policy, archivePolicy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filters' }))

    const dialog = screen.getByRole('dialog', { name: 'Filter snapshot policies' })
    expect(within(dialog).getByLabelText('Level')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Status')).toBeInTheDocument()
  })

  it('filters policies by level', async () => {
    const user = userEvent.setup()
    render(
      <SnapshotPoliciesTable
        policies={[policy, archivePolicy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter snapshot policies' })
    await user.selectOptions(within(dialog).getByLabelText('Level'), 'low')
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Archive — daily')).toBeInTheDocument()
    expect(screen.queryByText('Critical — 15 min')).not.toBeInTheDocument()
  })

  it('filters policies by status', async () => {
    const user = userEvent.setup()
    render(
      <SnapshotPoliciesTable
        policies={[policy, archivePolicy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter snapshot policies' })
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'disabled')
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Archive — daily')).toBeInTheDocument()
    expect(screen.queryByText('Critical — 15 min')).not.toBeInTheDocument()
  })

  it('clears applied filters and shows the active filter count', async () => {
    const user = userEvent.setup()
    render(
      <SnapshotPoliciesTable
        policies={[policy, archivePolicy]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    let dialog = screen.getByRole('dialog', { name: 'Filter snapshot policies' })
    await user.selectOptions(within(dialog).getByLabelText('Level'), 'low')
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(screen.getByRole('button', { name: 'Filters 1' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filters 1' }))
    dialog = screen.getByRole('dialog', { name: 'Filter snapshot policies' })
    await user.click(within(dialog).getByRole('button', { name: 'Clear all' }))

    expect(screen.getByText('Critical — 15 min')).toBeInTheDocument()
    expect(screen.getByText('Archive — daily')).toBeInTheDocument()
  })
})
