import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildProviderFilterSessionKey,
  clearProviderFilterSnapshot,
  readProviderFilterSnapshot,
  writeProviderFilterSnapshot,
  type ProviderFilterScope,
  type ProviderFilterSnapshot,
} from './providerFilterSession'

const scope: ProviderFilterScope = {
  role: 'source',
  resourceTab: 'vmware',
  providerId: 'provider-1',
}

const emptyVmwareSnapshot: ProviderFilterSnapshot = {
  resourceTab: 'vmware',
  initialized: true,
  filters: {
    search: '',
    powerState: '',
    connectionState: '',
    cluster: '',
    tags: [],
    untagged: false,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('provider filter session', () => {
  it('isolates keys by role, resource tab, and provider', () => {
    expect(buildProviderFilterSessionKey(scope)).not.toBe(
      buildProviderFilterSessionKey({ ...scope, role: 'target' }),
    )
    expect(buildProviderFilterSessionKey(scope)).not.toBe(
      buildProviderFilterSessionKey({ ...scope, resourceTab: 'flashsystem' }),
    )
    expect(buildProviderFilterSessionKey(scope)).not.toBe(
      buildProviderFilterSessionKey({ ...scope, providerId: 'provider-2' }),
    )
  })

  it('round trips an explicitly empty VMware snapshot', () => {
    const storage = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    } as Storage

    writeProviderFilterSnapshot(scope, emptyVmwareSnapshot, sessionStorage)

    expect(readProviderFilterSnapshot(scope, sessionStorage)).toEqual(emptyVmwareSnapshot)
  })

  it('round trips FlashSystem and IBM Power snapshots with their own types', () => {
    const storage = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    } as Storage

    const flashsystemScope = { ...scope, resourceTab: 'flashsystem' as const }
    const powerScope = { ...scope, resourceTab: 'ibm-power' as const }
    const flashsystemSnapshot: ProviderFilterSnapshot = {
      resourceTab: 'flashsystem',
      initialized: true,
      filters: { search: 'array', poolId: 'pool-1', hostId: 'host-1', status: 'online' },
    }
    const powerSnapshot: ProviderFilterSnapshot = {
      resourceTab: 'ibm-power',
      initialized: true,
      filters: {
        search: 'power',
        partitionKind: 'lpar',
        partitionState: 'running',
        operatingSystemType: 'AIX',
        volumeState: 'available',
      },
    }

    writeProviderFilterSnapshot(flashsystemScope, flashsystemSnapshot, sessionStorage)
    writeProviderFilterSnapshot(powerScope, powerSnapshot, sessionStorage)

    expect(readProviderFilterSnapshot(flashsystemScope, sessionStorage)).toEqual(flashsystemSnapshot)
    expect(readProviderFilterSnapshot(powerScope, sessionStorage)).toEqual(powerSnapshot)
  })

  it('returns no snapshot for invalid JSON or mismatched type/version', () => {
    const storage = new Map<string, string>()
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } as Storage
    const key = buildProviderFilterSessionKey(scope)

    storage.set(key, 'not valid json')
    expect(readProviderFilterSnapshot(scope, sessionStorage)).toBeUndefined()

    storage.set(key, JSON.stringify({ schemaVersion: 1, snapshot: { ...emptyVmwareSnapshot, resourceTab: 'flashsystem' } }))
    expect(readProviderFilterSnapshot(scope, sessionStorage)).toBeUndefined()

    storage.set(key, JSON.stringify({ schemaVersion: 999, snapshot: emptyVmwareSnapshot }))
    expect(readProviderFilterSnapshot(scope, sessionStorage)).toBeUndefined()
  })

  it('does not throw when storage is blocked', () => {
    const blockedStorage = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    } as Storage

    expect(() => readProviderFilterSnapshot(scope, blockedStorage)).not.toThrow()
    expect(readProviderFilterSnapshot(scope, blockedStorage)).toBeUndefined()
    expect(() => { writeProviderFilterSnapshot(scope, emptyVmwareSnapshot, blockedStorage) }).not.toThrow()
    expect(() => { clearProviderFilterSnapshot(scope, blockedStorage) }).not.toThrow()
  })

  it('does not throw when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined)

    expect(() => readProviderFilterSnapshot(scope)).not.toThrow()
    expect(readProviderFilterSnapshot(scope)).toBeUndefined()
    expect(() => { writeProviderFilterSnapshot(scope, emptyVmwareSnapshot) }).not.toThrow()
    expect(() => { clearProviderFilterSnapshot(scope) }).not.toThrow()
  })
})
