import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  getRecoveryGroup,
  listRecoveryGroups,
  toRecoveryGroupId,
  updateRecoveryGroup,
} from './recoveryGroupsStorage'

describe('recoveryGroupsStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and reads a recovery group with a stable normalized id', () => {
    const group = createRecoveryGroup({
      id: 'database_production',
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
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      workloadType: 'VMware' as const,
      resourceType: 'VM' as const,
      resources: ['DB-01'],
    }
    createRecoveryGroup(draft)

    expect(() => { createRecoveryGroup({ ...draft, id: 'database-group', name: 'database-group' }) }).toThrow(
      'already exists',
    )
  })

  it('normalizes accented names for use as ids', () => {
    expect(toRecoveryGroupId('Produkčná DB skupina')).toBe('produkcna_db_skupina')
  })

  it('updates a recovery group while preserving its id', () => {
    const created = createRecoveryGroup({
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      workloadType: 'VMware',
      resourceType: 'VM',
      resources: ['DB-01'],
    })

    const updated = updateRecoveryGroup(created.id, {
      id: created.id,
      name: 'Renamed Database Group',
      description: 'Updated databases',
      workloadType: 'VMware',
      resourceType: 'VM',
      resources: ['DB-01', 'DB-02'],
    })

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Renamed Database Group')
    expect(updated.resourceCount).toBe(2)
    expect(getRecoveryGroup(created.id)).toEqual(updated)
  })

  it('deletes a recovery group', () => {
    const group = createRecoveryGroup({
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      workloadType: 'VMware',
      resourceType: 'VM',
      resources: ['DB-01'],
    })

    deleteRecoveryGroup(group.id)

    expect(listRecoveryGroups()).toEqual([])
  })
})
