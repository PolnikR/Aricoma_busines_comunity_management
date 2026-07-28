import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRecoveryGroup,
  listRecoveryGroups,
  toRecoveryGroupId,
} from './recoveryGroupsStorage'

describe('recoveryGroupsStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and reads a recovery group with a stable normalized id', () => {
    const group = createRecoveryGroup({
      name: 'Database Production',
      description: 'Production databases',
      workloadType: 'VMware',
      resourceType: 'VM',
      resources: ['DB-01', 'DB-02'],
    })

    expect(group.id).toBe('database_production')
    expect(group.resourceCount).toBe(2)
    expect(group.status).toBe('Active')
    expect(listRecoveryGroups()).toEqual([group])
  })

  it('rejects a duplicate normalized group id', () => {
    const draft = {
      name: 'Database Group',
      description: 'Databases',
      workloadType: 'VMware' as const,
      resourceType: 'VM' as const,
      resources: ['DB-01'],
    }
    createRecoveryGroup(draft)

    expect(() => { createRecoveryGroup({ ...draft, name: 'database-group' }) }).toThrow(
      'already exists',
    )
  })

  it('normalizes accented names for use as ids', () => {
    expect(toRecoveryGroupId('Produkčná DB skupina')).toBe('produkcna_db_skupina')
  })
})
