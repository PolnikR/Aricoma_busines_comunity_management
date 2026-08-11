import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WorkspaceTabs } from './WorkspaceTabs'

const items = [
  { value: 'validate', label: 'Validate', description: 'Check recovery readiness' },
  { value: 'execute', label: 'Execute', description: 'Start a recovery test' },
  { value: 'history', label: 'History', description: 'Review test evidence' },
] as const

describe('WorkspaceTabs', () => {
  it('renders action cards with the selected state and changes on click', () => {
    const onChange = vi.fn()
    render(<WorkspaceTabs items={items} value="validate" onChange={onChange} ariaLabel="Recovery actions" />)

    expect(screen.getByRole('tab', { name: /Validate.*Check recovery readiness/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /Execute.*Start a recovery test/ }))
    expect(onChange).toHaveBeenCalledWith('execute')
  })

  it('moves focus and selects the next enabled card with arrow keys', () => {
    const onChange = vi.fn()
    render(<WorkspaceTabs items={items} value="validate" onChange={onChange} ariaLabel="Recovery actions" />)

    const validate = screen.getByRole('tab', { name: /Validate.*Check recovery readiness/ })
    validate.focus()
    fireEvent.keyDown(validate, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: /Execute.*Start a recovery test/ })).toHaveFocus()
    expect(onChange).toHaveBeenCalledWith('execute')
  })

  it('skips disabled cards during keyboard navigation', () => {
    const onChange = vi.fn()
    render(
      <WorkspaceTabs
        items={[items[0], { ...items[1], disabled: true }, items[2]]}
        value="validate"
        onChange={onChange}
        ariaLabel="Recovery actions"
      />,
    )

    const validate = screen.getByRole('tab', { name: /Validate.*Check recovery readiness/ })
    validate.focus()
    fireEvent.keyDown(validate, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: /History.*Review test evidence/ })).toHaveFocus()
    expect(onChange).toHaveBeenCalledWith('history')
  })
})
