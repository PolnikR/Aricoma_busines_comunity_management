import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelectDropdown } from './MultiSelectDropdown'

describe('MultiSelectDropdown', () => {
  it('keeps selected values visible when they are missing from the current options', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiSelectDropdown
        options={['available-tag']}
        selected={['saved-tag']}
        onChange={onChange}
      />,
    )

    expect(screen.getByText('saved-tag')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove saved-tag' }))

    expect(onChange).toHaveBeenCalledWith([])
  })

  it('does not open or remove values when disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <MultiSelectDropdown
        options={['available-tag']}
        selected={['saved-tag']}
        onChange={onChange}
        disabled
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Select tags' })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')

    await user.click(trigger)

    expect(screen.queryByText('available-tag')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })
})
