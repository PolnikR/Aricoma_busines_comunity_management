import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { UserMenu } from './UserMenu'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'

const authenticatedUser: AuthContextValue = {
  status: 'authenticated',
  user: {
    id: 'user-123',
    username: 'jane.doe',
    displayName: 'Jane Doe',
    email: 'jane.doe@example.com',
    initials: 'JD',
  },
}

function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </LanguageProvider>
  )
}

describe('UserMenu', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
  })

  it('renders user badge with initials', () => {
    render(
      <TestProviders>
        <UserMenu userInitials="AB" userName="Test User" userTitle="Admin" />
      </TestProviders>
    )

    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('toggles dropdown menu on button click', async () => {
    const user = userEvent.setup()
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>
    )

    const button = screen.getByRole('button', { expanded: false })

    // Initially dropdown should not be visible
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()

    // Click to open
    await user.click(button)
    expect(await screen.findByText('Settings')).toBeInTheDocument()

    // Click to close
    await user.click(button)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('displays language options', async () => {
    const user = userEvent.setup()
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Check all language options are present
    expect(await screen.findByText('English')).toBeInTheDocument()
    expect(screen.getByText('Slovak')).toBeInTheDocument()
    expect(screen.getByText('Czech')).toBeInTheDocument()
  })

  it('displays the appearance selector', async () => {
    const user = userEvent.setup()
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>,
    )

    await user.click(screen.getByRole('button', { expanded: false }))

    expect(await screen.findByRole('group', { name: 'Appearance' })).toBeInTheDocument()
  })

  it('closes dropdown after language selection', async () => {
    const user = userEvent.setup()
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Click a language button
    const slovakButton = (await screen.findAllByText('Slovak')).at(0)
    if (!slovakButton) {
      throw new Error('Slovak language option was not rendered')
    }
    await user.click(slovakButton)

    // Dropdown should close
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <TestProviders>
          <UserMenu />
        </TestProviders>
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    expect(await screen.findByText('Settings')).toBeInTheDocument()

    // Click outside
    const outside = screen.getByTestId('outside')
    await user.click(outside)

    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('renders settings and logout buttons', async () => {
    const user = userEvent.setup()
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    expect(await screen.findByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('uses default props when not provided', () => {
    render(
      <TestProviders>
        <UserMenu />
      </TestProviders>
    )

    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('ABCO operator')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
  })

  it('renders the authenticated Keycloak profile when props are omitted', () => {
    render(
      <TestProviders>
        <AuthContext.Provider value={authenticatedUser}>
          <UserMenu />
        </AuthContext.Provider>
      </TestProviders>,
    )

    expect(screen.getByText('JD')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument()
  })
})
