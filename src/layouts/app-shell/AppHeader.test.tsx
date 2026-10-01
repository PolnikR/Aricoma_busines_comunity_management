import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from './SidebarContext'
import { AppHeader } from './AppHeader'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/app/header/UserMenu', () => ({ UserMenu: () => <div data-testid="user-menu" /> }))

function renderHeader() {
  return render(
    <SidebarProvider>
      <AppHeader />
    </SidebarProvider>,
  )
}

describe('AppHeader', () => {
  it('keeps the user menu and mobile sidebar toggle without a global search', () => {
    renderHeader()

    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle sidebar' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('uses the compact 56px bar height at every breakpoint', () => {
    renderHeader()

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('h-14')
    expect(header.className).not.toMatch(/lg:h-/)
  })
})
