import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const policySets: PolicySet[] = [
  {
    id: 'tier2-apps',
    name: 'Tier 2 applications',
    description: 'Policy set using the medium-tier, 6-hour cadence.',
    policyIds: ['medium-6h'],
  },
  {
    id: 'tier3-web',
    name: 'Tier 3 web',
    description: 'Low priority web tier.',
    policyIds: ['low-24h', 'low-48h'],
  },
]

describe('RecoveryGroupPolicySetStep', () => {
  it('renders each policy set and reports a selection', async () => {
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

    expect(screen.getByRole('button', { name: /Tier 2 applications/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tier 3 web/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tier 3 web/i }))
    expect(onSelect).toHaveBeenCalledWith('tier3-web')
  })

  it('marks the selected policy set as pressed', () => {
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
