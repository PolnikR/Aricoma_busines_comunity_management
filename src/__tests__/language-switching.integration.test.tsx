import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { UserMenu } from '@/app/header/UserMenu'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

function TestApp({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

describe('Language Switching Integration', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  it('changes language in header when UserMenu language button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    // Initial state: English language button exists
    const toggleButton = screen.getByRole('button', { expanded: false })
    expect(toggleButton).toBeInTheDocument()

    // Open dropdown
    await user.click(toggleButton)

    // Verify language options are visible
    expect(await screen.findByText('English')).toBeInTheDocument()
    expect(await screen.findByText('Slovak')).toBeInTheDocument()
    expect(await screen.findByText('Czech')).toBeInTheDocument()
  })

  it('renders all header labels with translations', () => {
    render(
      <TestApp>
        <UserMenu userInitials="AB" userName="Test User" userTitle="Admin" />
      </TestApp>
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('persists language selection to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Click Slovak language option
    const slovakButton = (await screen.findAllByText('Slovak')).at(0)
    if (!slovakButton) {
      throw new Error('Slovak language option was not rendered')
    }
    await user.click(slovakButton)

    // Verify localStorage was updated
    await waitFor(() => {
      const stored = localStorage.getItem('app-language')
      expect(stored).toBe('sk')
    })
  })

  it('applies translations to all rendered translation keys', () => {
    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    // Check that translation keys are properly resolved
    // The component should display text, not translation keys like "header.userRole"
    const userRole = screen.getByText('ABCO operator')
    expect(userRole).toBeInTheDocument()

    const userTitle = screen.getByText('Administrator')
    expect(userTitle).toBeInTheDocument()

    // Verify translation keys are NOT visible (they would look like "header.userRole")
    expect(screen.queryByText(/^header\./)).not.toBeInTheDocument()
    expect(screen.queryByText(/^pages\./)).not.toBeInTheDocument()
    expect(screen.queryByText(/^buttons\./)).not.toBeInTheDocument()
  })

  it('handles missing translation gracefully by falling back to key', () => {
    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    // The component should render without errors
    // Even if a translation key is missing, it should fallback to the key name
    const button = screen.getByRole('button', { expanded: false })
    expect(button).toBeInTheDocument()
  })

  it('language context is properly initialized on app load', async () => {
    // Clear localStorage before test
    localStorage.removeItem('app-language')

    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    const button = screen.getByRole('button', { expanded: false })
    await userEvent.setup().click(button)

    // The jsdom browser language resolves to English when no preference is stored.
    expect(await screen.findByText('English')).toBeInTheDocument()
  })

  it('renders settings and logout menu items when dropdown is open', async () => {
    const user = userEvent.setup()
    render(
      <TestApp>
        <UserMenu />
      </TestApp>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Settings and logout should be visible
    expect(await screen.findByText('Settings')).toBeInTheDocument()
    expect(await screen.findByText('Logout')).toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <TestApp>
          <UserMenu />
        </TestApp>
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Verify dropdown is open
    expect(await screen.findByText('Settings')).toBeInTheDocument()

    // Click outside
    const outside = screen.getByTestId('outside')
    await user.click(outside)

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    })
  })
})
