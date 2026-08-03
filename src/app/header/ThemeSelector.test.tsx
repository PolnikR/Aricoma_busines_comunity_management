import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ThemeSelector } from './ThemeSelector'

function renderThemeSelector() {
  render(
    <LanguageProvider>
      <ThemeProvider>
        <ThemeSelector />
      </ThemeProvider>
    </LanguageProvider>,
  )
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear()
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

  it('exposes light, dark and system as one accessible choice', async () => {
    renderThemeSelector()

    expect(await screen.findByRole('group', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies and persists the selected theme', async () => {
    const user = userEvent.setup()
    renderThemeSelector()

    await user.click(await screen.findByRole('button', { name: 'Dark' }))

    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('app-theme')).toBe('dark')
  })
})
