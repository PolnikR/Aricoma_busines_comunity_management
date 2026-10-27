import { describe, expect, it } from 'vitest'
import { initializeDraft, transitionDraft, type DraftObservation } from './recoveryGroupDraftLifecycle'
import { resolveEffectiveDraft } from './resolveRecoveryGroupDraft'

function vmState() {
  let state = initializeDraft()
  state = transitionDraft(state, { type: 'workloadSelected', category: 'backup_system_workload', workload: 'vmware_virtual_machines', resourceType: 'vm' }).state
  state = transitionDraft(state, { type: 'providerSelected', providerId: 'compute' }).state
  state = transitionDraft(state, { type: 'sourceChanged', sourceId: 'source' }).state
  return transitionDraft(state, { type: 'resourceAdded', name: 'VM' }).state
}
function observation(state = vmState()): DraftObservation {
  return { related: { identity: resolveEffectiveDraft(state).discoveryIdentity, flashcopyProviderId: 'source', discoveredVolumeNames: ['B', 'A', 'B'], isLoading: false, isResolved: true } }
}
describe('effective Recovery Group draft', () => {
  it('keeps raw and discovered selections separate, stable and ordered', () => {
    const state = transitionDraft(vmState(), { type: 'relatedVolumeAdded', name: 'MANUAL' }).state
    const view = resolveEffectiveDraft(state, observation(state))
    expect(state.draft.relatedVolumes).toEqual(['MANUAL'])
    expect(view.selectionDraft.relatedVolumes).toEqual(['MANUAL', 'B', 'A'])
    expect(view.draft.relatedVolumes).toEqual(['MANUAL', 'B', 'A'])
    expect(view.relatedVolumeRequest).toEqual({ computeProviderId: 'compute', vmNames: ['VM'], sourceId: 'source' })
  })

  it('honors remove/clear exclusions on refetch, explicit readd and identity changes', () => {
    let state = vmState()
    const ctx = observation(state)
    state = transitionDraft(state, { type: 'relatedVolumeRemoved', name: 'A' }, ctx).state
    expect(resolveEffectiveDraft(state, ctx).selectedVolumes).toEqual(['B'])
    state = transitionDraft(state, { type: 'relatedSelectionCleared' }, ctx).state
    expect(resolveEffectiveDraft(state, ctx).selectedVolumes).toEqual([])
    state = transitionDraft(state, { type: 'relatedVolumeAdded', name: 'A' }, ctx).state
    expect(resolveEffectiveDraft(state, ctx).selectedVolumes).toEqual(['A'])
    state = transitionDraft(state, { type: 'resourceAdded', name: 'OTHER' }, ctx).state
    expect(resolveEffectiveDraft(state, observation(state)).selectedVolumes).toEqual(['A', 'B'])
    expect(resolveEffectiveDraft(state, ctx).selectedVolumes).toEqual(['A'])
  })

  it.each(['pending', 'error', 'unresolved'] as const)('does not prune saved overrides while %s', phase => {
    const state = transitionDraft(vmState(), { type: 'auxiliaryChanged', name: 'SAVED', value: 'AUX' }).state
    const ctx = observation(state)
    ctx.related = { identity: resolveEffectiveDraft(state).discoveryIdentity, flashcopyProviderId: 'source', discoveredVolumeNames: [], isLoading: phase === 'pending', isResolved: phase !== 'unresolved', error: phase === 'error' ? new Error('Offline') : null }
    expect(transitionDraft(state, { type: 'selectionObserved', identity: resolveEffectiveDraft(state).discoveryIdentity }, ctx).state).toBe(state)
  })

  it('prunes only the latest selected names after settled observation and ignores old identities', () => {
    let state = transitionDraft(vmState(), { type: 'auxiliaryChanged', name: 'OLD', value: 'AUX' }).state
    const ctx = observation(state)
    const identity = resolveEffectiveDraft(state).discoveryIdentity
    state = transitionDraft(state, { type: 'relatedVolumeAdded', name: 'NEW' }, ctx).state
    state = transitionDraft(state, { type: 'auxiliaryChanged', name: 'NEW', value: 'LATEST' }, ctx).state
    const pruned = transitionDraft(state, { type: 'selectionObserved', identity }, ctx)
    expect(pruned.notifyDirty).toBe(false)
    expect(pruned.state.draft.auxiliaryNamesByVolume).toEqual({ NEW: 'LATEST' })
    expect(transitionDraft(pruned.state, { type: 'selectionObserved', identity }, ctx).state).toBe(pruned.state)
    const changed = transitionDraft(pruned.state, { type: 'sourceChanged', sourceId: 'other' }, ctx).state
    expect(transitionDraft(changed, { type: 'selectionObserved', identity }, ctx).state).toBe(changed)
  })

  it('distinguishes persisted empty CG, manual empty CG and a keyed empty auxiliary', () => {
    let state = transitionDraft(vmState(), { type: 'topologyChanged', topology: 'metro_mirror' }).state
    state = transitionDraft(state, { type: 'relatedVolumeAdded', name: 'A' }).state
    state = transitionDraft(state, { type: 'auxiliaryChanged', name: 'A', value: '' }).state
    const ctx: DraftObservation = { relationships: { provider_id: 'source', consistency_group_id: 'AUTO', volumes: [{ name: 'A', status: 'ok', auxiliary_name: 'AUTO-AUX' }] } }
    expect(resolveEffectiveDraft(state, ctx).draft).toMatchObject({ consistencyGroupId: 'AUTO', auxiliaryNamesByVolume: { A: '' } })
    state = transitionDraft(state, { type: 'consistencyGroupChanged', value: '' }).state
    expect(resolveEffectiveDraft(state, ctx).draft.consistencyGroupId).toBe('')
    expect(state.draft.consistencyGroupId).toBe('')
  })

  it('does not wait for VM Discovery to prune volume-only selections', () => {
    let state = initializeDraft()
    state = transitionDraft(state, { type: 'workloadSelected', category: 'storage_system', workload: 'ibm_flashsystem', resourceType: 'volume' }).state
    state = transitionDraft(state, { type: 'auxiliaryChanged', name: 'OLD', value: 'old' }).state
    const view = resolveEffectiveDraft(state)
    expect(view.discoverySettled).toBe(true)
    expect(transitionDraft(state, { type: 'selectionObserved', identity: view.discoveryIdentity }).state.draft.auxiliaryNamesByVolume).toEqual({})
  })
})
