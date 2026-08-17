import { describe, expect, it } from 'vitest'

const providerModules = import.meta.glob<Record<string, unknown>>(
  './*Provider.tsx',
  { eager: true },
)

describe('Fast Refresh provider boundaries', () => {
  it('exposes LanguageProvider from a component-only module', () => {
    expect(Object.keys(providerModules['./LanguageProvider.tsx'] ?? {})).toEqual([
      'LanguageProvider',
    ])
  })

  it('exposes ThemeProvider from a component-only module', () => {
    expect(Object.keys(providerModules['./ThemeProvider.tsx'] ?? {})).toEqual([
      'ThemeProvider',
    ])
  })

  it('exposes UserProvider from a component-only module', () => {
    expect(Object.keys(providerModules['./UserProvider.tsx'] ?? {})).toEqual([
      'UserProvider',
    ])
  })
})
