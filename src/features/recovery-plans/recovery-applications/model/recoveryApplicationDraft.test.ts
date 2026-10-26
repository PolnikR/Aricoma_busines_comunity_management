// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'
import { applyConfirmedSourceChange, createApplicationDraft, planApplicationMetadataChange } from './recoveryApplicationDraft'

const providers: ProviderRecord[] = [
  { id: 'source', name: 'Source', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'same', name: 'Same', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'power', name: 'Power', type: 'IBM_POWER', role: 'source', credentialStatus: 'ok' },
]
const locks: LockedProviders = { platform: 'VMWARE', sourceProviderId: 'source', targetProviderId: 'target' }
const context = { providers, lockedProviders: null }
const richTier: DraftRecoveryTier = {
  order: 3, description: 'Database', vms: [{ name: 'legacy' }],
  recovery_group: { id: 'group', name: 'Group', description: 'Stored', vms: [{ name: 'db', order: 8, hostname: 'stored' }], volumes: [{ name: 'volume' }] },
}
function draft(withGroup = true): RecoveryApplicationFormState {
  return { fileName: 'app', name: 'Application', description: 'Description', environment: 'prod', platform: 'source', targetProviderId: 'invalid-retained', policySetId: 'policy', orchestrationProviderId: 'airflow', pushToOrchestrator: false, notificationEmail: 'a@b.test', tiers: new Map([['db', structuredClone(withGroup ? richTier : { order: 3, description: 'Database' })]]) }
}
function freezeDraft(value: RecoveryApplicationFormState) {
  for (const tier of value.tiers.values()) {
    tier.recovery_group?.vms.forEach(Object.freeze)
    tier.recovery_group?.volumes?.forEach(Object.freeze)
    if (tier.recovery_group) {
      Object.freeze(tier.recovery_group.vms)
      Object.freeze(tier.recovery_group.volumes)
      Object.freeze(tier.recovery_group)
    }
    Object.freeze(tier.vms)
    Object.freeze(tier)
  }
  Object.freeze(value.tiers)
  return Object.freeze(value)
}

describe('draft initialization', () => {
  it('creates independent default tiers without inferring providers or Push', () => {
    const first = createApplicationDraft()
    expect(first).toEqual({ fileName: '', policySetId: '', pushToOrchestrator: false, name: '', description: '', environment: 'dev', platform: '', orchestrationProviderId: '', targetProviderId: '', notificationEmail: null, tiers: new Map([['tier_id', { order: 1, description: 'tier_description' }]]) })
    first.tiers.clear()
    expect(createApplicationDraft().tiers.size).toBe(1)
  })
  it('clones stored Groups, VM and volume objects while retaining legacy top-level VMs', () => {
    const initial = freezeDraft(draft())
    const copy = createApplicationDraft(initial)
    expect(copy).toEqual(initial)
    expect(copy.tiers).not.toBe(initial.tiers)
    const originalTier = initial.tiers.get('db')
    const copiedTier = copy.tiers.get('db')
    expect(copiedTier).not.toBe(originalTier)
    expect(copiedTier?.recovery_group).not.toBe(originalTier?.recovery_group)
    expect(copiedTier?.recovery_group?.vms[0]).not.toBe(originalTier?.recovery_group?.vms[0])
    expect(copiedTier?.recovery_group?.volumes?.[0]).not.toBe(originalTier?.recovery_group?.volumes?.[0])
    expect(copiedTier?.vms).toBe(originalTier?.vms)
  })
})

