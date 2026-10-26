import { describe, expect, it } from 'vitest'
import type { RecoveryGroup } from './recoveryGroupTypes'
import { initializeDraft, transitionDraft, resolveEffectiveDraft, type DraftEvent } from './recoveryGroupDraftLifecycle'

const group: RecoveryGroup = {
  id: 'group', name: 'Group', description: 'Description', sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm',
  providerId: 'compute', relatedVolumeProviderId: 'source', resources: ['A', 'B'], relatedVolumes: ['VOL'], policySetId: 'policy', resourceCount: 2, status: 'Active',
  topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: 'MANUAL', auxiliaryNamesByVolume: { VOL: 'AUX' }, vmMetadataByName: { A: { order: 8 } },
}
describe('draft lifecycle transitions', () => {
  it('initializes isolated create/edit drafts, with persisted empty CG permitting prefill', () => {
    const first = initializeDraft()
    const second = initializeDraft()
    expect(first.draft).toMatchObject({ id: '', resources: [], topology: null, orchestrationProviderId: null })
    expect(first.draft.resources).not.toBe(second.draft.resources)
    const edit = initializeDraft({ ...group, consistencyGroupId: '' })
    expect(edit.hasConsistencyOverride).toBe(false)
    expect(edit.draft.resources).not.toBe(group.resources)
    expect(edit.draft.auxiliaryNamesByVolume).not.toBe(group.auxiliaryNamesByVolume)
    expect(initializeDraft({ ...group, resourceType: 'volume', sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem' }).draft.relatedVolumeProviderId).toBe('compute')
  })

  it.each(['pushed', 'provisioned'] as const)('admits user events from live %s authority without reinitialization', lock => {
    const state = initializeDraft(group)
    const event: DraftEvent = { type: 'detailsChanged', values: { name: 'Edited' } }
    const editAuthority = { ...group, ...(lock === 'pushed' ? { pushToOrchestrator: true } : { metroMirrorMode: 'managed' as const }) }
    expect(transitionDraft(state, event, { editAuthority })).toEqual({ state, notifyDirty: false })
    const updated = transitionDraft(state, event, { editAuthority: { ...group, pushToOrchestrator: false } })
    expect(updated.state.draft.name).toBe('Edited')
    expect(updated.notifyDirty).toBe(true)
    expect(state.draft.name).toBe('Group')
  })

  it('resets Source context while retaining compute selection, metadata, policy and topology', () => {
    const state = initializeDraft(group)
    const next = transitionDraft(state, { type: 'sourceChanged', sourceId: 'new' }).state
    expect(next.draft).toMatchObject({ providerId: 'compute', resources: ['A', 'B'], vmMetadataByName: { A: { order: 8 } }, relatedVolumeProviderId: 'new', relatedVolumes: [], auxiliaryNamesByVolume: {}, consistencyGroupId: '', policySetId: 'policy', topology: 'metro_mirror' })
    expect(next.hasConsistencyOverride).toBe(false)
    expect(transitionDraft(state, { type: 'sourceChanged', sourceId: 'source' }).state.draft.relatedVolumes).toEqual(['VOL'])
    const volume = initializeDraft({ ...group, resourceType: 'volume', sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem' })
    expect(transitionDraft(volume, { type: 'sourceChanged', sourceId: 'new' }).state.draft).toMatchObject({ providerId: 'new', resources: [] })
  })

  it.each([
    { type: 'categoryChanged', category: 'storage_system' },
    { type: 'workloadSelected', category: 'backup_system_workload', workload: 'ibm_power_virtual_machines', resourceType: 'vm' },
    { type: 'providerSelected', providerId: 'other' },
  ] satisfies DraftEvent[])('clears dependent selections but preserves manual CG for $type', event => {
    const next = transitionDraft(initializeDraft(group), event).state
    expect(next.draft).toMatchObject({ resources: [], relatedVolumes: [], auxiliaryNamesByVolume: {}, vmMetadataByName: {}, consistencyGroupId: 'MANUAL', relatedVolumeProviderId: 'source', policySetId: 'policy' })
    expect(next.hasConsistencyOverride).toBe(true)
  })

  it.each([
    { type: 'topologyChanged', topology: 'local' },
    { type: 'metroModeChanged', mode: 'managed' },
  ] satisfies DraftEvent[])('resets Metro overrides for $type without dropping selection', event => {
    const next = transitionDraft(initializeDraft(group), event).state
    expect(next.draft).toMatchObject({ resources: ['A', 'B'], relatedVolumes: ['VOL'], consistencyGroupId: '', auxiliaryNamesByVolume: {} })
    expect(next.hasConsistencyOverride).toBe(false)
  })

  it('preserves insertion order, deduplicates additions and retains metadata after remove/readd', () => {
    const state = initializeDraft(group)
    const removed = transitionDraft(state, { type: 'resourceRemoved', name: 'A' }).state
    expect(removed.draft).toMatchObject({ resources: ['B'], relatedVolumes: ['VOL'], vmMetadataByName: { A: { order: 8 } } })
    const readded = transitionDraft(removed, { type: 'resourceAdded', name: 'A' }).state
    expect(readded.draft.resources).toEqual(['B', 'A'])
    expect(transitionDraft(readded, { type: 'resourceAdded', name: 'A' }).notifyDirty).toBe(false)
  })

  it('retains the effective selection on same-provider and same-workload events', () => {
    const state = initializeDraft(group)
    const context = { related: { identity: resolveEffectiveDraft(state).discoveryIdentity, flashcopyProviderId: 'source', discoveredVolumeNames: ['AUTO'], isLoading: false, isResolved: true } }
    for (const event of [
      { type: 'providerSelected', providerId: 'compute' },
      { type: 'workloadSelected', category: 'backup_system_workload', workload: 'vmware_virtual_machines', resourceType: 'vm' },
    ] satisfies DraftEvent[]) {
      const next = transitionDraft(state, event, context)
      expect(next.notifyDirty).toBe(true)
      expect(next.state.draft).toMatchObject({ resources: ['A', 'B'], relatedVolumes: ['VOL', 'AUTO'], consistencyGroupId: 'MANUAL', vmMetadataByName: { A: { order: 8 } } })
      expect(state.draft.relatedVolumes).toEqual(['VOL'])
    }
  })

  it('removes the auxiliary of a volume-only resource without changing CG or other names', () => {
    const state = initializeDraft({ ...group, sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem', resourceType: 'volume', resources: ['VOL', 'OTHER'], auxiliaryNamesByVolume: { VOL: 'AUX', OTHER: 'KEEP' } })
    const removed = transitionDraft(state, { type: 'resourceRemoved', name: 'VOL' }).state
    expect(removed.draft).toMatchObject({ resources: ['OTHER'], auxiliaryNamesByVolume: { OTHER: 'KEEP' }, consistencyGroupId: 'MANUAL' })
    expect(transitionDraft(removed, { type: 'resourceAdded', name: 'VOL' }).state.draft.auxiliaryNamesByVolume).toEqual({ OTHER: 'KEEP' })
  })

  it('retains intentional empty overrides and separates system metadata updates from dirty edits', () => {
    const state = initializeDraft(group)
    const cg = transitionDraft(state, { type: 'consistencyGroupChanged', value: '' }).state
    expect(cg.hasConsistencyOverride).toBe(true)
    expect(cg.draft.consistencyGroupId).toBe('')
    expect(transitionDraft(cg, { type: 'auxiliaryChanged', name: 'VOL', value: '' }).state.draft.auxiliaryNamesByVolume).toEqual({ VOL: '' })
    const metadata = transitionDraft(cg, { type: 'metadataAvailable', metadata: { B: { os: 'Linux' } } })
    expect(metadata.notifyDirty).toBe(false)
    expect(metadata.state.draft.vmMetadataByName).toEqual({ A: { order: 8 }, B: { os: 'Linux' } })
  })

  it('clears related selection, allows explicit readd and removes only the selected auxiliary', () => {
    const state = initializeDraft(group)
    const removed = transitionDraft(state, { type: 'relatedVolumeRemoved', name: 'VOL' }).state
    expect(removed.exclusions.removed).toEqual(['VOL'])
    expect(removed.draft).toMatchObject({ relatedVolumes: [], auxiliaryNamesByVolume: {} })
    const cleared = transitionDraft(state, { type: 'relatedSelectionCleared' }).state
    expect(cleared.exclusions.all).toBe(true)
    const added = transitionDraft(cleared, { type: 'relatedVolumeAdded', name: 'VOL' }).state
    expect(added.draft.relatedVolumes).toEqual(['VOL'])
    expect(added.exclusions.all).toBe(true)
  })

  it.each([
    [{ type: 'policySelected', policySetId: 'new' }, { policySetId: 'new' }],
    [{ type: 'orchestrationProviderSelected', providerId: 'airflow' }, { orchestrationProviderId: 'airflow' }],
    [{ type: 'pushChanged', value: true }, { pushToOrchestrator: true }],
  ] satisfies [DraftEvent, object][])('updates independent fields for %o', (event, expected) => {
    expect(transitionDraft(initializeDraft(group), event).state.draft).toMatchObject(expected)
  })
})
