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
  {
    id: 'tier3-web',
    name: 'Tier 3 web',
    description: 'Low priority web tier.',
    snapshotPolicyId: 'low-24h',
    recoveryAppPolicyId: 'high-weekly-timerange',
    cleanRoomPolicyId: 'block-on-conflict',
  },
]

const snapshotPolicies = [
  {
    id: 'medium-6h',
    name: 'Medium — 6h',
    description: 'Medium-tier snapshot cadence.',
    level: 'medium',
    frequencyValue: 6,
    frequencyUnit: 'hours',
    retentionValue: 7,
    retentionUnit: 'days',
    maxSnapshots: null,
    enabled: true,
  },
  {
    id: 'low-24h',
    name: 'Low — 24h',
    description: 'Daily snapshot cadence.',
    level: 'low',
    frequencyValue: 24,
    frequencyUnit: 'hours',
    retentionValue: 30,
    retentionUnit: 'days',
    maxSnapshots: null,
    enabled: true,
  },
] as const

const recoveryAppPolicies = [
  {
    id: 'critical-daily-latest',
    name: 'Critical — Daily DR Test',
    description: 'Daily recovery validation.',
    level: 'critical',
    frequencyValue: 1,
    frequencyUnit: 'days',
    retentionValue: 4,
    retentionUnit: 'hours',
    bootVerify: true,
    snapshotSelectionMode: 'latest',
    snapshotMaxAgeValue: null,
    snapshotMaxAgeUnit: null,
    snapshotTargetTime: null,
    enabled: true,
  },
  {
    id: 'high-weekly-timerange',
    name: 'High — Weekly DR Test',
    description: 'Weekly recovery validation.',
    level: 'high',
    frequencyValue: 7,
    frequencyUnit: 'days',
    retentionValue: 1,
    retentionUnit: 'days',
    bootVerify: true,
    snapshotSelectionMode: 'time_range',
    snapshotMaxAgeValue: 2,
    snapshotMaxAgeUnit: 'hours',
    snapshotTargetTime: null,
    enabled: true,
  },
] as const

const cleanRoomPolicies = [
  {
    id: 'enforce-clean-target',
    name: 'Enforce Clean Target',
    description: 'Remove conflicting target resources before recovery.',
    enabled: true,
  },
  {
    id: 'block-on-conflict',
    name: 'Block on Conflict',
    description: 'Fail recovery when a conflicting target resource exists.',
    enabled: false,
  },
] as const

describe('RecoveryGroupPolicySetStep', () => {
  beforeEach(() => {
    useSnapshotPoliciesMock.mockReturnValue({ data: snapshotPolicies, isLoading: false, error: null })
    useRecoveryAppPoliciesMock.mockReturnValue({ data: recoveryAppPolicies, isLoading: false, error: null })
    useCleanRoomPoliciesMock.mockReturnValue({ data: cleanRoomPolicies, isLoading: false, error: null })
  })

  it('shows resolved policy names in list rows and details for the selected set', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    const listRow = screen.getAllByText('Tier 2 applications')[0]
    expect(listRow).toBeInTheDocument()

    const button = listRow.closest('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    const detail = screen.getByRole('region', { name: 'Selected policy set details' })
    expect(detail).toHaveTextContent('FrequencyEvery 6 hours')
    expect(detail).toHaveTextContent('Retention7 days')
    expect(detail).toHaveTextContent('Snapshot selectionLatest available snapshot')
    expect(detail).toHaveTextContent('Boot verificationYes')
    expect(detail).toHaveTextContent('Remove conflicting target resources before recovery.')
  })

  it('shows referenced policy IDs when policy details cannot be resolved', () => {
    useRecoveryAppPoliciesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Recovery policies unavailable'),
    })

    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    const detail = screen.getByRole('region', { name: 'Selected policy set details' })
    expect(detail).toHaveTextContent('critical-daily-latest')
    expect(detail).toHaveTextContent('Some policy details could not be loaded.')
  })

  it('shows a policy detail loading state without hiding selectable policy sets', () => {
    useSnapshotPoliciesMock.mockReturnValue({ data: undefined, isLoading: true, error: null })

    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading policy details')
    expect(screen.queryByText('All policies resolved')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tier 2 applications/i })).toBeEnabled()
  })

  it('renders each policy set in the list and reports a selection', async () => {
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

    expect(screen.getByText(/Tier 2 applications/i)).toBeInTheDocument()
    expect(screen.getByText(/Tier 3 web/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tier 3 web/i }))
    expect(onSelect).toHaveBeenCalledWith('tier3-web')
  })

  it('marks the selected policy set as pressed in list', () => {
    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Tier 2 applications/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Tier 3 web/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('filters policy sets by search text', async () => {
    const user = userEvent.setup()

    render(
      <RecoveryGroupPolicySetStep
        policySets={policySets}
        isLoading={false}
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'web')

    expect(screen.getByText(/Tier 3 web/i)).toBeInTheDocument()
    expect(screen.queryByText(/Tier 2 applications/i)).not.toBeInTheDocument()
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

  it('shows a loading state instead of the empty state while fetching', () => {
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
})
