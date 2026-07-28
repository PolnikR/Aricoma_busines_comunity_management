import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectableCard } from './SelectableCard'

describe('SelectableCard', () => {
  it('exposes selection state and supports keyboard activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SelectableCard
        selected
        title="VMware"
        description="Virtual machines"
        onClick={onClick}
      />,
    )

    const card = screen.getByRole('button', { name: /VMware/ })
    expect(card).toHaveAttribute('aria-pressed', 'true')
    card.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })
})
