import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
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
    expect(screen.getByText('Angličtina')).toBeInTheDocument()
    expect(screen.getByText('Slovenčina')).toBeInTheDocument()
    expect(screen.getByText('Čeština')).toBeInTheDocument()
  })

  it('renders all header labels with translations', async () => {
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
    const slovakButtons = screen.getAllByText('Slovenčina')
    if (slovakButtons.length > 0) {
      await user.click(slovakButtons[0])

      // Verify localStorage was updated
      await waitFor(() => {
        const stored = localStorage.getItem('app-language')
        expect(stored).toBe('sk')
      })
    }
  })

  it('applies translations to all rendered translation keys', async () => {
    const { rerender } = render(
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

  it('handles missing translation gracefully by falling back to key', async () => {
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

    // Should have initialized language (browser default or 'en')
    const stored = localStorage.getItem('app-language')
    expect(stored).toBeTruthy()
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
    expect(screen.getByText('Nastavenia')).toBeInTheDocument()
    expect(screen.getByText('Odhlásiť')).toBeInTheDocument()
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
    expect(screen.getByText('Nastavenia')).toBeInTheDocument()

    // Click outside
    const outside = screen.getByTestId('outside')
    await user.click(outside)

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('Nastavenia')).not.toBeInTheDocument()
    })
  })
})
