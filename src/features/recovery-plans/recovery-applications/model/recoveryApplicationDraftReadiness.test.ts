import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'
import { getRecoveryApplicationDraftReadiness, type DraftReadinessContext } from './recoveryApplicationDraftReadiness'

const providers: ProviderRecord[] = [
  { id: 'source', name: 'Source', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
  { id: 'target', name: 'Target', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
]
const airflow: PlatformProviderRecord = { id: 'airflow', name: 'Airflow', type: 'AIRFLOW', role: 'source', port: 8080, credentialStatus: 'ok' }
const locks: LockedProviders = { platform: 'VMWARE', sourceProviderId: 'source', targetProviderId: 'target' }

function draft(update: Partial<RecoveryApplicationFormState> = {}): RecoveryApplicationFormState {
  return {
    fileName: 'application', name: 'Application', description: 'Description', environment: 'prod',
    platform: 'source', targetProviderId: 'target', policySetId: 'policy',
    pushToOrchestrator: false, orchestrationProviderId: 'airflow', notificationEmail: null,
    tiers: new Map([['database', { order: 1, description: 'Database', recovery_group: { id: 'stored-group', name: 'Stored Group', vms: [] } }]]),
    ...update,
  }
}

function context(update: Partial<DraftReadinessContext> = {}): DraftReadinessContext {
  return { step: 1, providers, providersError: null, platformProviders: [airflow], areGroupsLoading: false, groupsError: null, groups: [{ id: 'stored-group', providerId: 'source', resources: [], sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', pushToOrchestrator: true, airflowRunId: 'run' }], lockedProviders: null,
    templateCatalog: { templates: [{ platform: 'vmware', version: 'future-3', default: true, description: 'Default' }], verified: true }, ...update }
}

describe('getRecoveryApplicationDraftReadiness', () => {
  it('uses the same template context for tier readiness and Save', () => {
    const state = draft({ dagTemplateVersion: null, tiers: new Map([['database', {
      order: 1, description: 'Database', recovery_group: { id: 'stored-group', name: 'Group', vms: [{ name: 'vm' }, { name: 'vm' }] },
    }]]) })
    const base = context({ step: 2 })
    const inputs = { ...base, groups: base.groups.map(group => ({ ...group, resources: ['vm'] })),
      templateCatalog: { templates: [{ platform: 'vmware', version: 'v2', default: true, description: 'Default' }], verified: true } }
    const readiness = getRecoveryApplicationDraftReadiness(state, inputs)
    expect(readiness).toMatchObject({ canContinue: false, canSave: false, tiersError: { templateDependent: true } })
    expect(readiness.validationError).toEqual(readiness.tiersError)
    inputs.templateCatalog.templates = inputs.templateCatalog.templates.map(template => ({ ...template, version: 'v1' }))
    expect(getRecoveryApplicationDraftReadiness(state, inputs)).toMatchObject({ canContinue: true, canSave: true })
    expect(state.dagTemplateVersion).toBeNull()
  })
  it.each([
    [false, null, false, true],
    [false, 'future-3', false, false],
    [true, null, false, false],
    [true, 'future-3', false, false],
    [false, null, true, true],
    [false, 'future-3', true, true],
    [false, 'removed', true, false],
    [true, null, true, true],
    [true, 'removed', true, false],
  ] as const)('matches submit template gating for Push=%s version=%s verified=%s', (pushToOrchestrator, dagTemplateVersion, verified, canSave) => {
    expect(getRecoveryApplicationDraftReadiness(draft({ pushToOrchestrator, dagTemplateVersion }), context({
      templateCatalog: { templates: [{ platform: 'vmware', version: 'future-3', default: true, description: 'Default' }], verified },
    })).canSave).toBe(canSave)
  })
  it('returns shared section and final results for a complete Create draft', () => {
    expect(getRecoveryApplicationDraftReadiness(draft(), context())).toEqual({
      detailsValid: true, tiersValid: true, policySetValid: true, orchestrationValid: true,
      canContinue: true, canSave: true, providersLoaded: true, lockedProvidersError: null, detailsError: null, tiersError: null, validationError: null,
    })
  })

  it.each([
    ['empty file name', { fileName: '' }],
    ['invalid file name', { fileName: '1application' }],
    ['empty name', { name: '' }],
    ['invalid name', { name: 'Application name' }],
    ['blank description', { description: ' \t\n' }],
    ['missing source', { platform: 'gone' }],
    ['missing target', { targetProviderId: 'gone' }],
    ['source used as target', { targetProviderId: 'source' }],
    ['target used as source', { platform: 'target' }],
  ] satisfies [string, Partial<RecoveryApplicationFormState>][])(
    'blocks details and Save for %s', (_label, update) => {
      expect(getRecoveryApplicationDraftReadiness(draft(update), context())).toMatchObject({ detailsValid: false, canContinue: false, canSave: false })
    },
  )

  it.each(['source', 'target'])('blocks Create with missing %s credentials but preserves locked Edit eligibility', id => {
    const unavailable = providers.map(provider => provider.id === id ? { ...provider, credentialStatus: 'missing' as const } : provider)
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providers: unavailable }))).toMatchObject({ detailsValid: false, canSave: false })
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providers: unavailable, lockedProviders: locks }))).toMatchObject({ detailsValid: true, canSave: true, lockedProvidersError: null })
  })

  it('rejects a target with a different compute type', () => {
    const mixed = providers.map(provider => provider.id === 'target' ? { ...provider, type: 'IBM_POWER' as const } : provider)
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providers: mixed }))).toMatchObject({ detailsValid: false, canSave: false })
  })

  it.each([null, { platform: 'IBM_POWER', sourceProviderId: 'hmc', targetProviderId: 'hmc' }])(
    'allows the same IBM Power HMC on both sides with locks %j', lockedProviders => {
      const hmc: ProviderRecord = { id: 'hmc', name: 'HMC', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' }
      expect(getRecoveryApplicationDraftReadiness(draft({ platform: 'hmc', targetProviderId: 'hmc' }), context({ providers: [hmc], lockedProviders, groups: [{ id: 'stored-group', providerId: 'hmc', resources: [], sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines', pushToOrchestrator: true, airflowRunId: 'run' }] })))
        .toMatchObject({ detailsValid: true, canSave: true, lockedProvidersError: null })
    },
  )

  it.each([
    ['no tiers', new Map<string, DraftRecoveryTier>()],
    ['unassigned tier', new Map([['database', { order: 1, description: 'Database' }]])],
    ['one unassigned tier among assigned tiers', new Map<string, DraftRecoveryTier>([...draft().tiers, ['web', { order: 2, description: 'Web' }]])],
  ] satisfies [string, RecoveryApplicationFormState['tiers']][])('blocks tiers and Save for %s', (_label, tiers) => {
    expect(getRecoveryApplicationDraftReadiness(draft({ tiers }), context({ step: 2 }))).toMatchObject({ detailsValid: true, tiersValid: false, canContinue: false, canSave: false })
  })

  it('rejects a present but unresolved Group', () => {
    const tiers: RecoveryApplicationFormState['tiers'] = new Map([['database', {
      order: 1, description: 'Database', recovery_group: { id: '', name: 'Unavailable Group', vms: [{ name: 'invalid LPAR name!' }] },
    }]])
    expect(getRecoveryApplicationDraftReadiness(draft({ tiers }), context())).toMatchObject({ tiersValid: false, canSave: false })
  })

  it.each([
    ['', false], [' \t\n', false], [' unavailable-policy ', true],
  ])('uses only trimmed policy presence for %j', (policySetId, valid) => {
    expect(getRecoveryApplicationDraftReadiness(draft({ policySetId }), context({ step: 3 }))).toMatchObject({ policySetValid: valid, canContinue: valid, canSave: valid })
  })

  it.each([
    ['Push off without a provider', false, '', [], true],
    ['Push on without a provider', true, '', [airflow], false],
    ['Push on with a missing ID', true, 'gone', [airflow], false],
    ['Push on with eligible Airflow', true, 'airflow', [airflow], true],
    ['Push on with missing credentials', true, 'airflow', [{ ...airflow, credentialStatus: 'missing' }], false],
    ['Push on with no credentials', true, 'airflow', [{ ...airflow, credentialStatus: 'none' }], false],
    ['Push on with SMTP', true, 'airflow', [{ ...airflow, type: 'SMTP' }], false],
  ] satisfies [string, boolean, string, PlatformProviderRecord[], boolean][])(
    '%s', (_label, pushToOrchestrator, orchestrationProviderId, platformProviders, valid) => {
      expect(getRecoveryApplicationDraftReadiness(draft({ pushToOrchestrator, orchestrationProviderId }), context({ step: 4, platformProviders })))
        .toMatchObject({ orchestrationValid: valid, canContinue: true, canSave: valid })
    },
  )

  it.each([
    [1, { policySetId: '', tiers: new Map() }, true],
    [1, { name: '' }, false],
    [2, { name: '', policySetId: '' }, true],
    [2, { tiers: new Map() }, false],
    [3, { name: '', tiers: new Map(), pushToOrchestrator: true, orchestrationProviderId: '' }, true],
    [3, { policySetId: '' }, false],
    [4, { name: '', tiers: new Map(), pushToOrchestrator: true, orchestrationProviderId: '' }, true],
    [4, { policySetId: '' }, false],
  ] satisfies [DraftReadinessContext['step'], Partial<RecoveryApplicationFormState>, boolean][])(
    'selects the current-step predicate at step %s with %j', (step, update, canContinue) => {
      expect(getRecoveryApplicationDraftReadiness(draft(update), context({ step }))).toMatchObject({ canContinue, canSave: false })
    },
  )

  it('blocks tier readiness and Save while Groups load', () => {
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ areGroupsLoading: true }))).toEqual({
      detailsValid: true, tiersValid: false, policySetValid: true, orchestrationValid: true,
      canContinue: true, canSave: false, providersLoaded: true, lockedProvidersError: null, detailsError: null,
      tiersError: { field: 'recoveryGroup', messageKey: 'recovery.application.validation.referencesUnverified' },
      validationError: { field: 'recoveryGroup', messageKey: 'recovery.application.validation.referencesUnverified' },
    })
  })

  it.each([
    ['not loaded', undefined, null, false, null],
    ['loaded empty', [], null, true, 'recovery.application.validation.sourceProviderMissing'],
    ['cached valid data with error', providers, new Error('fetch failed'), false, null],
    ['cached empty data with error', [], {}, false, null],
  ] satisfies [string, ProviderRecord[] | undefined, unknown, boolean, string | null][])(
    'distinguishes locked provider state: %s', (_label, loadedProviders, providersError, providersLoaded, messageKey) => {
      const result = getRecoveryApplicationDraftReadiness(draft(), context({ providers: loadedProviders, providersError, lockedProviders: locks }))
      expect(result).toMatchObject({ detailsValid: false, providersLoaded, canSave: false })
      expect(result.lockedProvidersError).toEqual(messageKey ? { field: 'platform', messageKey, params: { id: 'source' } } : null)
    },
  )

  it.each([undefined, null, false, 0, ''])('treats falsy provider error %j as a successful loaded verdict', providersError => {
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providersError, lockedProviders: locks })))
      .toMatchObject({ providersLoaded: true, lockedProvidersError: null, canSave: true })
  })

  it.each([new Error('fetch failed'), {}, 'failed', true])('blocks cached Create data with truthy error %j', providersError => {
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providersError })))
      .toMatchObject({ detailsValid: false, providersLoaded: false, lockedProvidersError: null, canSave: false })
  })

  it.each([
    ['legacy source', { ...locks, sourceProviderId: null }, providers, 'legacyProviders', undefined],
    ['legacy target', { ...locks, targetProviderId: null }, providers, 'legacyProviders', undefined],
    ['missing source', locks, providers.slice(1), 'sourceProviderMissing', { id: 'source' }],
    ['missing target', locks, providers.slice(0, 1), 'targetProviderMissing', { id: 'target' }],
    ['incompatible source role', locks, providers.map(provider => ({ ...provider, role: 'target' as const })), 'sourceProviderIncompatible', { id: 'source' }],
    ['incompatible target role', locks, providers.map(provider => ({ ...provider, role: 'source' as const })), 'targetProviderIncompatible', { id: 'target' }],
    ['incompatible source type', { ...locks, platform: 'IBM_POWER' }, providers, 'sourceProviderIncompatible', { id: 'source' }],
  ] satisfies [string, LockedProviders, ProviderRecord[], string, { id: string } | undefined][])(
    'reports the stored-provider verdict for %s', (_label, lockedProviders, loadedProviders, key, params) => {
      const result = getRecoveryApplicationDraftReadiness(draft({ platform: '', targetProviderId: '' }), context({ providers: loadedProviders, lockedProviders }))
      expect(result).toMatchObject({ detailsValid: false, canContinue: false, canSave: false, providersLoaded: true })
      expect(result.lockedProvidersError).toEqual({ field: 'platform', messageKey: `recovery.application.validation.${key}`, ...(params ? { params } : {}) })
    },
  )

  it('defers the legacy-provider verdict when providers have not loaded', () => {
    expect(getRecoveryApplicationDraftReadiness(draft(), context({ providers: undefined, lockedProviders: { ...locks, sourceProviderId: null } })))
      .toMatchObject({ detailsValid: false, canSave: false, lockedProvidersError: null, providersLoaded: false })
  })

  it('does not mutate the draft, tiers, nested Group or query records', () => {
    const value = draft()
    for (const tier of value.tiers.values()) {
      tier.recovery_group?.vms.forEach(Object.freeze)
      Object.freeze(tier.recovery_group?.vms)
      Object.freeze(tier.recovery_group)
      Object.freeze(tier)
    }
    Object.freeze(value.tiers)
    Object.freeze(value)
    const current = context({ lockedProviders: Object.freeze({ ...locks }), providers: providers.map(provider => Object.freeze({ ...provider })), platformProviders: [Object.freeze({ ...airflow })] })
    Object.freeze(current.providers)
    Object.freeze(current.platformProviders)
    Object.freeze(current)
    const before = structuredClone({ value, current })
    expect(getRecoveryApplicationDraftReadiness(value, current).canSave).toBe(true)
    expect({ value, current }).toEqual(before)
  })
})


