import { describe, expect, it } from 'vitest'
import type { DraftRecoveryTier } from '../model/recoveryApplicationTypes'
import { findRecoveryApplicationDagProblem } from './recoveryApplicationDagValidation'

function tier(names: string[], order = 1): DraftRecoveryTier {
  return { order, description: 'Tier', recovery_group: { id: 'group', name: 'Group', vms: names.map(name => ({ name })) } }
}
function draft(entries: [string, DraftRecoveryTier][], version: string | null = 'v2') {
  return { dagTemplateVersion: version, tiers: new Map(entries) }
}

describe.each([['IBM_POWER', 'v2', 'lpar'], ['IBM_POWER', 'v3', 'lpar'], ['VMWARE', 'v2', 'vm']])('%s %s DAG identities', (platform, version, prefix) => {
  it('distinguishes exact duplicates within and across tiers without mutating the draft', () => {
    const state = draft([['one', tier(['db', 'db'])]], version)
    const before = structuredClone(state)
    expect(findRecoveryApplicationDagProblem(state, platform)).toEqual({ kind: 'duplicateWorkloadWithinTier', params: { name: 'db', tier: 'one' } })
    expect(state).toEqual(before)
    state.tiers.set('two', tier(['db'], 2))
    expect(findRecoveryApplicationDagProblem(state, platform)).toEqual({ kind: 'duplicateWorkloadAcrossTiers', params: { name: 'db', tiers: 'one, two' } })
  })

  it.each([['A.B', 'A_B', 'A_B'], ['A B', 'A/B', 'A_B'], ['db😀', 'db_', 'db_'], ['dbé', 'db_', 'db_'], ['A..B', 'A__B', 'A__B'], [' db ', '_db_', '_db_']])('normalizes %s and %s exactly as Python', (first, second, sanitized) => {
    expect(findRecoveryApplicationDagProblem(draft([['one', tier([first, second])]], version), platform)).toEqual({
      kind: 'workloadTaskGroupCollision', params: { tier: 'one', first, second, id: `${prefix}_${sanitized}` },
    })
  })

  it('keeps case, hyphens and tier namespaces distinct', () => {
    expect(findRecoveryApplicationDagProblem(draft([['one', tier(['VM', 'vm', 'A-B', 'A_B', 'A.BC'])]], version), platform)).toBeNull()
    expect(findRecoveryApplicationDagProblem(draft([['one', tier(['A.B'])], ['two', tier(['A_B'], 2)]], version), platform)).toBeNull()
  })

  it.each([[1, '01'], [10, '10'], [100, '100'], [-1, '-1']])('uses actual order %s in tier group IDs', (order, formatted) => {
    const state = draft([['db.prod', tier(['a'], order)], ['db_prod', tier(['b'], order)]], version)
    expect(findRecoveryApplicationDagProblem(state, platform)).toEqual({ kind: 'tierTaskGroupCollision', params: { first: 'db.prod', second: 'db_prod', id: `tier_${formatted}_db_prod` } })
    state.tiers.set('db_prod', tier(['b'], order + 1))
    expect(findRecoveryApplicationDagProblem(state, platform)).toBeNull()
    state.tiers.set('db_prod', tier([], order))
    expect(findRecoveryApplicationDagProblem(state, platform)).toBeNull()
  })
})

it.each(['VMWARE', 'IBM_POWER', 'UNKNOWN'])('keeps legacy/default/unknown layouts for %s', platform => {
  for (const version of [null, 'v1', 'v9']) {
    expect(findRecoveryApplicationDagProblem(draft([['one', tier(['db', 'db'])]], version), platform)).toBeNull()
  }
})

it.each([['ibm_power', 'v3'], ['vmware', 'v2']])('resolves null from a unique verified %s default %s', (platform, version) => {
  const state = draft([['one', tier(['db', 'db'])]], null)
  const templates = [{ platform, version, default: true }]
  expect(findRecoveryApplicationDagProblem(state, platform, { templates, verified: true })?.kind).toBe('duplicateWorkloadWithinTier')
  expect(state.dagTemplateVersion).toBeNull()
  for (const catalog of [{ templates, verified: false }, { templates: [], verified: true },
    { templates: [...templates, { platform, version: 'v1', default: true }], verified: true },
    { templates: [{ platform: 'other', version, default: true }], verified: true }]) {
    expect(findRecoveryApplicationDagProblem(state, platform, catalog)).toBeNull()
  }
})
