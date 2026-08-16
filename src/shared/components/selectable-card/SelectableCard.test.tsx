import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectableCard } from './SelectableCard'

describe('SelectableCard', () => {
  it('renders optional supporting content inside the card', () => {
    render(
      <SelectableCard
        selected={false}
        title="Tier 2 applications"
        description="Medium-tier protection"
        supportingContent={<span>Snapshot policy: Medium — 6h</span>}
      />,
    )

    expect(screen.getByText('Snapshot policy: Medium — 6h')).toBeInTheDocument()
  })

  it('exposes selection state and supports keyboard activation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SelectableCard
        selected
        title="VMware"
        description="Virtual machines"
        meta="Resource type: VM"
        icon={<span>VMware logo</span>}
        onClick={onClick}
      />,
    )

    const card = screen.getByRole('button', { name: /VMware/ })
    expect(card).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Resource type: VM')).toBeInTheDocument()
    expect(screen.getByTestId('selectable-card-logo')).toHaveTextContent('VMware logo')
    card.focus()
    await user.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not activate a disabled card', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <SelectableCard
        disabled
        selected={false}
        title="Oracle"
        description="Support will be added later"
        onClick={onClick}
      />,
    )

    const card = screen.getByRole('button', { name: /Oracle/ })
    expect(card).toBeDisabled()
    await user.click(card)
    expect(onClick).not.toHaveBeenCalled()
  })
})
