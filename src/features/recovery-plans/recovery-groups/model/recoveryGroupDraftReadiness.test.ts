import { describe, expect, it } from 'vitest'
import type { RecoveryGroup } from './recoveryGroupTypes'
import type { DraftObservation } from './recoveryGroupDraftLifecycle'
import { initializeDraft } from './recoveryGroupDraftLifecycle'
import { resolveEffectiveDraft } from './resolveRecoveryGroupDraft'
import { getDraftReadiness } from './recoveryGroupDraftReadiness'

const group: RecoveryGroup = {
  id: 'group', name: 'Group', description: 'Description', sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem', resourceType: 'volume',
  providerId: 'source', relatedVolumeProviderId: null, resources: ['VOL'], relatedVolumes: [], policySetId: 'policy', resourceCount: 1, status: 'Active', topology: 'local',
}
const context: DraftObservation = {
  providers: [
    { id: 'source', name: 'Source', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'target' },
    { id: 'target', name: 'Target', type: 'FLASHCOPY', role: 'target', credentialStatus: 'ok' },
    { id: 'compute', name: 'Compute', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  ],
  providerStatus: { isSuccess: true }, eligibleOrchestrationProviderIds: ['airflow'],
}
function evaluate(initialData: RecoveryGroup = group, observation: DraftObservation = context, step = 7) {
  const state = initializeDraft(initialData)
  const live = { ...observation, editAuthority: initialData }
  return getDraftReadiness(state, resolveEffectiveDraft(state, live), { ...live, step, existingIds: [initialData.id] })
}
describe('wizard draft readiness, separate from submit validation', () => {
  it('returns every readiness gate without requiring push=true', () => {
    expect(evaluate()).toMatchObject({ detailsValid: true, topologyValid: true, typeValid: true, providerValid: true, resourcesValid: true, storageValid: true,
      discoveryValid: true, policySetValid: true, orchestrationValid: true, canContinue: true, canCreate: true, readyForPrefetch: true, readOnly: false })
  })

  it.each([
    ['name', '', 'detailsValid'], ['description', '', 'detailsValid'], ['policySetId', '', 'policySetValid'],
    ['providerId', 'missing', 'providerValid'], ['resources', [], 'resourcesValid'],
  ] as const)('blocks %s at its own gate', (field, value, gate) => {
    const result = evaluate({ ...group, [field]: value })
    expect(result[gate]).toBe(false)
    expect(result.canCreate).toBe(false)
  })

  it.each([
    { isLoading: true }, { isFetching: true }, { error: new Error('Offline') },
  ])('blocks topology and prefetch while providers are unavailable: %o', providerStatus => {
    expect(evaluate(group, { ...context, providerStatus })).toMatchObject({ topologyValid: false, canCreate: false, readyForPrefetch: false })
  })

  it('requires complete manual Metro fields for Existing while Managed needs no manual fields', () => {
    expect(evaluate({ ...group, topology: 'metro_mirror', metroMirrorMode: 'existing' })).toMatchObject({ storageValid: false, canCreate: false })
    expect(evaluate({ ...group, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: 'CG', auxiliaryNamesByVolume: { VOL: 'AUX' } })).toMatchObject({ storageValid: true, canCreate: true })
    expect(evaluate({ ...group, topology: 'metro_mirror', metroMirrorMode: 'managed' })).toMatchObject({ storageValid: true, canCreate: true })
  })

  it('retains unresolved VM navigation semantics but blocks Discovery loading or error', () => {
    const vm: RecoveryGroup = { ...group, sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm', providerId: 'compute', relatedVolumeProviderId: 'source', resources: ['VM'] }
    const state = initializeDraft(vm)
    const identity = resolveEffectiveDraft(state).discoveryIdentity
    const related = { identity, flashcopyProviderId: 'source', discoveredVolumeNames: [], isLoading: false, isResolved: false }
    expect(evaluate(vm, { ...context, related }, 8)).toMatchObject({ discoveryValid: true, canCreate: true })
    expect(evaluate(vm, { ...context, related: { ...related, isLoading: true } }, 6)).toMatchObject({ discoveryValid: false, canContinue: false })
    expect(evaluate(vm, { ...context, related: { ...related, error: new Error('Offline') } }, 8).canCreate).toBe(false)
  })

  it('uses live pushed/provisioned locks over the unchanged draft and permits clean rollback', () => {
    const state = initializeDraft(group)
    const resolution = resolveEffectiveDraft(state, context)
    for (const editAuthority of [{ ...group, pushToOrchestrator: true }, { ...group, metroMirrorMode: 'managed' as const, consistencyGroupId: 'BE' }]) {
      expect(getDraftReadiness(state, resolution, { ...context, step: 7, editAuthority })).toMatchObject({ readOnly: true, canCreate: false, readyForPrefetch: false })
    }
    expect(getDraftReadiness(state, resolution, { ...context, step: 7, editAuthority: group }).canCreate).toBe(true)
    expect(state.draft.name).toBe('Group')
  })

  it('distinguishes legacy edit from create without Source and applies both step layouts', () => {
    const vm: RecoveryGroup = { ...group, sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm', providerId: 'compute', resources: ['VM'] }
    expect(evaluate(vm, context, 8).canCreate).toBe(true)
    const state = initializeDraft(vm)
    expect(getDraftReadiness(state, resolveEffectiveDraft(state, context), { ...context, step: 8 }).topologyValid).toBe(false)
    for (const step of [1, 2, 3, 4, 5, 6, 7]) expect(evaluate(group, context, step).canContinue).toBe(true)
    for (const step of [1, 2, 3, 4, 5, 6, 7, 8]) expect(evaluate(vm, context, step).canContinue).toBe(true)
  })

  it('checks ID availability, eligible Airflow selection and initial prefetch loading independently', () => {
    const state = initializeDraft(group)
    const view = resolveEffectiveDraft(state, context)
    expect(getDraftReadiness(state, view, { ...context, step: 7, existingIds: ['group'] }).detailsValid).toBe(false)
    expect(evaluate(group, { ...context, eligibleOrchestrationProviderIds: ['one', 'two'] }).orchestrationValid).toBe(false)
    expect(evaluate({ ...group, orchestrationProviderId: 'wrong' }).orchestrationValid).toBe(false)
    expect(getDraftReadiness(state, view, { ...context, step: 7, editAuthority: group, isInitialLoading: true })).toMatchObject({ readyForPrefetch: false, canCreate: true })
  })
})
