// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'
import { calculateTierReorder } from '../utils/calculateTierReorder'
import { addApplicationTier, applyApplicationTierOrder, applyConfirmedSourceChange, assignRecoveryGroup, createApplicationDraft, deleteApplicationTier, editApplicationTier, planApplicationMetadataChange, removeRecoveryGroup, selectRecoveryVm } from './recoveryApplicationDraft'

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

const vmwareGroup: RecoveryGroup = {
  id: 'group', name: 'Live Group', description: 'Live description', providerId: 'other-provider', policySetId: 'policy', resourceCount: 2, status: 'Active',
  sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm',
  resources: ['db', 'web'], relatedVolumeProviderId: null, relatedVolumes: [], pushToOrchestrator: true, airflowRunId: 'run',
  vmMetadataByName: { db: { order: 8, hostname: 'live', ip_address: '10.0.0.1', os: 'Linux', cpu: 4, memory_gb: 16, storage_gb: 80 }, web: { hostname: 'web-live' } },
}
const groupContext = { ...context, groups: [vmwareGroup] }

describe('Group and VM transitions', () => {
  it('assigns resource order and all metadata with metadata order taking precedence', () => {
    const initial = freezeDraft(draft(false))
    const before = structuredClone(groupContext)
    const result = assignRecoveryGroup(initial, 'db', 'group', groupContext)
    expect(result.notifyDirty).toBe(true)
    expect(result.draft.tiers.get('db')).toEqual({ order: 3, description: 'Database', recovery_group: { id: 'group', name: 'Live Group', description: 'Live description', vms: [{ name: 'db', order: 8, hostname: 'live', ip_address: '10.0.0.1', os: 'Linux', cpu: 4, memory_gb: 16, storage_gb: 80 }, { name: 'web', order: 2, hostname: 'web-live' }] } })
    expect(initial.tiers.get('db')).toEqual({ order: 3, description: 'Database' })
    expect(groupContext).toEqual(before)
    expect(result.draft.tiers.get('db')?.recovery_group?.vms[0]).not.toBe(vmwareGroup.vmMetadataByName?.['db'])
  })
  it.each([
    { id: 'missing' }, { pushToOrchestrator: false }, { airflowRunId: ' ' },
    { workloadType: 'ibm_power_virtual_machines' as const },
  ])('rejects unknown or ineligible Group without dirty: %j', changes => {
    const initial = freezeDraft(draft())
    const groups = [{ ...vmwareGroup, ...changes }]
    expect(assignRecoveryGroup(initial, 'db', 'group', { ...context, groups })).toEqual({ draft: initial, notifyDirty: false })
  })
  it('uses locked platform and copies Power LPAR metadata independently of provider identity', () => {
    const group: RecoveryGroup = { ...vmwareGroup, workloadType: 'ibm_power_virtual_machines', resources: ['LPAR01'], vmMetadataByName: { LPAR01: { os: 'AIX', order: 9 } } }
    const result = assignRecoveryGroup(draft(false), 'db', 'group', { providers: [], groups: [group], lockedProviders: { ...locks, platform: 'IBM_POWER' } })
    expect(result.draft.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'LPAR01', os: 'AIX', order: 9 }])
  })
  it('keeps an eligible missing-tier callback dirty', () => {
    const initial = freezeDraft(draft())
    expect(assignRecoveryGroup(initial, 'missing', 'group', groupContext)).toEqual({ draft: initial, notifyDirty: true })
  })
  it('removes Group and optional top-level VMs preserving key position and numeric fields', () => {
    const initial = freezeDraft(draft())
    expect(removeRecoveryGroup(initial, 'db')).toEqual({ draft: { ...initial, tiers: new Map([['db', { order: 3, description: 'Database' }]]) }, notifyDirty: true })
    expect(initial.tiers.get('db')?.recovery_group).toBeDefined()
  })
  it.each(['missing', 'db'])('removing absent Group/tier %s returns original and dirty', tierId => {
    const initial = freezeDraft(draft(false))
    const result = removeRecoveryGroup(initial, tierId)
    expect(result.draft).toBe(initial)
    expect(result.notifyDirty).toBe(true)
  })
  it('reindexes actual changes preserving stored metadata then uses live compatible unpublished metadata on re-add', () => {
    const initial = freezeDraft(draft())
    const unpublished = { ...groupContext, groups: [{ ...vmwareGroup, pushToOrchestrator: false }] }
    const appended = selectRecoveryVm(initial, 'db', 'web', true, unpublished)
    expect(appended.draft.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'db', order: 1, hostname: 'stored' }, { name: 'web', order: 2, hostname: 'web-live' }])
    const removed = selectRecoveryVm(appended.draft, 'db', 'db', false, unpublished)
    expect(removed.draft.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'web', order: 1, hostname: 'web-live' }])
    const readded = selectRecoveryVm(removed.draft, 'db', 'db', true, unpublished)
    expect(readded.draft.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'web', order: 1, hostname: 'web-live' }, { name: 'db', order: 2, hostname: 'live', ip_address: '10.0.0.1', os: 'Linux', cpu: 4, memory_gb: 16, storage_gb: 80 }])
    expect(initial.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'db', order: 8, hostname: 'stored' }])
  })
  it.each([['db', 'db', true], ['db', 'absent', false], ['missing', 'web', true]])('preserves no-op identity and dirty for %s %s %s', (tierId, vmName, selected) => {
    const initial = freezeDraft(draft())
    const result = selectRecoveryVm(initial, tierId, vmName, selected, groupContext)
    expect(result.draft).toBe(initial)
    expect(result.notifyDirty).toBe(true)
  })
  it('does not select VMs into an unassigned tier', () => {
    const initial = freezeDraft(draft(false))
    expect(selectRecoveryVm(initial, 'db', 'web', true, groupContext)).toEqual({ draft: initial, notifyDirty: true })
  })
  it.each([{ groups: [] }, { groups: [{ ...vmwareGroup, workloadType: 'ibm_power_virtual_machines' as const }] }])('permits unknown direct VM names without incompatible metadata', ({ groups }) => {
    const result = selectRecoveryVm(freezeDraft(draft()), 'db', 'web', true, { ...context, groups })
    expect(result.draft.tiers.get('db')?.recovery_group?.vms).toEqual([{ name: 'db', order: 1, hostname: 'stored' }, { name: 'web', order: 2 }])
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
    expect(planApplicationMetadataChange(draft(), { platform: 'source', name: 'Application' }, context)).toEqual({ kind: 'unchanged', metadata: { platform: 'source', name: 'Application' }, notifyDirty: true })
  })
  it('filters locked providers while applying other metadata', () => {
    const initial = freezeDraft(draft())
    const lockedContext = { providers, lockedProviders: locks }
    expect(planApplicationMetadataChange(initial, { platform: 'power', targetProviderId: 'other' }, lockedContext)).toEqual({ kind: 'unchanged', metadata: {}, notifyDirty: true })
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

describe('tier transitions', () => {
  it('stores a copied supplied tier at its supplied order without mutating either input', () => {
    const initial = freezeDraft(draft())
    const supplied = structuredClone(richTier)
    supplied.order = 10
    const before = structuredClone(supplied)
    const result = addApplicationTier(initial, 'new_tier', supplied)
    expect([...result.draft.tiers.keys()]).toEqual(['db', 'new_tier'])
    expect(result.draft.tiers.get('new_tier')).toEqual(before)
    expect(result.draft.tiers.get('new_tier')).not.toBe(supplied)
    expect(result.draft.tiers.get('new_tier')?.recovery_group?.vms[0]).not.toBe(supplied.recovery_group?.vms[0])
    expect(result.draft.tiers.get('new_tier')?.recovery_group?.volumes?.[0]).not.toBe(supplied.recovery_group?.volumes?.[0])
    expect(supplied).toEqual(before)
    expect([...initial.tiers.keys()]).toEqual(['db'])
    expect(result.notifyDirty).toBe(true)
  })
  it('preserves numeric order and nested content but moves renamed keys to Map end', () => {
    const initial = freezeDraft({ ...draft(), tiers: new Map([['db', structuredClone(richTier)], ['later', { order: 7, description: 'Later' }]]) })
    const before = structuredClone(initial)
    const result = editApplicationTier(initial, 'db', 'renamed', { tierDescription: 'Edited' })
    expect([...result.draft.tiers.keys()]).toEqual(['later', 'renamed'])
    expect(result.draft.tiers.get('renamed')).toEqual({ ...richTier, description: 'Edited' })
    expect(initial).toEqual(before)
    expect(result.notifyDirty).toBe(true)
  })
  it('keeps key insertion position when only description changes', () => {
    const initial = freezeDraft({ ...draft(), tiers: new Map([['db', structuredClone(richTier)], ['later', { order: 7, description: 'Later' }]]) })
    const result = editApplicationTier(initial, 'db', 'db', { tierDescription: 'Edited' })
    expect([...result.draft.tiers.keys()]).toEqual(['db', 'later'])
    expect(result.draft.tiers.get('db')).toEqual({ ...richTier, description: 'Edited' })
  })
  it('reports missing tier edits as original draft and dirty', () => {
    const initial = freezeDraft(draft())
    const result = editApplicationTier(initial, 'missing', 'new', { tierDescription: 'Edited' })
    expect(result.draft).toBe(initial)
    expect(result.notifyDirty).toBe(true)
  })
  it('deletes without renumbering survivors or rejecting final-tier callback', () => {
    const initial = freezeDraft({ ...draft(), tiers: new Map([['db', structuredClone(richTier)], ['later', { order: 7, description: 'Later' }]]) })
    const result = deleteApplicationTier(initial, 'db')
    expect([...result.draft.tiers]).toEqual([['later', { order: 7, description: 'Later' }]])
    expect(deleteApplicationTier(result.draft, 'later').draft.tiers.size).toBe(0)
    expect(deleteApplicationTier(initial, 'missing').notifyDirty).toBe(true)
    expect(initial.tiers.size).toBe(2)
    expect(result.notifyDirty).toBe(true)
  })
  it('applies existing algorithm orders and content without sorting Map entries', () => {
    const initial = freezeDraft({ ...draft(), tiers: new Map([['db', structuredClone(richTier)], ['later', { order: 7, description: 'Later' }]]) })
    const reordered = calculateTierReorder(Object.fromEntries(initial.tiers), Array.from(initial.tiers, ([id, tier]) => ({ id, tier })), 'later', 'db')
    const before = structuredClone(reordered)
    const result = applyApplicationTierOrder(initial, reordered)
    expect([...result.draft.tiers.keys()]).toEqual(['db', 'later'])
    expect(result.draft.tiers.get('db')).toEqual({ ...richTier, order: 2 })
    expect(result.draft.tiers.get('later')).toEqual({ order: 1, description: 'Later' })
    expect(reordered).toEqual(before)
    expect(initial.tiers.get('db')?.order).toBe(3)
    expect(result.notifyDirty).toBe(true)
  })
})

describe('metadata patch composition', () => {
  it('retains an implicit reset when a queued target edit precedes a cross-type source intent', () => {
    const initial = { ...draft(false), targetProviderId: '' }
    const target = planApplicationMetadataChange(initial, { targetProviderId: 'queued-target' }, context)
    const source = planApplicationMetadataChange(initial, { platform: 'power' }, context)
    if (target.kind !== 'applied' || source.kind !== 'applied') throw new Error('Expected applied')
    expect(source.metadata).toEqual({ platform: 'power', targetProviderId: '' })
    expect({ ...initial, ...target.metadata, ...source.metadata }).toMatchObject({ platform: 'power', targetProviderId: '' })
  })

  it('returns a copied exact patch for unchanged explicit values and filters locked providers', () => {
    const patch = { name: 'Application', platform: 'source' }
    const unchanged = planApplicationMetadataChange(draft(), patch, context)
    if (unchanged.kind !== 'unchanged') throw new Error('Expected unchanged')
    expect(unchanged.metadata).toEqual(patch)
    expect(unchanged.metadata).not.toBe(patch)
    patch.name = 'Later mutation'
    expect(unchanged.metadata).toEqual({ name: 'Application', platform: 'source' })
    const locked = planApplicationMetadataChange(draft(), { platform: 'power', targetProviderId: 'other' }, { ...context, lockedProviders: locks })
    if (locked.kind !== 'unchanged') throw new Error('Expected unchanged')
    expect(locked.metadata).toEqual({})
  })
})
