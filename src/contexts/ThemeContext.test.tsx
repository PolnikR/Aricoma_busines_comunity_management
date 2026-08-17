import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTheme } from './ThemeContext'
import { ThemeProvider } from './ThemeProvider'

type ThemeListener = (event: MediaQueryListEvent) => void

function installColorSchemePreference(initiallyDark: boolean) {
  let matches = initiallyDark
  const listeners = new Set<ThemeListener>()

  const mediaQuery = {
    get matches() {
      return matches
    },
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, listener: ThemeListener) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: ThemeListener) => {
      listeners.delete(listener)
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as MediaQueryList

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))

  return {
    setDark(nextMatches: boolean) {
      matches = nextMatches
      const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
      listeners.forEach((listener) => {
        listener(event)
      })
    },
  }
}

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <div>
      <output aria-label="theme preference">{theme}</output>
      <output aria-label="resolved theme">{resolvedTheme}</output>
      <button type="button" onClick={() => { setTheme('light') }}>Light</button>
      <button type="button" onClick={() => { setTheme('dark') }}>Dark</button>
      <button type="button" onClick={() => { setTheme('system') }}>System</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses and tracks the operating-system theme when no preference is stored', () => {
    const systemPreference = installColorSchemePreference(true)

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByLabelText('theme preference')).toHaveTextContent('system')
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')

    act(() => {
      systemPreference.setDark(false)
    })

    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('persists an explicit theme and removes the override for system mode', async () => {
    installColorSchemePreference(false)
    const user = userEvent.setup()

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Dark' }))

    expect(localStorage.getItem('app-theme')).toBe('dark')
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'System' }))

    expect(localStorage.getItem('app-theme')).toBeNull()
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('light')
  })

  it('ignores invalid stored values and falls back to system mode', () => {
    localStorage.setItem('app-theme', 'sepia')
    installColorSchemePreference(false)

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByLabelText('theme preference')).toHaveTextContent('system')
    expect(screen.getByLabelText('resolved theme')).toHaveTextContent('light')
  })

  it('requires consumers to be wrapped in ThemeProvider', () => {
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within ThemeProvider',
    )
  })
})
