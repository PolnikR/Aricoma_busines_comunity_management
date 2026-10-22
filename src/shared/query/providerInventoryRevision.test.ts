import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import {
  beginProviderInventoryMutation,
  getProviderInventoryRevision,
  invalidateProviderInventoryRevision,
  isProviderInventoryRevisionCurrent,
  isProviderInventoryDeleted,
  subscribeProviderInventoryDeleted,
} from './providerInventoryRevision'

describe('provider inventory result validity', () => {
  it('publishes delete and completed recreate only to the affected provider and client', () => {
    const client = new QueryClient()
    const otherClient = new QueryClient()
    const affected = vi.fn()
    const otherId = vi.fn()
    const other = vi.fn()
    const unsubscribe = subscribeProviderInventoryDeleted(client, 'a', affected)
    const unsubscribeId = subscribeProviderInventoryDeleted(client, 'b', otherId)
    const unsubscribeOther = subscribeProviderInventoryDeleted(otherClient, 'a', other)
    expect(isProviderInventoryDeleted(client, 'a')).toBe(false)
    beginProviderInventoryMutation(client, 'a', true).complete()
    expect(isProviderInventoryDeleted(client, 'a')).toBe(true)
    expect(isProviderInventoryDeleted(client, 'b')).toBe(false)
    expect(isProviderInventoryDeleted(otherClient, 'a')).toBe(false)
    expect(affected).toHaveBeenCalledTimes(1)
    const recreate = beginProviderInventoryMutation(client, 'a', false)
    expect(isProviderInventoryDeleted(client, 'a')).toBe(true)
    recreate.complete()
    expect(isProviderInventoryDeleted(client, 'a')).toBe(false)
    expect(affected).toHaveBeenCalledTimes(2)
    expect(otherId).not.toHaveBeenCalled()
    expect(other).not.toHaveBeenCalled()
    unsubscribe()
    unsubscribe()
    beginProviderInventoryMutation(client, 'a', true)
    expect(affected).toHaveBeenCalledTimes(2)
    unsubscribeId()
    unsubscribeOther()
  })

  it('does not let an older submit clear a newer delete, including repeated deletes', () => {
    const client = new QueryClient()
    beginProviderInventoryMutation(client, 'a', true)
    const submit = beginProviderInventoryMutation(client, 'a', false)
    const latestDelete = beginProviderInventoryMutation(client, 'a', true)
    submit.complete()
    expect(submit.isCurrent()).toBe(false)
    expect(latestDelete.isCurrent()).toBe(true)
    expect(isProviderInventoryDeleted(client, 'a')).toBe(true)
  })

  it('invalidates an older delete operation when a newer recreate begins', () => {
    const client = new QueryClient()
    const oldDelete = beginProviderInventoryMutation(client, 'a', true)
    const recreate = beginProviderInventoryMutation(client, 'a', false)
    expect(oldDelete.isCurrent()).toBe(false)
    recreate.complete()
    expect(isProviderInventoryDeleted(client, 'a')).toBe(false)
    oldDelete.complete()
    expect(isProviderInventoryDeleted(client, 'a')).toBe(false)
  })

  it('keeps lifecycle identity independent of credential revisions and epochs', () => {
    const client = new QueryClient()
    beginProviderInventoryMutation(client, 'a', true)
    const recreate = beginProviderInventoryMutation(client, 'a', false)
    invalidateProviderInventoryRevision(client, ['a'])
    invalidateProviderInventoryRevision(client)
    expect(isProviderInventoryDeleted(client, 'a')).toBe(true)
    expect(recreate.isCurrent()).toBe(true)
    recreate.complete()
    expect(isProviderInventoryDeleted(client, 'a')).toBe(false)
  })

  it('does not notify unchanged deleted snapshots and handles a providerless subscription', () => {
    const client = new QueryClient()
    const changed = vi.fn()
    const unsubscribe = subscribeProviderInventoryDeleted(client, 'a', changed)
    const unsubscribeMissing = subscribeProviderInventoryDeleted(client, undefined, changed)
    beginProviderInventoryMutation(client, 'a', false).complete()
    expect(changed).not.toHaveBeenCalled()
    beginProviderInventoryMutation(client, 'a', true)
    beginProviderInventoryMutation(client, 'a', true)
    expect(changed).toHaveBeenCalledTimes(1)
    expect(isProviderInventoryDeleted(client, undefined)).toBe(false)
    unsubscribe()
    unsubscribeMissing()
  })

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
