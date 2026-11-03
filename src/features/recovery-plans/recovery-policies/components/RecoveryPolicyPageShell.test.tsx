import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecoveryPolicyPageShell } from './RecoveryPolicyPageShell'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const tabs = [
  { value: 'snapshot', label: 'Snapshot' },
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

    fireEvent.click(screen.getByRole('tab', { name: 'Application Recovery' }))
    expect(onTabChange).toHaveBeenCalledWith('application-recovery')
  })

  it('renders tabs with the surface-header recipe', () => {
    render(
      <RecoveryPolicyPageShell
        activeTab="snapshot"
        tabs={tabs}
        onTabChange={vi.fn()}
        title="Recovery Policies"
        description="Manage recovery policies"
        inventoryTitle="Snapshot policies"
        inventoryDescription="Snapshot policy records"
        tabsAriaLabel="Recovery policy types"
      >
        <div>Policy content</div>
      </RecoveryPolicyPageShell>,
    )

    const tabList = screen.getByRole('tablist', { name: 'Recovery policy types' })
    // The shared view owns the background and divider; the tab list inherits its presentation.
    expect(tabList).toHaveClass('w-full', 'shrink-0', 'px-0', 'sm:w-auto')
    expect(tabList).not.toHaveClass('bg-surface', 'border-b')

    const selectedTab = screen.getByRole('tab', { name: 'Snapshot' })
    expect(selectedTab).toHaveClass('after:inset-x-4', 'border-transparent')
    expect(selectedTab).toHaveClass('text-xs', 'py-2.5')
  })
})
