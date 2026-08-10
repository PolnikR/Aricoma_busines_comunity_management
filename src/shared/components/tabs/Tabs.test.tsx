import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
] as const

describe('Tabs', () => {
  it('exposes the selected tab and changes it on click', () => {
    const onChange = vi.fn()
    render(<Tabs items={items} value="overview" onChange={onChange} ariaLabel="Sections" />)

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
    expect(onChange).toHaveBeenCalledWith('details')
  })

  it('supports arrow-key navigation', () => {
    const onChange = vi.fn()
    render(<Tabs items={items} value="overview" onChange={onChange} ariaLabel="Sections" />)

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('details')
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
  })
})
