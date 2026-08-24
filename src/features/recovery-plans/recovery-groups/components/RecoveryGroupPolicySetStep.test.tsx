import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'

const {
  useSnapshotPoliciesMock,
  useRecoveryAppPoliciesMock,
  useCleanRoomPoliciesMock,
} = vi.hoisted(() => ({
  useSnapshotPoliciesMock: vi.fn(),
  useRecoveryAppPoliciesMock: vi.fn(),
  useCleanRoomPoliciesMock: vi.fn(),
}))

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies', () => ({
  useSnapshotPolicies: useSnapshotPoliciesMock,
}))
vi.mock('@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies', () => ({
  useRecoveryAppPolicies: useRecoveryAppPoliciesMock,
}))
vi.mock('@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies', () => ({
  useCleanRoomPolicies: useCleanRoomPoliciesMock,
}))

const policySets: PolicySet[] = [
  {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    snapshotPolicyId: 'medium-6h',
    recoveryAppPolicyId: 'critical-daily-latest',
    cleanRoomPolicyId: 'enforce-clean-target',
  },
]

describe('RecoveryGroupPolicySetStep', () => {
  beforeEach(() => {
    useSnapshotPoliciesMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useRecoveryAppPoliciesMock.mockReturnValue({ data: [], isLoading: false, error: null })
    useCleanRoomPoliciesMock.mockReturnValue({ data: [], isLoading: false, error: null })
  })

  it('shows the step title and description', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('Policy set')).toBeInTheDocument()
    expect(screen.getByText('Select a policy set and review its snapshot, recovery application, and clean room policies.')).toBeInTheDocument()
  })

  it('shows a loading state instead of the picker while fetching', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={[]}
        isLoading
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading policy sets')
    expect(screen.queryByText('No policy sets available')).not.toBeInTheDocument()
  })

  it('shows an empty state when no policy sets exist', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={[]}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText('No policy sets available')).toBeInTheDocument()
  })

  it('renders the picker and reports a selection when policy sets exist', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={onSelect}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Tier 2 applications/i }))
    expect(onSelect).toHaveBeenCalledWith('tier2-apps')
  })
})
