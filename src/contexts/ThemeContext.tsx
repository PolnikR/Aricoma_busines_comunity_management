import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

interface ThemeProviderProps {
  children: ReactNode
}

const THEME_STORAGE_KEY = 'app-theme'
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function isThemePreference(value: string | null): value is Exclude<ThemePreference, 'system'> {
  return value === 'light' || value === 'dark'
}

function getInitialTheme(): ThemePreference {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(storedTheme) ? storedTheme : 'system'
  } catch {
    return 'system'
  }
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light'
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset['theme'] = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(getInitialTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_MODE_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme)

    try {
      if (nextTheme === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY)
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      }
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, [])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [resolvedTheme, setTheme, theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}
