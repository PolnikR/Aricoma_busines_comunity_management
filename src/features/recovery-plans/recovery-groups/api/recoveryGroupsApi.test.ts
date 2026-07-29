import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  fetchRecoveryGroups,
  toRecoveryGroupId,
  updateRecoveryGroup,
} from './recoveryGroupsApi'

describe('recoveryGroupsApi', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates and reads a recovery group with a stable normalized id', async () => {
    const group = await createRecoveryGroup({
      id: 'database_production',
      name: 'Database Production',
      description: 'Production databases',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
    })

    expect(group.id).toBe('database_production')
    expect(group.resourceCount).toBe(2)
    expect(group.status).toBe('Active')
    expect(await fetchRecoveryGroups()).toEqual([group])
  })

  it('rejects a duplicate normalized group id', async () => {
    const draft = {
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      sourceCategory: 'backup_system_workload' as const,
      workloadType: 'vmware_virtual_machines' as const,
      resourceType: 'vm' as const,
      resources: ['DB-01'],
    }
    await createRecoveryGroup(draft)

    await expect(createRecoveryGroup({
      ...draft,
      id: 'database-group',
      name: 'database-group',
    })).rejects.toThrow('already exists')
  })

  it('normalizes accented names for use as ids', () => {
    expect(toRecoveryGroupId('Produkčná DB skupina')).toBe('produkcna_db_skupina')
  })

  it('updates a recovery group while preserving its id', async () => {
    const created = await createRecoveryGroup({
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01'],
    })

    const updated = await updateRecoveryGroup(created.id, {
      id: created.id,
      name: 'Renamed Database Group',
      description: 'Updated databases',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
    })

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Renamed Database Group')
    expect(updated.resourceCount).toBe(2)
    expect(await fetchRecoveryGroups()).toContainEqual(updated)
  })

  it('deletes a recovery group', async () => {
    const group = await createRecoveryGroup({
      id: 'database_group',
      name: 'Database Group',
      description: 'Databases',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01'],
    })

    await deleteRecoveryGroup(group.id)

    expect(await fetchRecoveryGroups()).toEqual([])
  })

  it('migrates legacy VMware groups to the canonical source and resource model', async () => {
    localStorage.setItem('abcm.recovery-groups', JSON.stringify([{
      id: 'legacy_group',
      name: 'Legacy group',
      description: 'Stored by the previous UI',
      workloadType: 'VMware',
      resourceType: 'VM',
      resources: ['VM-01'],
      resourceCount: 1,
      status: 'Active',
    }]))

    expect(await fetchRecoveryGroups()).toEqual([
      expect.objectContaining({
        sourceCategory: 'backup_system_workload',
        workloadType: 'vmware_virtual_machines',
        resourceType: 'vm',
      }),
    ])
    expect(localStorage.getItem('abcm.recovery-groups')).toContain('"sourceCategory":"backup_system_workload"')
  })

  it('keeps valid records when another stored record is invalid', async () => {
    localStorage.setItem('abcm.recovery-groups', JSON.stringify([
      {
        id: 'valid',
        name: 'Valid',
        description: 'Valid group',
        sourceCategory: 'backup_system_workload',
        workloadType: 'vmware_virtual_machines',
        resourceType: 'vm',
        resources: ['VM-01'],
      },
      { id: 'broken' },
    ]))

    await expect(fetchRecoveryGroups()).resolves.toHaveLength(1)
  })

  it('reports invalid JSON instead of returning an empty list', async () => {
    localStorage.setItem('abcm.recovery-groups', '{invalid')
    await expect(fetchRecoveryGroups()).rejects.toMatchObject({ code: 'invalid_storage' })
  })

  it('reports storage corruption when no stored record is usable', async () => {
    localStorage.setItem('abcm.recovery-groups', JSON.stringify([{ id: 'broken' }]))

    await expect(fetchRecoveryGroups()).rejects.toMatchObject({ code: 'invalid_storage' })
    expect(localStorage.getItem('abcm.recovery-groups')).toContain('"id":"broken"')
  })

  it('rejects incomplete data and incompatible resource configuration', async () => {
    await expect(createRecoveryGroup({
      id: 'invalid',
      name: '',
      description: 'Invalid group',
      sourceCategory: 'storage_system',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'volume',
      resources: [],
    })).rejects.toMatchObject({ code: 'invalid_draft' })
  })

  it('prevents changing the resource type of an existing group', async () => {
    const created = await createRecoveryGroup({
      id: 'database_group',
      name: 'Database group',
      description: 'Database VMs',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01'],
    })

    await expect(updateRecoveryGroup(created.id, {
      id: created.id,
      name: created.name,
      description: created.description,
      sourceCategory: 'storage_system',
      workloadType: 'ibm_flashsystem',
      resourceType: 'volume',
      resources: ['VOL-01'],
    })).rejects.toMatchObject({ code: 'immutable_type' })
  })
})
