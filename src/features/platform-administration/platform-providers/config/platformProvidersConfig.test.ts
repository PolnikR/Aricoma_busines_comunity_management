import { describe, expect, it } from 'vitest'
import { PLATFORM_PROVIDERS_CONFIG } from './platformProvidersConfig'

describe('PLATFORM_PROVIDERS_CONFIG', () => {
  it('defines the temporary default port and valid port range', () => {
    expect(PLATFORM_PROVIDERS_CONFIG.connection.defaultPort).toBe(22)
    expect(PLATFORM_PROVIDERS_CONFIG.connection.minPort).toBe(1)
    expect(PLATFORM_PROVIDERS_CONFIG.connection.maxPort).toBe(65_535)
  })
})