describe('metadata transaction', () => {
  it.each([
    ['source', 'same', 'invalid-retained'], ['source', 'power', ''],
    ['source', 'unknown', ''], ['unknown', 'source', ''], ['unknown', 'other-unknown', 'invalid-retained'],
  ])('resolves target by exact provider types for %s to %s', (oldSource, platform, target) => {
    const initial = freezeDraft({ ...draft(false), platform: oldSource })
    const decision = planApplicationMetadataChange(initial, { platform }, context)
    expect(decision.kind).toBe('applied')
    if (decision.kind !== 'applied') throw new Error('Expected applied')
    expect(decision.transition.draft.targetProviderId).toBe(target)
    expect(decision.transition.draft.platform).toBe(platform)
    expect(decision.transition.notifyDirty).toBe(true)
    expect(initial.targetProviderId).toBe('invalid-retained')
  })
  it('applies same-source scalar and target patches without detaching Groups', () => {
    const initial = freezeDraft(draft())
    const decision = planApplicationMetadataChange(initial, { platform: 'source', name: 'Updated', targetProviderId: 'target' }, context)
    expect(decision.kind).toBe('applied')
    if (decision.kind !== 'applied') throw new Error('Expected applied')
    expect(decision.transition.draft).toMatchObject({ name: 'Updated', platform: 'source', targetProviderId: 'target' })
    expect(decision.transition.draft.tiers).toBe(initial.tiers)
  })
  it('reports an identical-value callback as unchanged but dirty', () => {
    expect(planApplicationMetadataChange(draft(), { platform: 'source', name: 'Application' }, context)).toEqual({ kind: 'unchanged', notifyDirty: true })
  })
  it('filters locked providers while applying other metadata', () => {
    const initial = freezeDraft(draft())
    const lockedContext = { providers, lockedProviders: locks }
    expect(planApplicationMetadataChange(initial, { platform: 'power', targetProviderId: 'other' }, lockedContext)).toEqual({ kind: 'unchanged', notifyDirty: true })
    const decision = planApplicationMetadataChange(initial, { platform: 'power', targetProviderId: 'other', description: 'Changed' }, lockedContext)
    if (decision.kind !== 'applied') throw new Error('Expected applied')
    expect(decision.transition.draft).toMatchObject({ platform: 'source', targetProviderId: 'invalid-retained', description: 'Changed' })
    expect(decision.transition.draft.tiers).toBe(initial.tiers)
  })
  it.each(['same', 'power'])('defers combined metadata and detaches all latest Groups on accepting %s', platform => {
    const initial = freezeDraft(draft())
    const before = structuredClone(initial)
    const patch = { platform, name: 'Proposed' }
    const decision = planApplicationMetadataChange(initial, patch, context)
    expect(decision.kind).toBe('confirmationRequired')
    if (decision.kind !== 'confirmationRequired') throw new Error('Expected confirmation')
    patch.name = 'Mutated after proposal'
    expect(initial).toEqual(before)
    const latest = freezeDraft({ ...draft(), name: 'Later', description: 'Later description', policySetId: 'later-policy', tiers: new Map([['db', structuredClone(richTier)], ['later', { ...structuredClone(richTier), order: 9 }]]) })
    const result = applyConfirmedSourceChange(latest, Object.freeze(decision.proposal), null)
    expect(result.notifyDirty).toBe(true)
    expect(result.draft).toMatchObject({ platform, name: 'Proposed', description: 'Later description', policySetId: 'later-policy', targetProviderId: platform === 'power' ? '' : 'invalid-retained' })
    expect([...result.draft.tiers]).toEqual([['db', { order: 3, description: 'Database' }], ['later', { order: 9, description: 'Database' }]])
    expect(latest.tiers.get('later')?.recovery_group).toBeDefined()
  })
  it('freezes reset at proposal time with derived reset overriding a supplied target', () => {
    const decision = planApplicationMetadataChange(draft(), { platform: 'power', targetProviderId: 'supplied' }, context)
    if (decision.kind !== 'confirmationRequired') throw new Error('Expected confirmation')
    expect(decision.proposal.metadata).toEqual({ platform: 'power', targetProviderId: '' })
    expect(applyConfirmedSourceChange({ ...draft(), targetProviderId: 'later' }, decision.proposal, null).draft.targetProviderId).toBe('')
  })
  it('enforces newly active locks at acceptance without detaching Groups', () => {
    const decision = planApplicationMetadataChange(draft(), { platform: 'power', name: 'Proposed' }, context)
    if (decision.kind !== 'confirmationRequired') throw new Error('Expected confirmation')
    const latest = freezeDraft(draft())
    const result = applyConfirmedSourceChange(latest, decision.proposal, locks)
    expect(result.draft).toMatchObject({ name: 'Proposed', platform: 'source', targetProviderId: 'invalid-retained' })
    expect(result.draft.tiers).toBe(latest.tiers)
    expect(result.notifyDirty).toBe(true)
  })
})