describe('shared functional validation readiness', () => {
  it.each([false, true])('rejects invalid email with Push=%s', pushToOrchestrator => {
    const result = getRecoveryApplicationDraftReadiness(draft({ notificationEmail: 'invalid', pushToOrchestrator }), context())
    expect(result).toMatchObject({ detailsValid: false, canSave: false, validationError: { field: 'notificationEmail', messageKey: 'forms.notificationEmailInvalid' } })
  })
  it('blocks a failed Group query without calling a cached group deleted', () => {
    const result = getRecoveryApplicationDraftReadiness(draft(), context({ groupsError: new Error('offline') }))
    expect(result).toMatchObject({ canSave: false, validationError: { messageKey: 'recovery.application.validation.referencesUnverified' } })
  })
})


describe('Power v2 readiness gate', () => {
  it.each([false, true])('recomputes after version changes, selection and tier edits (Push=%s)', pushToOrchestrator => {
    const hmc: ProviderRecord = { id: 'hmc', name: 'HMC', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' }
    const tier = { order: 1, description: 'Database', recovery_group: { id: 'group', name: 'Database group', vms: [{ name: 'db' }] } } satisfies DraftRecoveryTier
    const state = draft({ platform: 'hmc', targetProviderId: 'hmc', pushToOrchestrator, dagTemplateVersion: 'v2', tiers: new Map([['first', tier], ['second', structuredClone(tier)]]) })
    const current = context({ providers: [hmc], groups: [{ id: 'group', providerId: 'hmc', resources: ['db'], sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines', pushToOrchestrator: true, airflowRunId: 'run' }], templateCatalog: { templates: [{ platform: 'ibm_power', version: 'v1', default: true, description: 'Default' }, { platform: 'ibm_power', version: 'v2', default: false, description: 'v2' }], verified: true } })
    expect(getRecoveryApplicationDraftReadiness(state, current)).toMatchObject({ canSave: false, tiersValid: false, validationError: { params: { name: 'db', tiers: 'first, second' } } })
    for (const dagTemplateVersion of [null, 'v1']) expect(getRecoveryApplicationDraftReadiness({ ...state, dagTemplateVersion }, current).canSave).toBe(true)
    const reordered = { ...state, tiers: new Map([...state.tiers].reverse()) }
    expect(getRecoveryApplicationDraftReadiness(reordered, current)).toMatchObject({ canSave: false, validationError: { params: { tiers: 'second, first' } } })
    state.tiers.delete('second')
    expect(getRecoveryApplicationDraftReadiness(state, current).canSave).toBe(true)
    state.tiers.set('renamed', { ...tier, recovery_group: { ...tier.recovery_group, vms: [] } })
    expect(getRecoveryApplicationDraftReadiness(state, current).canSave).toBe(true)
    state.tiers.set('renamed', tier)
    expect(getRecoveryApplicationDraftReadiness(state, current)).toMatchObject({ canSave: false, validationError: { params: { tiers: 'first, renamed' } } })
  })
})
