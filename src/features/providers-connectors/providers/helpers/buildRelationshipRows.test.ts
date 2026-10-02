import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '../model/providerTypes'
import { resolveProviderTopology } from './resolveProviderTopology'
import { buildRelationshipRows } from './buildRelationshipRows'

function provider(id: string, type: ProviderRecord['type'], extra: Partial<ProviderRecord> = {}): ProviderRecord {
  return { id, name: `Name ${id}`, type, role: 'source', credentialStatus: 'ok', ...extra }
}

function rowsFor(providers: ProviderRecord[]) {
  return buildRelationshipRows(resolveProviderTopology(providers))
}

describe('buildRelationshipRows', () => {
  it('keeps compute providers in API order and stacks several targets in one row', () => {
    const rows = rowsFor([
      provider('c-2', 'IBM_POWER', { backingStorageProviderIds: ['s-2', 's-1'] }),
      provider('c-1', 'VMWARE'),
      provider('s-1', 'FLASHCOPY'),
      provider('s-2', 'HITACHI'),
    ])

    expect(rows.computeRows.map(row => row.provider.id)).toEqual(['c-2', 'c-1'])
    expect(rows.computeRows[0]?.targets.map(target => target.relationship.targetId)).toEqual(['s-2', 's-1'])
    expect(rows.computeRows[1]?.targets).toEqual([])
  })

  it('shows a partner in full the first time and compact afterwards', () => {
    const rows = rowsFor([
      provider('c-1', 'VMWARE', { backingStorageProviderIds: ['s-1'] }),
      provider('c-2', 'VMWARE', { backingStorageProviderIds: ['s-1'] }),
      provider('c-3', 'IBM_POWER', { backingStorageProviderIds: ['s-2'] }),
      provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' }),
      provider('s-2', 'FLASHCOPY', { partnerProviderId: 's-1' }),
    ])

    const partners = rows.computeRows.map(row => row.targets[0]?.partner)
    expect(partners.map(partner => [partner?.other?.id, partner?.display, partner?.direction])).toEqual([
      ['s-2', 'full', 'both'],
      ['s-2', 'compact', 'both'],
      ['s-1', 'compact', 'both'],
    ])
    expect(rows.otherStorageRows).toEqual([])
  })

  it('gives a one-way partner the direction declared in the data', () => {
    const rows = rowsFor([
      provider('c-1', 'VMWARE', { backingStorageProviderIds: ['s-1'] }),
      provider('c-2', 'VMWARE', { backingStorageProviderIds: ['s-2'] }),
      provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' }),
      provider('s-2', 'FLASHCOPY'),
    ])

    expect(rows.computeRows.map(row => row.targets[0]?.partner?.direction)).toEqual(['out', 'in'])
  })

  it('adds no partner for unresolved or mismatched backing targets', () => {
    const rows = rowsFor([
      provider('c-1', 'VMWARE', { backingStorageProviderIds: ['missing', 'c-2'] }),
      provider('c-2', 'VMWARE'),
    ])

    expect(rows.computeRows[0]?.targets.map(target => [target.relationship.status, target.partner])).toEqual([
      ['unresolved', null],
      ['mismatch', null],
    ])
  })

  it('lists only partner relationships not already shown as other storage relationships', () => {
    const rows = rowsFor([
      provider('c-1', 'VMWARE', { backingStorageProviderIds: ['s-1'] }),
      provider('s-1', 'FLASHCOPY', { partnerProviderId: 's-2' }),
      provider('s-2', 'FLASHCOPY', { partnerProviderId: 's-1' }),
      provider('s-3', 'FLASHCOPY', { partnerProviderId: 's-4' }),
      provider('s-4', 'FLASHCOPY'),
      provider('s-5', 'HITACHI', { partnerProviderId: 's-6' }),
      provider('s-6', 'HITACHI'),
      provider('s-7', 'HITACHI'),
    ])

    expect(rows.otherStorageRows.map(row => [row.provider.id, row.partner.other?.id, row.partner.direction, row.partner.relationship.status]))
      .toEqual([
        ['s-3', 's-4', 'out', 'resolved'],
        ['s-5', 's-6', 'out', 'mismatch'],
      ])
  })

  it('keeps an unresolved partner visible by its raw id', () => {
    const rows = rowsFor([provider('s-1', 'FLASHCOPY', { partnerProviderId: 'missing' })])

    expect(rows.otherStorageRows[0]?.partner).toMatchObject({ otherId: 'missing', other: null, display: 'full' })
  })
})
