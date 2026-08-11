import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryPolicyPageShell } from './RecoveryPolicyPageShell'

const tabs = [
  { value: 'snapshot', label: 'Snapshot' },
  { value: 'validation', label: 'Validation' },
  { value: 'application-recovery', label: 'Application Recovery' },
] as const

describe('RecoveryPolicyPageShell', () => {
  it('renders shared navigation and delegates tab changes', () => {
    const onTabChange = vi.fn()

    render(
      <RecoveryPolicyPageShell
        activeTab="snapshot"
        tabs={tabs}
        onTabChange={onTabChange}
        eyebrow="Recovery Plans"
        title="Recovery Policies"
        description="Manage recovery policies"
        inventoryTitle="Snapshot policies"
        inventoryDescription="Snapshot policy records"
        tabsAriaLabel="Recovery policy types"
      >
        <div>Policy content</div>
      </RecoveryPolicyPageShell>,
    )

    expect(screen.getByRole('heading', { name: 'Recovery Policies' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Snapshot' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Policy content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Validation' }))
    expect(onTabChange).toHaveBeenCalledWith('validation')
  })
})
