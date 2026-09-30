import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
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

  it('cannot open while disabled', async () => {
    render(<Example disabled />)
    await userEvent.setup().click(screen.getByRole('button'))
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
