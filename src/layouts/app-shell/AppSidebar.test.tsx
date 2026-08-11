import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
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

    expect(await screen.findByRole('link', { name: 'Recovery Groups' }, { timeout: 5000 })).toHaveAttribute(
      'href',
      '/recovery-plans/recovery-groups',
    )
  })

  it('links Snapshot Policies from the Recovery Plans section', async () => {
    render(
      <MemoryRouter initialEntries={['/recovery-plans/snapshot-policies']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Snapshot Policies' })).toHaveAttribute(
      'href',
      '/recovery-plans/snapshot-policies',
    )
  })

  it('links Recovery App Policies from the Recovery Plans section', async () => {
    render(
      <MemoryRouter initialEntries={['/recovery-plans/recovery-app-policies']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Recovery App Policies' })).toHaveAttribute(
      'href',
      '/recovery-plans/recovery-app-policies',
    )
  })

  it('links Resources to the consolidated inventory page', async () => {
    render(
      <MemoryRouter initialEntries={['/discovery-inventory/resources']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('link', { name: 'Resources' }, { timeout: 5000 })).toHaveAttribute(
      'href',
      '/discovery-inventory/resources',
    )
  })

  it('links Platform Providers from Platform Administration', async () => {
    render(
      <MemoryRouter initialEntries={['/platform-administration/platform-providers']}>
        <LanguageProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </LanguageProvider>
      </MemoryRouter>,
    )

    const link = await screen.findByRole('link', { name: 'Platform Providers' })
    expect(link).toHaveAttribute('href', '/platform-administration/platform-providers')
    expect(link).toHaveClass('bg-accent-soft', 'text-accent')
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

    const applications = await screen.findByRole(
      'link',
      { name: 'Recovery Applications' },
      { timeout: 5000 },
    )
    expect(applications).toHaveClass('bg-accent-soft', 'text-accent')
  })
})
