import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { VolumesResponse } from '@/generated/query/zod'
import { parseWireResponse } from '@/test-utils/parseWireResponse'
import { mapFlashSystemInventory } from './mapFlashSystemInventory'
import { buildFlashVolumeRelationships } from './buildFlashVolumeRelationships'

const flash1: ProviderRecord = { id: 'flash-01', name: 'Flash 01', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'flash-02' }
const flash2: ProviderRecord = { id: 'flash-02', name: 'Flash 02', type: 'FLASHCOPY', role: 'target', credentialStatus: 'ok', partnerProviderId: 'flash-01' }

function resources(volumes: Record<string, unknown>[]) {
  return mapFlashSystemInventory(parseWireResponse(VolumesResponse, {
    count: volumes.length,
    volumes,
    pools: { '0': { name: 'Pool0', capacity: '6.98TB', used_capacity: '1TB', free_capacity: '5.98TB' } },
    hosts: { '3': { name: 'esx-01', cluster_id: '1', cluster_name: 'ESX_CLUSTER' } },
    clusters: {},
    consistency_groups: { '5': { name: 'cg_daily', status: 'copying' } },
  }), 'flash-01').resources
}

function volumeResource(volume: Record<string, unknown>) {
  const [resource] = resources([volume])
  if (!resource) throw new Error('volume not mapped')
  return resource
}

describe('buildFlashVolumeRelationships', () => {
  it('places the volume in its pool on its FlashSystem provider', () => {
    const result = buildFlashVolumeRelationships(volumeResource({ id: '1', name: 'V5000_VOLUME02', mdisk_grp_id: '0', mdisk_grp_name: 'Pool0', vdisk_UID: 'UID1' }), [flash1, flash2])

    expect(result.provider).toMatchObject({ entityId: 'provider:flash-01', provider: flash1 })
    expect(result.pool).toMatchObject({ name: 'Pool0', capacity: '6.98TB' })
    expect(result.volume).toMatchObject({ name: 'V5000_VOLUME02', uid: 'UID1' })
    expect(result.edges.filter(edge => edge.relation === 'contains').map(edge => [edge.from, edge.to])).toEqual([
      ['provider:flash-01', result.pool?.entityId],
      [result.pool?.entityId, result.volume.entityId],
    ])
  })

  it('links host mappings and consistency groups from the volume data', () => {
    const result = buildFlashVolumeRelationships(volumeResource({
      id: '1', name: 'v', host_maps: [{ host_id: '3', scsi_id: '0' }], consistency_group_ids: ['5'],
    }), [flash1])

    expect(result.hosts).toEqual([{ entityId: 'host:flash-01:3', name: 'esx-01', clusterName: 'ESX_CLUSTER', scsiId: '0' }])
    expect(result.consistencyGroups).toEqual([{ entityId: 'consistency-group:flash-01:5', name: 'cg_daily', status: 'copying' }])
  })

  it('draws FlashCopy and Remote Copy only when the volume reports them, without inventing a target', () => {
    const plain = buildFlashVolumeRelationships(volumeResource({ id: '1', name: 'v', FC_id: '', RC_id: '', fc_map_count: '0' }), [flash1])
    const copied = buildFlashVolumeRelationships(volumeResource({ id: '2', name: 'w', FC_id: 'many', FC_name: 'many', fc_map_count: '2', RC_id: '7', RC_name: 'rcrel0' }), [flash1])

    expect(plain.flashCopy).toBeNull()
    expect(plain.remoteCopy).toBeNull()
    expect(copied.flashCopy).toMatchObject({ mapCount: 2, fcId: 'many', fcName: 'many' })
    expect(copied.remoteCopy).toMatchObject({ rcId: '7', rcName: 'rcrel0' })
    expect(Object.keys(copied.remoteCopy ?? {})).not.toContain('target')
  })

  it('keeps the configured provider partner apart from the volume relationships', () => {
    const result = buildFlashVolumeRelationships(volumeResource({ id: '1', name: 'v', RC_id: '' }), [flash1, flash2])

    expect(result.remoteCopy).toBeNull()
    expect(result.partners.map(lane => [lane.other.entityId, lane.edge.direction])).toEqual([['provider:flash-02', 'both']])
    expect(result.edges.filter(edge => edge.relation === 'partner').map(edge => [edge.from, edge.to])).toEqual([['provider:flash-01', 'provider:flash-02']])
    expect(result.edges.some(edge => edge.relation === 'partner' && edge.from === result.volume.entityId)).toBe(false)
  })

  it('shows the raw provider id and no partner when the provider is not loaded', () => {
    const result = buildFlashVolumeRelationships(volumeResource({ id: '1', name: 'v' }), [])

    expect(result.provider.provider).toBeNull()
    expect(result.partners).toEqual([])
  })
})
