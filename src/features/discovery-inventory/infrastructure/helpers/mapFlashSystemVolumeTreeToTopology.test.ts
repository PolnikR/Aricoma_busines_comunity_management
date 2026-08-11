import { describe, expect, it } from 'vitest'
import type {
  FlashSystemTreeFcmapDetail,
  FlashSystemTreeNode,
  FlashSystemTreePoolDetail,
  FlashSystemTreeVolumeDetail,
} from '../model/flashSystemVolumeTreeTypes'
import { mapFlashSystemVolumeTreeToTopology } from './mapFlashSystemVolumeTreeToTopology'

const poolDetail: FlashSystemTreePoolDetail = {
  id: '0', name: 'Pool0', status: 'online', mdisk_count: '1', vdisk_count: '46', capacity: '10.00TB',
  extent_size: '1024', free_capacity: '5.00TB', virtual_capacity: '10.00TB', used_capacity: '5.00TB',
  real_capacity: '5.00TB', overallocation: '100', warning: '80', easy_tier: 'on', easy_tier_status: 'active',
  compression_active: 'no', compression_virtual_capacity: '0', compression_compressed_capacity: '0',
  compression_uncompressed_capacity: '0', parent_mdisk_grp_id: '', parent_mdisk_grp_name: '',
  child_mdisk_grp_count: '0', child_mdisk_grp_capacity: '0', type: 'parent', encrypt: 'no',
  owner_type: 'none', site_id: '', site_name: '', data_reduction: 'no', used_capacity_before_reduction: '0',
  used_capacity_after_reduction: '0', overhead_capacity: '0', deduplication_capacity_saving: '0',
  reclaimable_capacity: '0', easy_tier_fcm_over_allocation_max: '0', volume_count: 46,
}

function volumeDetail(overrides: Partial<FlashSystemTreeVolumeDetail> = {}): FlashSystemTreeVolumeDetail {
  return {
    id: '0', name: 'V5000_VOLUME01', IO_group_id: '0', IO_group_name: 'io_grp0', status: 'online',
    mdisk_grp_id: '0', mdisk_grp_name: 'Pool0', capacity: '1.00TB', type: 'striped', FC_id: '', FC_name: '',
    RC_id: '', RC_name: '', vdisk_UID: '', fc_map_count: '0', copy_count: '1', fast_write_state: 'empty',
    se_copy_count: '0', RC_change: 'no', compressed_copy_count: '0', parent_mdisk_grp_id: '0',
    parent_mdisk_grp_name: 'Pool0', formatting: 'no', encrypt: 'no', volume_id: '0', volume_name: 'V5000_VOLUME01',
    function: '', protocol: 'scsi', host_maps: [], is_snapshot_target: false, has_snapshots: false,
    snapshot_count: 0, resolved: true,
    ...overrides,
  }
}

function fcmapDetail(overrides: Partial<FlashSystemTreeFcmapDetail> = {}): FlashSystemTreeFcmapDetail {
  return {
    id: '10', name: 'fcmap10', source_vdisk_id: '0', source_vdisk_name: 'V5000_VOLUME01',
    target_vdisk_id: '1', target_vdisk_name: 'V5000_VOLUME01_SNAP', group_id: '', group_name: '',
    status: 'copying', progress: '50', copy_rate: '50', clean_progress: '0', incremental: 'no',
    partner_FC_id: '', partner_FC_name: '', restoring: 'no', start_time: '', rc_controlled: 'no',
    start_time_iso: '',
    ...overrides,
  }
}

function pool(children: FlashSystemTreeNode[]): FlashSystemTreeNode {
  return { kind: 'pool', id: '0', name: 'Pool0', key: 'pool:0', detail: poolDetail, children }
}

function volume(
  id: string,
  key: string,
  children: FlashSystemTreeNode[] = [],
  overrides: Partial<FlashSystemTreeVolumeDetail> = {},
): FlashSystemTreeNode {
  return {
    kind: 'volume', id, name: `Volume${id}`, key,
    detail: volumeDetail({ id, name: `Volume${id}`, ...overrides }),
    children,
  }
}

function fcmap(
  id: string,
  key: string,
  children: FlashSystemTreeNode[],
  overrides: Partial<FlashSystemTreeFcmapDetail> = {},
): FlashSystemTreeNode {
  return {
    kind: 'fcmap', id, name: `fcmap${id}`, key,
    detail: fcmapDetail({ id, name: `fcmap${id}`, ...overrides }),
    children,
  }
}

