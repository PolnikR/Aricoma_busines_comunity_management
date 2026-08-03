import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
})
