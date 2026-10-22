import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import {
  getProviderInventoryRevision,
  invalidateProviderInventoryRevision,
  isProviderInventoryRevisionCurrent,
} from './providerInventoryRevision'

describe('provider inventory result validity', () => {
  it('keeps snapshots valid until their provider revision changes', () => {
    const client = new QueryClient()
    const a = getProviderInventoryRevision(client, 'a')
    const b = getProviderInventoryRevision(client, 'b')
    expect(isProviderInventoryRevisionCurrent(client, 'a', a)).toBe(true)

    invalidateProviderInventoryRevision(client, ['a'])

    expect(isProviderInventoryRevisionCurrent(client, 'a', a)).toBe(false)
    expect(isProviderInventoryRevisionCurrent(client, 'b', b)).toBe(true)
    expect(a).toEqual({ providerRevision: 0, infraEpoch: 0 })
    expect(getProviderInventoryRevision(client, 'a')).toEqual({ providerRevision: 1, infraEpoch: 0 })
  })

  it('invalidates every provider on infra fallback without changing per-provider revisions', () => {
    const client = new QueryClient()
    const a = getProviderInventoryRevision(client, 'a')
    const b = getProviderInventoryRevision(client, 'b')

    invalidateProviderInventoryRevision(client)

    expect(isProviderInventoryRevisionCurrent(client, 'a', a)).toBe(false)
    expect(isProviderInventoryRevisionCurrent(client, 'b', b)).toBe(false)
    expect(getProviderInventoryRevision(client, 'a')).toEqual({ providerRevision: 0, infraEpoch: 1 })
    expect(a).toEqual({ providerRevision: 0, infraEpoch: 0 })
  })

  it('accepts new snapshots after repeated invalidation without reviving older snapshots', () => {
    const client = new QueryClient()
    const old = getProviderInventoryRevision(client, 'a')
    invalidateProviderInventoryRevision(client, ['a'])
    const deleted = getProviderInventoryRevision(client, 'a')
    invalidateProviderInventoryRevision(client, ['a'])
    const recreated = getProviderInventoryRevision(client, 'a')

    expect(isProviderInventoryRevisionCurrent(client, 'a', old)).toBe(false)
    expect(isProviderInventoryRevisionCurrent(client, 'a', deleted)).toBe(false)
    expect(isProviderInventoryRevisionCurrent(client, 'a', recreated)).toBe(true)
  })

  it('isolates both revisions and fallback epochs between QueryClients', () => {
    const first = new QueryClient()
    const second = new QueryClient()
    const token = getProviderInventoryRevision(second, 'a')
    invalidateProviderInventoryRevision(first, ['a'])
    invalidateProviderInventoryRevision(first)

    expect(isProviderInventoryRevisionCurrent(second, 'a', token)).toBe(true)
    expect(getProviderInventoryRevision(second, 'a')).toEqual({ providerRevision: 0, infraEpoch: 0 })
  })
})
