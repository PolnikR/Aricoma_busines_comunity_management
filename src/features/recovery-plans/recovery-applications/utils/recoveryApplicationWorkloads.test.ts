import { describe, expect, it } from 'vitest'
import type { DraftRecoveryTier } from '../model/recoveryApplicationTypes'
import { findDuplicateRecoveryApplicationWorkloads } from './recoveryApplicationWorkloads'
function tiers(...names: string[][]): Map<string, DraftRecoveryTier> {
  return new Map(names.map((vms, i) => ['tier' + String(i + 1), { order: i + 1, description: 'Tier', recovery_group: { id: 'group', name: 'Group', vms: vms.map(name => ({ name })) } }]))
}
describe('selected workload duplicates', () => {
  it('reports all affected tiers once, including repeated names in one tier', () => {
    expect(findDuplicateRecoveryApplicationWorkloads(tiers(['aix-db', 'aix-db'], ['web', 'aix-db'], ['aix-db']))).toEqual([{ name: 'aix-db', tierIds: ['tier1', 'tier2', 'tier3'] }])
    expect(findDuplicateRecoveryApplicationWorkloads(tiers(['lpar', 'lpar']))).toEqual([{ name: 'lpar', tierIds: ['tier1'] }])
  })
  it('compares exact names without case, whitespace, Unicode or task-id normalization', () => {
    expect(findDuplicateRecoveryApplicationWorkloads(tiers(['db', 'DB', ' db', 'a.b', 'a_b', '\u00e9', 'e\u0301'], ['web']))).toEqual([])
  })
  it('ignores legacy top-level VMs and unassigned tiers without mutating selections', () => {
    const draft = tiers(['db'], ['web'])
    draft.set('empty', { order: 3, description: 'Empty', vms: [{ name: 'db' }] })
    const before = structuredClone(draft)
    expect(findDuplicateRecoveryApplicationWorkloads(draft)).toEqual([])
    expect(draft).toEqual(before)
  })
})
