import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterTabs } from './FilterTabs'

const tabs = [
  { value: 'manage', label: 'Manage' },
  { value: 'configure', label: 'Configure' },
]

describe('FilterTabs', () => {
  it('exposes a single tab stop for the selected tab', () => {
    render(<FilterTabs tabs={tabs} value="manage" onChange={vi.fn()} ariaLabel="Groups" />)

    expect(screen.getByRole('tab', { name: 'Manage' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Configure' })).toHaveAttribute('tabindex', '-1')
  })

  it.each([
    ['ArrowRight', 'configure'],
    ['ArrowLeft', 'configure'],
    ['End', 'configure'],
    ['Home', 'manage'],
  ])('supports %s keyboard navigation', async (key, expectedValue) => {
    const onChange = vi.fn()
    render(<FilterTabs tabs={tabs} value="manage" onChange={onChange} ariaLabel="Groups" />)
    const manageTab = screen.getByRole('tab', { name: 'Manage' })
    manageTab.focus()

    await userEvent.keyboard(`{${key}}`)

    expect(onChange).toHaveBeenCalledWith(expectedValue)
    expect(screen.getByRole('tab', { name: expectedValue === 'manage' ? 'Manage' : 'Configure' })).toHaveFocus()
  })
})
