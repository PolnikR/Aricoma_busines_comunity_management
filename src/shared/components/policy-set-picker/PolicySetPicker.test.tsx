import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PolicySetRecordOutput } from '@/generated/query/zod'
import { PolicySetPicker } from './PolicySetPicker'

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

const policySets: PolicySetRecordOutput[] = [
  {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    snapshot_policy_id: 'medium-6h',
    recovery_app_policy_id: 'critical-daily-latest',
    clean_room_policy_id: 'enforce-clean-target',
  },
  {
    id: 'tier3-web',
    name: 'Tier 3 web',
    description: 'Low priority web tier.',
    snapshot_policy_id: 'low-24h',
    recovery_app_policy_id: 'high-weekly-timerange',
    clean_room_policy_id: 'block-on-conflict',
  },
]

const snapshotPolicies = [
  {
    id: 'medium-6h',
    name: 'Medium — 6h',
    description: 'Medium-tier snapshot cadence.',
    level: 'medium',
    frequency_value: 6,
    frequency_unit: 'hours',
    retention_value: 7,
    retention_unit: 'days',
    max_snapshots: null,
    enabled: true,
  },
  {
    id: 'low-24h',
    name: 'Low — 24h',
    description: 'Daily snapshot cadence.',
    level: 'low',
    frequency_value: 24,
    frequency_unit: 'hours',
    retention_value: 30,
    retention_unit: 'days',
    max_snapshots: null,
    enabled: true,
  },
] as const

const recoveryAppPolicies = [
  {
    id: 'critical-daily-latest',
    name: 'Critical — Daily DR Test',
    description: 'Daily recovery validation.',
    level: 'critical',
    frequency_value: 1,
    frequency_unit: 'days',
    retention_value: 4,
    retention_unit: 'hours',
    boot_verify: true,
    snapshot_selection_mode: 'latest',
    snapshot_max_age_value: null,
    snapshot_max_age_unit: null,
    snapshot_target_time: null,
    enabled: true,
  },
  {
    id: 'high-weekly-timerange',
    name: 'High — Weekly DR Test',
    description: 'Weekly recovery validation.',
    level: 'high',
    frequency_value: 7,
    frequency_unit: 'days',
    retention_value: 1,
    retention_unit: 'days',
    boot_verify: true,
    snapshot_selection_mode: 'time_range',
    snapshot_max_age_value: 2,
    snapshot_max_age_unit: 'hours',
    snapshot_target_time: null,
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

describe('PolicySetPicker', () => {
  beforeEach(() => {
    useSnapshotPoliciesMock.mockReturnValue({ data: snapshotPolicies, isLoading: false, error: null })
    useRecoveryAppPoliciesMock.mockReturnValue({ data: recoveryAppPolicies, isLoading: false, error: null })
    useCleanRoomPoliciesMock.mockReturnValue({ data: cleanRoomPolicies, isLoading: false, error: null })
  })

  it('shows resolved policy names in list rows and details for the selected set', () => {
    render(
      <PolicySetPicker
        policySets={policySets}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    const listRows = screen.getAllByText('Tier 2 applications')
    expect(listRows.length).toBeGreaterThan(0)

    const button = listRows[0]?.closest('button')
    expect(button).toHaveAttribute('aria-pressed', 'true')

    const detail = screen.getByRole('region', { name: 'Selected policy set details' })
    expect(detail).toHaveTextContent('FrequencyEvery 6 hours')
    expect(detail).toHaveTextContent('Retention7 days')
    expect(detail).toHaveTextContent('Snapshot selectionLatest available snapshot')
    expect(detail).toHaveTextContent('Boot verificationYes')
    expect(detail).toHaveTextContent('Remove conflicting target resources before recovery.')
  })

  it('keeps the policy detail panel visible below the lg breakpoint', () => {
    render(
      <PolicySetPicker
        policySets={policySets}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    const detail = screen.getByRole('region', { name: 'Selected policy set details' })
    const detailWrapper = detail.parentElement
    const catalogueContainer = detailWrapper?.parentElement

    expect(detailWrapper).not.toHaveClass('hidden')
    expect(catalogueContainer).toHaveClass('flex-col')
  })

  it('renders one icon per policy type in the detail panel', () => {
    render(
      <PolicySetPicker
        policySets={policySets}
        selectedPolicySetId="tier2-apps"
        onSelect={vi.fn()}
      />,
    )

    const detail = screen.getByRole('region', { name: 'Selected policy set details' })
    const icons = detail.querySelectorAll('svg[aria-hidden="true"]')
    expect(icons).toHaveLength(3)
  })

  it('shows referenced policy IDs when policy details cannot be resolved', () => {
    useRecoveryAppPoliciesMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('Recovery policies unavailable'),
    })

    render(
      <PolicySetPicker
        policySets={policySets}
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
      <PolicySetPicker
        policySets={policySets}
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
      <PolicySetPicker
        policySets={policySets}
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
      <PolicySetPicker
        policySets={policySets}
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
      <PolicySetPicker
        policySets={policySets}
        selectedPolicySetId={null}
        onSelect={vi.fn()}
      />,
    )

    const searchInput = screen.getByRole('searchbox')
    await user.type(searchInput, 'web')

    expect(screen.getByText(/Tier 3 web/i)).toBeInTheDocument()
    expect(screen.queryByText(/Tier 2 applications/i)).not.toBeInTheDocument()
  })
})
