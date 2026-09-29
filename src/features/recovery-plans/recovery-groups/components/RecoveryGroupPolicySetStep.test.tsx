import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PolicySetRecord } from '@/generated/query/zod'
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
vi.mock('@/generated/query/snapshot-policies/snapshot-policies.gen', () => ({
  useGetPolicies: useSnapshotPoliciesMock,
}))
vi.mock('@/generated/query/recovery-app-policies/recovery-app-policies.gen', () => ({
  useGetRecoveryAppPolicies: useRecoveryAppPoliciesMock,
}))
vi.mock('@/generated/query/clean-room-policies/clean-room-policies.gen', () => ({
  useGetCleanRoomPolicies: useCleanRoomPoliciesMock,
}))

const policySets: PolicySetRecord[] = [
  {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    snapshot_policy_id: 'medium-6h',
    recovery_app_policy_id: 'critical-daily-latest',
    clean_room_policy_id: 'enforce-clean-target',
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
