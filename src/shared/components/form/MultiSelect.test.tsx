import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from '@/shared/components/modal/Modal'
import { MultiSelect } from './MultiSelect'

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState<string[]>([])
  return <MultiSelect id="storage" label="Storage" value={value} onChange={setValue}
    options={[{ value: 'a', label: 'Array A' }, { value: 'b', label: 'Array B' }]}
    placeholder="Select storage" emptyText="No storage" disabled={disabled} />
}

describe('MultiSelect', () => {
  it('selects multiple values by keyboard, removes a value and closes with Escape', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.tab()
    await user.keyboard('{Enter}')
    await user.tab()
    await user.keyboard(' ')
    await user.tab()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Array A' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Array B' })).toBeChecked()
    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Array B' })).not.toBeChecked()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Storage' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Storage' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Storage' })).toHaveTextContent('Array A')
  })

  it('floats outside the modal and preserves checkbox tab order and dismissal', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Edit provider"><Example /><button type="button">Next field</button></Modal>)
    const dialog = screen.getByRole('dialog')
    const trigger = screen.getByRole('button', { name: 'Storage' })
    await user.click(trigger)
    const panel = screen.getByRole('group', { name: 'Storage' })
    expect(panel.parentElement).toBe(document.body)
    expect(dialog).not.toContainElement(panel)
    expect(panel).toHaveClass('fixed', 'z-[60]')
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Array A' })).toHaveFocus()
    await user.keyboard(' ')
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Next field' })).toHaveFocus()
    expect(screen.queryByRole('group', { name: 'Storage' })).not.toBeInTheDocument()
    await user.click(trigger)
    await user.tab()
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveTextContent('Array A')
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Next field' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('cannot open while disabled', async () => {
    render(<Example disabled />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
