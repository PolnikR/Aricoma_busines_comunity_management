import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { resolveProviderTopology } from './resolveProviderTopology'

function provider(id: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name: `Name ${id}`, type, role: 'source', credentialStatus: 'ok', ...extra }
}

describe('resolveProviderTopology', () => {
  it('splits compute and storage providers in API order', () => {
    const topology = resolveProviderTopology([
      provider('s-1', 'FLASHCOPY'), provider('c-1', 'IBM_POWER'), provider('s-2', 'HITACHI'), provider('c-2', 'VMWARE'),
    ])

    expect(topology.computeProviders.map(p => p.id)).toEqual(['c-1', 'c-2'])
    expect(topology.storageProviders.map(p => p.id)).toEqual(['s-1', 's-2'])
  })

  it.each(['VMWARE', 'IBM_POWER'] as const)('resolves backing storage from %s to FlashSystem and Hitachi in array order', (type) => {
    const flash = provider('s-1', 'FLASHCOPY')
    const hitachi = provider('s-2', 'HITACHI')
    const topology = resolveProviderTopology([provider('c-1', type, { backingStorageProviderIds: ['s-2', 's-1'] }), flash, hitachi])

    expect(topology.backingStorage).toEqual([
      { sourceId: 'c-1', targetId: 's-2', target: hitachi, status: 'resolved' },
      { sourceId: 'c-1', targetId: 's-1', target: flash, status: 'resolved' },
    ])
  })

  it('keeps an unknown backing storage id as unresolved', () => {
    const topology = resolveProviderTopology([provider('c-1', 'VMWARE', { backingStorageProviderIds: ['missing'] })])

    expect(topology.backingStorage).toEqual([{ sourceId: 'c-1', targetId: 'missing', target: null, status: 'unresolved' }])
  })

  it('marks backing storage that breaks the contract as mismatch', () => {
    const otherCompute = provider('c-2', 'VMWARE')
    const storage = provider('s-1', 'FLASHCOPY', { backingStorageProviderIds: ['s-2'] })
    const hitachi = provider('s-2', 'HITACHI')
    const topology = resolveProviderTopology([provider('c-1', 'VMWARE', { backingStorageProviderIds: ['c-2'] }), otherCompute, storage, hitachi])

    expect(topology.backingStorage).toEqual([
      { sourceId: 'c-1', targetId: 'c-2', target: otherCompute, status: 'mismatch' },
      { sourceId: 's-1', targetId: 's-2', target: hitachi, status: 'mismatch' },
    ])
  })

  it('gives a compute provider without backing storage no relationships', () => {
    const topology = resolveProviderTopology([provider('c-1', 'VMWARE', { backingStorageProviderIds: [] }), provider('c-2', 'IBM_POWER')])

    expect(topology.computeProviders.map(p => p.id)).toEqual(['c-1', 'c-2'])
    expect(topology.backingStorage).toEqual([])
  })

  it('merges a mutual partnership into one relationship led by the first provider', () => {
    const first = provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' })
    const second = provider('s-2', 'FLASHCOPY', { partnerProviderId: 's-1' })
    const topology = resolveProviderTopology([first, second])

    expect(topology.partners).toEqual([{ sourceId: 's-1', targetId: 's-2', target: second, status: 'resolved', mutual: true }])
  })

  it('keeps a one-way partnership one-way without a reverse relationship', () => {
    const target = provider('s-2', 'FLASHCOPY', { partnerProviderId: null })
    const topology = resolveProviderTopology([provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' }), target])

    expect(topology.partners).toEqual([{ sourceId: 's-1', targetId: 's-2', target, status: 'resolved', mutual: false }])
  })

  it('keeps an unknown partner id as unresolved', () => {
    const topology = resolveProviderTopology([provider('s-1', 'FLASHCOPY', { partnerProviderId: 'missing' })])

    expect(topology.partners).toEqual([{ sourceId: 's-1', targetId: 'missing', target: null, status: 'unresolved', mutual: false }])
  })

  it('marks partners that break the FlashSystem-only contract as mismatch', () => {
    const hitachi = provider('s-2', 'HITACHI')
    const hitachiSource = provider('s-3', 'HITACHI', { partnerProviderId: 's-4' })
    const hitachiTarget = provider('s-4', 'HITACHI')
    const self = provider('s-5', 'FLASHCOPY', { partnerProviderId: 's-5' })
    const topology = resolveProviderTopology([
      provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' }), hitachi, hitachiSource, hitachiTarget, self,
    ])

    expect(topology.partners).toEqual([
      { sourceId: 's-1', targetId: 's-2', target: hitachi, status: 'mismatch', mutual: false },
      { sourceId: 's-3', targetId: 's-4', target: hitachiTarget, status: 'mismatch', mutual: false },
      { sourceId: 's-5', targetId: 's-5', target: self, status: 'mismatch', mutual: false },
    ])
  })
})
