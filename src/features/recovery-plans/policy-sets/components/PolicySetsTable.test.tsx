import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '../model/policySetTypes'
import { PolicySetsTable } from './PolicySetsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeletePolicySet', () => ({
  useDeletePolicySet: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: () => ({
    data: [{ id: 'medium-6h', name: 'Medium — 6h' }],
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies', () => ({
  useRecoveryAppPolicies: () => ({
    data: [{ id: 'critical-daily-latest', name: 'Critical — Daily DR Test' }],
  }),
}))
vi.mock('@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies', () => ({
  useCleanRoomPolicies: () => ({
    data: [{ id: 'enforce-clean-target', name: 'Enforce Clean Target' }],
  }),
}))

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshotPolicyId: 'medium-6h',
  recoveryAppPolicyId: 'critical-daily-latest',
  cleanRoomPolicyId: 'enforce-clean-target',
}

describe('PolicySetsTable', () => {
  it('keeps pagination outside a desktop-only table scroll region', () => {
    const { container } = render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    const tableLayout = container.firstElementChild
    const scrollRegion = tableLayout?.children.item(1)

    expect(tableLayout).toHaveClass('min-h-0', 'min-w-0', 'flex-1')
    expect(scrollRegion).toHaveClass('custom-scrollbar', 'min-h-0', 'flex-1', 'lg:overflow-y-auto')
    expect(scrollRegion).not.toHaveClass('overflow-y-auto')
    expect(screen.getByText('Showing 1-1 of 1')).toBeInTheDocument()
  })

  it('shows the policy set and opens an accessible detail drawer with resolved policy names', async () => {
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search policy sets' })).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Tier 2 applications'))
    const detail = screen.getByRole('dialog', { name: 'Policy set detail' })
    expect(detail).toBeInTheDocument()
    expect(within(detail).getByText('Medium — 6h')).toBeInTheDocument()
    expect(within(detail).getByText('Critical — Daily DR Test')).toBeInTheDocument()
    expect(within(detail).getByText('Enforce Clean Target')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the policy set submit payload without opening the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <PolicySetsTable
        policySets={[policySet]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Policy Set JSON' })
    expect(dialog).toHaveTextContent('"snapshot_policy_id": "medium-6h"')
    expect(dialog).toHaveTextContent('"recovery_app_policy_id": "critical-daily-latest"')
    expect(dialog).toHaveTextContent('"clean_room_policy_id": "enforce-clean-target"')
    expect(dialog).not.toHaveTextContent('"snapshotPolicyId"')
    expect(screen.queryByRole('dialog', { name: 'Policy set detail' })).not.toBeInTheDocument()
  })

  it('keeps table controls available while showing a shared request error', () => {
    render(
      <PolicySetsTable
        policySets={[]}
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
