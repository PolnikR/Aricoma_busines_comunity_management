import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { SidebarProvider } from './SidebarContext'
import { AppSidebar } from './AppSidebar'

describe('AppSidebar', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  it('shows Recovery Groups in the Recovery Plans section', async () => {
    render(
      <MemoryRouter initialEntries={['/recovery-plans/recovery-groups']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Recovery Groups' })).toHaveAttribute(
      'href',
      '/recovery-plans/recovery-groups',
    )
  })

  it('highlights the owning submenu item on a nested create route', async () => {
    render(
      <MemoryRouter initialEntries={['/recovery-plans/recovery-applications/create']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const applications = await screen.findByRole('link', { name: 'Recovery Applications' })
    expect(applications).toHaveClass('bg-[#eef2fa]', 'text-[#3566d6]')
  })
})
