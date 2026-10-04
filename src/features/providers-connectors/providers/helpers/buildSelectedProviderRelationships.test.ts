import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { buildSelectedProviderRelationships } from './buildSelectedProviderRelationships'

function provider(id: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name: `Name ${id}`, type, role: 'source', credentialStatus: 'ok', ...extra }
}

const flash1 = provider('flash-1', 'FLASHCOPY', { partnerProviderId: 'flash-2' })
const flash2 = provider('flash-2', 'FLASHCOPY', { partnerProviderId: 'flash-1' })
const hitachi = provider('hitachi-1', 'HITACHI')
const vcenter = provider('vc-1', 'VMWARE', { backingStorageProviderIds: ['flash-1', 'hitachi-1'] })
const power = provider('power-1', 'IBM_POWER', { backingStorageProviderIds: ['flash-1'] })
const unrelated = provider('vc-9', 'VMWARE', { backingStorageProviderIds: ['flash-9'] })
const unrelatedFlash = provider('flash-9', 'FLASHCOPY')

const all = [vcenter, power, unrelated, flash1, flash2, hitachi, unrelatedFlash]

function compute(providers: ProviderRecord[], id: string) {
  const result = buildSelectedProviderRelationships(providers, id)
  if (result.kind !== 'compute') throw new Error(`expected compute, got ${result.kind}`)
  return result
}

function storage(providers: ProviderRecord[], id: string) {
  const result = buildSelectedProviderRelationships(providers, id)
  if (result.kind !== 'storage') throw new Error(`expected storage, got ${result.kind}`)
  return result
}

const entityIds = (result: { edges: { from: string; to: string }[] }) => [...new Set(result.edges.flatMap(edge => [edge.from, edge.to]))].sort()

describe('buildSelectedProviderRelationships', () => {
  it('shows a VMware provider with all its backing storages and the storage partner', () => {
    const result = compute(all, 'vc-1')

    expect(result.selected.entityId).toBe('provider:vc-1')
    expect(result.backing.map(row => [row.storage.entityId, row.edge.kind, row.partners.map(lane => [lane.other.entityId, lane.edge.direction])])).toEqual([
      ['provider:flash-1', 'backing', [['provider:flash-2', 'both']]],
      ['provider:hitachi-1', 'backing', []],
    ])
    expect(result.partners).toEqual([])
  })

  it('shows an IBM Power provider the same way', () => {
    const result = compute(all, 'power-1')

    expect(result.backing.map(row => row.storage.entityId)).toEqual(['provider:flash-1'])
    expect(result.backing[0]?.partners[0]?.edge).toMatchObject({ kind: 'partner', direction: 'both' })
  })

  it('leaves unrelated providers out of the selected neighbourhood', () => {
    expect(entityIds(compute(all, 'vc-1'))).toEqual(['provider:flash-1', 'provider:flash-2', 'provider:hitachi-1', 'provider:vc-1'])
    expect(entityIds(storage(all, 'flash-1'))).toEqual(['provider:flash-1', 'provider:flash-2', 'provider:power-1', 'provider:vc-1'])
  })

  it('shows the compute providers using a FlashSystem and its partner, without the partner neighbourhood', () => {
    const result = storage(all, 'flash-2')

    expect(result.consumers).toEqual([])
    expect(result.partnerSupported).toBe(true)
    expect(result.partners.map(lane => [lane.other.entityId, lane.edge.direction])).toEqual([['provider:flash-1', 'both']])
    expect(entityIds(result)).toEqual(['provider:flash-1', 'provider:flash-2'])
  })

  it('lists every consumer of a storage provider in API order', () => {
    expect(storage(all, 'flash-1').consumers.map(row => [row.consumer.entityId, row.edge.kind])).toEqual([
      ['provider:vc-1', 'backing'],
      ['provider:power-1', 'backing'],
    ])
  })

  it('shows Hitachi consumers with no partner lane', () => {
    const result = storage(all, 'hitachi-1')

    expect(result.consumers.map(row => row.consumer.entityId)).toEqual(['provider:vc-1'])
    expect(result.partnerSupported).toBe(false)
    expect(result.partners).toEqual([])
  })

  it('keeps a one-way partner one-way, read from each side', () => {
    const a = provider('a', 'FLASHCOPY', { partnerProviderId: 'b' })
    const b = provider('b', 'FLASHCOPY')

    expect(storage([a, b], 'a').partners.map(lane => lane.edge.direction)).toEqual(['forward'])
    expect(storage([a, b], 'b').partners.map(lane => [lane.other.entityId, lane.edge.direction])).toEqual([['provider:a', 'backward']])
  })

  it('shows every one-way partner that points at the same FlashSystem', () => {
    const target = provider('t', 'FLASHCOPY')
    const result = storage([provider('a', 'FLASHCOPY', { partnerProviderId: 't' }), provider('c', 'FLASHCOPY', { partnerProviderId: 't' }), target], 't')

    expect(result.partners.map(lane => [lane.other.entityId, lane.edge.direction])).toEqual([['provider:a', 'backward'], ['provider:c', 'backward']])
  })

  it('draws an unknown backing storage id as an unresolved problem', () => {
    const result = compute([provider('vc', 'VMWARE', { backingStorageProviderIds: ['gone'] })], 'vc')

    expect(result.backing[0]?.storage).toMatchObject({ kind: 'problem', entityId: 'problem:gone', providerId: 'gone', status: 'unresolved', provider: null })
    expect(result.backing[0]?.edge).toMatchObject({ kind: 'problem', status: 'unresolved', relation: 'backing' })
  })

  it('draws a backing reference to a non-storage provider as a mismatch', () => {
    const other = provider('vc-2', 'VMWARE')
    const result = compute([provider('vc', 'VMWARE', { backingStorageProviderIds: ['vc-2'] }), other], 'vc')

    expect(result.backing[0]?.storage).toMatchObject({ kind: 'problem', status: 'mismatch', provider: other })
  })

  it('draws a Hitachi partner from legacy data as a mismatch instead of a partner lane', () => {
    const result = storage([provider('h', 'HITACHI', { partnerProviderId: 'flash' }), provider('flash', 'FLASHCOPY')], 'h')

    expect(result.partnerSupported).toBe(false)
    expect(result.partners.map(lane => [lane.other.kind, lane.edge.kind])).toEqual([['problem', 'problem']])
  })

  it('returns no relationships for a provider without any', () => {
    expect(compute([provider('vc', 'VMWARE')], 'vc')).toMatchObject({ backing: [], partners: [], edges: [] })
    expect(storage([provider('f', 'FLASHCOPY')], 'f')).toMatchObject({ consumers: [], partners: [], edges: [] })
  })

  it('reports a selected provider missing from the list', () => {
    expect(buildSelectedProviderRelationships(all, 'nope')).toEqual({ kind: 'missing' })
  })
})
