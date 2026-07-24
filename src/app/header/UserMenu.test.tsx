import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { UserMenu } from './UserMenu'
import { LanguageProvider } from '@/contexts/LanguageContext'

describe('UserMenu', () => {
  it('renders user badge with initials', () => {
    render(
      <LanguageProvider>
        <UserMenu userInitials="AB" userName="Test User" userTitle="Admin" />
      </LanguageProvider>
    )

    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('toggles dropdown menu on button click', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <UserMenu />
      </LanguageProvider>
    )

    const button = screen.getByRole('button', { expanded: false })

    // Initially dropdown should not be visible
    expect(screen.queryByText('Nastavenia')).not.toBeInTheDocument()

    // Click to open
    await user.click(button)
    expect(screen.getByText('Nastavenia')).toBeInTheDocument()

    // Click to close
    await user.click(button)
    expect(screen.queryByText('Nastavenia')).not.toBeInTheDocument()
  })

  it('displays language options', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <UserMenu />
      </LanguageProvider>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Check all language options are present
    expect(screen.getByText('Angličtina')).toBeInTheDocument()
    expect(screen.getByText('Slovenčina')).toBeInTheDocument()
    expect(screen.getByText('Čeština')).toBeInTheDocument()
  })

  it('closes dropdown after language selection', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <UserMenu />
      </LanguageProvider>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    // Click a language button
    const slovakButton = screen.getAllByText('Slovenčina')[0]!
    await user.click(slovakButton)

    // Dropdown should close
    expect(screen.queryByText('Nastavenia')).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <LanguageProvider>
          <UserMenu />
        </LanguageProvider>
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    expect(screen.getByText('Nastavenia')).toBeInTheDocument()

    // Click outside
    const outside = screen.getByTestId('outside')!
    await user.click(outside)

    expect(screen.queryByText('Nastavenia')).not.toBeInTheDocument()
  })

  it('renders settings and logout buttons', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <UserMenu />
      </LanguageProvider>
    )

    const button = screen.getByRole('button', { expanded: false })
    await user.click(button)

    expect(screen.getByText('Nastavenia')).toBeInTheDocument()
    expect(screen.getByText('Odhlásiť')).toBeInTheDocument()
  })

  it('uses default props when not provided', () => {
    render(
      <LanguageProvider>
        <UserMenu />
      </LanguageProvider>
    )

    expect(screen.getByText('AB')).toBeInTheDocument()
    expect(screen.getByText('ABCO operator')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
  })
})
