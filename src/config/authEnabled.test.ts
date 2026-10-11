import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAuthEnabled } from './authEnabled'

describe('isAuthEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps auth enabled when window is unavailable in Node.js', () => {
    vi.stubGlobal('window', undefined)

    expect(isAuthEnabled()).toBe(true)
  })

  it('keeps auth enabled when runtime config is missing', () => {
    vi.stubGlobal('window', {})

    expect(isAuthEnabled()).toBe(true)
  })

  it('disables auth only for the literal string false', () => {
    vi.stubGlobal('window', { __APP_CONFIG__: { AUTH_ENABLED: 'false' } })
    expect(isAuthEnabled()).toBe(false)

    vi.stubGlobal('window', { __APP_CONFIG__: { AUTH_ENABLED: 'true' } })
    expect(isAuthEnabled()).toBe(true)
  })
})
