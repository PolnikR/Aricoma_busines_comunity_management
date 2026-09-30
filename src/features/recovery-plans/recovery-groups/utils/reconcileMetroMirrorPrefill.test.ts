import { describe, expect, it } from 'vitest'
import type { MetroMirrorRelationshipsResponseOutput } from '@/generated/query/zod/metroMirrorRelationshipsResponse.gen'
import { reconcileMetroMirrorPrefill } from './reconcileMetroMirrorPrefill'

const data: MetroMirrorRelationshipsResponseOutput = { provider_id: 'source', consistency_group_id: '001', volumes: [{ name: 'A', status: 'ok', auxiliary_name: 'AUX-A' }, { name: 'B', status: 'not_mirrored' }, { name: 'C', status: 'ambiguous', auxiliary_name: 'UNSAFE' }] }
describe('reconcileMetroMirrorPrefill', () => {
  it('prefills only exact unambiguous matches and the top-level group', () => {
    expect(reconcileMetroMirrorPrefill(['A', 'B', 'C', 'D'], {}, undefined, data)).toEqual({ consistencyGroupId: '001', auxiliaryNamesByVolume: { A: 'AUX-A' }, hasMismatch: false, unresolvedVolumes: ['B', 'C', 'D'] })
  })
  it('keeps manual and persisted corrections including intentional empty values', () => {
    const result = reconcileMetroMirrorPrefill(['A', 'B'], { A: '', B: 'MANUAL', REMOVED: 'OLD' }, '', data)
    expect(result.consistencyGroupId).toBe('')
    expect(result.auxiliaryNamesByVolume).toEqual({ A: '', B: 'MANUAL' })
    expect(result.hasMismatch).toBe(true)
  })
  it('does not infer a common group from individual relationships', () => {
    const result = reconcileMetroMirrorPrefill(['A'], {}, undefined, { ...data, consistency_group_id: null, volumes: [{ name: 'A', status: 'ok', auxiliary_name: 'AUX', consistency_group_id: '123' }] })
    expect(result.consistencyGroupId).toBe('')
  })
  it('drops automatic values when lookup is unavailable while preserving manual entries', () => {
    expect(reconcileMetroMirrorPrefill(['A', 'B'], { B: 'MANUAL' }, 'OVERRIDE', undefined)).toEqual({ consistencyGroupId: 'OVERRIDE', auxiliaryNamesByVolume: { B: 'MANUAL' }, hasMismatch: false, unresolvedVolumes: [] })
  })
  it('replaces automatic values on refetch without modifying manual values', () => {
    const result = reconcileMetroMirrorPrefill(['A'], { A: 'CUSTOM' }, undefined, { ...data, consistency_group_id: '002' })
    expect(result.consistencyGroupId).toBe('002')
    expect(result.auxiliaryNamesByVolume.A).toBe('CUSTOM')
  })
})
