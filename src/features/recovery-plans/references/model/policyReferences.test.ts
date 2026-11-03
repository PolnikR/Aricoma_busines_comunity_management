import { describe, expect, it } from 'vitest'
import { findPolicyConsumers, findPolicySetConsumers } from './policyReferences'

describe('policy references', () => {
  it.each(['snapshot', 'recoveryApp', 'cleanRoom'] as const)('checks the exact %s policy field', kind => {
    const fields = { snapshot: 'snapshot_policy_id', recoveryApp: 'recovery_app_policy_id', cleanRoom: 'clean_room_policy_id' }
    const sets = [
      { id: 'one', name: 'First', [fields[kind]]: 'policy' },
      { id: 'two', name: 'Second', [fields[kind]]: 'policy' },
      { id: 'other', name: 'Other', [fields[kind]]: 'other' },
      { id: 'empty', name: 'Empty' },
    ]
    expect(findPolicyConsumers(kind, 'policy', sets)).toEqual([{ id: 'one', name: 'First' }, { id: 'two', name: 'Second' }])
    expect(findPolicyConsumers(kind, 'missing', sets)).toEqual([])
  })

  it('does not match IDs in another field or normalize policy IDs', () => {
    expect(findPolicyConsumers('snapshot', 'ID', [
      { id: 'one', name: 'First', recovery_app_policy_id: 'ID' },
      { id: 'two', name: 'Second', snapshot_policy_id: 'id' },
    ])).toEqual([])
    expect(findPolicyConsumers('snapshot', '', [{ id: 'empty', name: 'Empty', snapshot_policy_id: '' }])).toEqual([])
  })

  it('finds only direct root-level group and application references', () => {
    const groups = [{ id: 'g', name: 'Group', policy_set_id: 'set' }, { id: 'null', name: 'Null', policy_set_id: null }]
    const applications = [
      { id: 'a', application: { name: 'Application' }, policy_set_id: 'set' },
      { id: 'indirect', application: { name: 'Indirect', tiers: { tier: { recovery_group: { id: 'g' } } } } },
    ]
    expect(findPolicySetConsumers('set', groups, applications)).toEqual({ groups: [{ id: 'g', name: 'Group' }], applications: [{ id: 'a', name: 'Application' }] })
    expect(findPolicySetConsumers('missing', groups, applications)).toEqual({ groups: [], applications: [] })
    expect(findPolicySetConsumers('', [{ id: 'g', name: 'Group', policy_set_id: '' }], [])).toEqual({ groups: [], applications: [] })
  })
})