describe('mapFlashSystemVolumeTreeToTopology', () => {
  it('maps a flat view (pool -> volume) with a contains edge', () => {
    const topology = mapFlashSystemVolumeTreeToTopology([
      pool([volume('0', 'pool:0/volume:0')]),
    ])

    expect(topology.nodes).toHaveLength(2)
    expect(topology.nodes.find(({ kind }) => kind === 'pool')).toMatchObject({ label: 'Pool0' })
    expect(topology.nodes.find(({ kind }) => kind === 'volume')).toMatchObject({ label: 'Volume0', role: null })
    expect(topology.edges).toHaveLength(1)
    expect(topology.edges[0]).toMatchObject({ kind: 'contains' })
  })

  it('maps a snapshot view (pool -> volume(source) -> fcmap -> volume(target)) with a copies edge', () => {
    const target = volume('1', 'pool:0/volume:0/fcmap:10/volume:1', [], { role: 'target' })
    const map = fcmap('10', 'pool:0/volume:0/fcmap:10', [target])
    const source = volume('0', 'pool:0/volume:0', [map])
    const topology = mapFlashSystemVolumeTreeToTopology([pool([source])])

    expect(topology.nodes).toHaveLength(4)
    const volumeNodes = topology.nodes.filter(({ kind }) => kind === 'volume')
    expect(volumeNodes).toHaveLength(2)
    expect(volumeNodes.find(({ label }) => label === 'Volume1')).toMatchObject({ role: 'target' })
    expect(volumeNodes.find(({ label }) => label === 'Volume0')).toMatchObject({ role: null })

    expect(topology.edges.filter(({ kind }) => kind === 'copies')).toHaveLength(1)
    expect(topology.edges.filter(({ kind }) => kind === 'contains')).toHaveLength(2)
    // no structural "contains" edge directly from the fcmap to its nested target volume
    expect(topology.edges.some(({ kind, target: edgeTarget }) => (
      kind === 'contains' && edgeTarget.includes('volume:1')
    ))).toBe(false)
  })

  it('maps a consistency_group view with structural source ownership and a semantic copy edge', () => {
    const target = volume('2', 'pool:0/cg:5/fcmap:11/volume:0/volume:2', [], { role: 'target' })
    const source = volume('0', 'pool:0/cg:5/fcmap:11/volume:0', [target], { role: 'source' })
    const map = fcmap('11', 'pool:0/cg:5/fcmap:11', [source], { source_vdisk_id: '0', target_vdisk_id: '2' })
    const group: FlashSystemTreeNode = {
      kind: 'consistency_group',
      id: '5',
      name: 'cg5',
      key: 'pool:0/cg:5',
      detail: {
        id: '5', name: 'cg5', status: 'copying', start_time: '', fc_mapping_count: 1,
        pool_ids: ['0'], spans_pools: false, is_synthetic: false,
      },
      children: [map],
    }
    const topology = mapFlashSystemVolumeTreeToTopology([pool([group])])

    expect(topology.nodes.find(({ kind }) => kind === 'consistencyGroup')).toMatchObject({ label: 'cg5' })
    expect(topology.nodes.filter(({ kind }) => kind === 'volume')).toHaveLength(2)
    expect(topology.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'contains',
        source: 'consistencyGroup:5',
        target: 'fcmap:11',
      }),
      expect.objectContaining({
        kind: 'contains',
        source: 'fcmap:11',
        target: 'volume:0',
      }),
      expect.objectContaining({
        kind: 'copies',
        source: 'volume:0',
        target: 'volume:2',
      }),
    ]))
    expect(topology.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'contains',
        source: 'volume:0',
        target: 'volume:2',
      }),
    ]))
  })

  it('deduplicates a source volume referenced by multiple fcmaps into a single node with multiple copies edges', () => {
    const targetA = volume('1', 'k1', [], { role: 'target' })
    const mapA = fcmap('10', 'k2', [targetA], { source_vdisk_id: '0', target_vdisk_id: '1' })
    const targetB = volume('2', 'k3', [], { role: 'target' })
    const mapB = fcmap('11', 'k4', [targetB], { source_vdisk_id: '0', target_vdisk_id: '2' })
    const source = volume('0', 'k5', [mapA, mapB])
    const topology = mapFlashSystemVolumeTreeToTopology([pool([source])])

    const volumeNodes = topology.nodes.filter(({ kind }) => kind === 'volume')
    expect(volumeNodes).toHaveLength(3)
    expect(topology.edges.filter(({ kind }) => kind === 'copies')).toHaveLength(2)
  })

  it('produces sorted, deterministic output', () => {
    const first = mapFlashSystemVolumeTreeToTopology([pool([volume('0', 'k1'), volume('1', 'k2')])])
    const second = mapFlashSystemVolumeTreeToTopology([pool([volume('1', 'k2'), volume('0', 'k1')])])

    expect(first.nodes.map(({ id }) => id)).toEqual(second.nodes.map(({ id }) => id))
    expect(first.edges.map(({ id }) => id)).toEqual(second.edges.map(({ id }) => id))
  })
})
