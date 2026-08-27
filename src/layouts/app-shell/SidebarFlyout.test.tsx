import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { SidebarFlyout } from './SidebarFlyout'

const items = [
  { name: 'Recovery Groups', path: '/recovery-plans/recovery-groups' },
  { name: 'Recovery Runs', path: '/recovery-plans/recovery-runs' },
]

function renderFlyout(props: Partial<Parameters<typeof SidebarFlyout>[0]> = {}) {
  return render(
    <MemoryRouter>
      <SidebarFlyout
        title="Recovery Plans"
        items={items}
        isItemActive={() => false}
        onNavigate={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('SidebarFlyout', () => {
  it('links every submenu item', () => {
    renderFlyout()

    expect(screen.getByRole('link', { name: 'Recovery Groups' })).toHaveAttribute(
      'href',
      '/recovery-plans/recovery-groups',
    )
    expect(screen.getByRole('link', { name: 'Recovery Runs' })).toHaveAttribute(
      'href',
      '/recovery-plans/recovery-runs',
    )
  })

  it('highlights the active item', () => {
    renderFlyout({ isItemActive: (path) => path === '/recovery-plans/recovery-runs' })

    expect(screen.getByRole('link', { name: 'Recovery Runs' })).toHaveClass('bg-accent-soft', 'text-accent')
    expect(screen.getByRole('link', { name: 'Recovery Groups' })).not.toHaveClass('bg-accent-soft')
  })

  it('shows only the label when the entry has no submenu', () => {
    renderFlyout({ items: [], title: 'Recovery Actions' })

    expect(screen.getByText('Recovery Actions')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('reports navigation so the mobile drawer can close', async () => {
    const onNavigate = vi.fn()
    const user = userEvent.setup()
    renderFlyout({ onNavigate })

    await user.click(screen.getByRole('link', { name: 'Recovery Groups' }))

    expect(onNavigate).toHaveBeenCalled()
  })

  it('releases focus on Escape so the flyout can close', async () => {
    const user = userEvent.setup()
    renderFlyout()

    const link = screen.getByRole('link', { name: 'Recovery Groups' })
    link.focus()
    expect(link).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(link).not.toHaveFocus()
  })
})
