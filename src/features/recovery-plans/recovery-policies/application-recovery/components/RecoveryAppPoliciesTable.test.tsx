import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryAppPolicy } from '../model/recoveryAppPolicyTypes'
import { RecoveryAppPoliciesTable } from './RecoveryAppPoliciesTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeleteRecoveryAppPolicy', () => ({
  useDeleteRecoveryAppPolicy: () => ({ mutate: vi.fn(), isPending: false }),
}))

const policy: RecoveryAppPolicy = {
  id: 'medium-monthly-exacttime', name: 'Medium monthly', description: 'Monthly test.', level: 'medium',
  frequencyValue: 30, frequencyUnit: 'days', retentionValue: 2, retentionUnit: 'days', bootVerify: false,
  snapshotSelectionMode: 'exact_time', snapshotMaxAgeValue: null, snapshotMaxAgeUnit: null,
  snapshotTargetTime: '02:00', enabled: true,
}

const latestPolicy: RecoveryAppPolicy = {
  ...policy,
  id: 'critical-latest',
  name: 'Critical latest',
  level: 'critical',
  snapshotSelectionMode: 'latest',
  snapshotTargetTime: null,
}

describe('RecoveryAppPoliciesTable', () => {
  it('shows schedule selection and opens an accessible detail drawer', async () => {
    render(<RecoveryAppPoliciesTable policies={[policy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    expect(screen.getByRole('searchbox', { name: 'Search recovery app policies' })).toBeInTheDocument()
    expect(screen.getByText('Every 30 days')).toBeInTheDocument()
    expect(screen.getByText('Closest to 02:00')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Medium monthly'))
    expect(screen.getByRole('dialog', { name: 'Recovery app policy detail' })).toBeInTheDocument()
  })

  it('filters by snapshot selection mode', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppPoliciesTable policies={[policy, latestPolicy]} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = screen.getByRole('dialog', { name: 'Filter recovery app policies' })
    await user.selectOptions(within(dialog).getByLabelText('Selection mode'), 'latest')
    await user.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Critical latest')).toBeInTheDocument()
    expect(screen.queryByText('Medium monthly')).not.toBeInTheDocument()
  })
})
