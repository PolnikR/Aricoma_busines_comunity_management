import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { validateRecoveryApplication as validate, validateRecoveryApplicationTemplate, type ApplicationValidationOptions } from './validateRecoveryApplication'

function fixtureValue<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected fixture value')
  return value
}

const templateCatalog = { templates: [{ platform: 'vmware', version: 'future-3', default: true, description: 'Default' }], verified: true }
function validateRecoveryApplication(draft: RecoveryApplicationFormState, providers: ProviderRecord[], platformProviders: PlatformProviderRecord[] = [], options: Partial<ApplicationValidationOptions> = {}) {
  const source = options.lockedProviders ? options.lockedProviders.sourceProviderId : draft.platform
  const power = options.lockedProviders ? options.lockedProviders.platform.toUpperCase() === 'IBM_POWER' : source?.startsWith('power')
  return validate(draft, providers, platformProviders, { templateCatalog, groups: [{ id: 'fixture', providerId: source, resources: [], sourceCategory: 'backup_system_workload', workloadType: power ? 'ibm_power_virtual_machines' : 'vmware_virtual_machines', pushToOrchestrator: true, airflowRunId: 'run' }], ...options })
}

function provider(id: string, type: ProviderRecord['type'], role: 'source' | 'target'): ProviderRecord {
  return { id, name: id, description: '', type, role, ipAddress: '10.0.0.1', credentialId: 'creds', credentialStatus: 'ok' }
}

const providers = [
  provider('vmware-source', 'VMWARE', 'source'),
  provider('vmware-target', 'VMWARE', 'target'),
  provider('power-target', 'IBM_POWER', 'target'),
  provider('power-hmc', 'IBM_POWER', 'source'),
]

const formState: RecoveryApplicationFormState = {
  fileName: 'finance_recovery',
  policySetId: 'policy-1',
  pushToOrchestrator: false,
  name: 'Finance',
  description: 'Finance recovery',
  environment: 'prod',
  platform: 'vmware-source',
  orchestrationProviderId: '',
  targetProviderId: 'vmware-target',
  notificationEmail: null,
  tiers: new Map([['fixture', { order: 1, description: 'Fixture', recovery_group: { id: 'fixture', name: 'Fixture', vms: [] } }]]),
}

describe('template submit validation', () => {
  const templates = [{ platform: 'vmware', version: 'future-3', default: true, description: 'Server default' }]
  it.each([undefined, { templates: [], verified: true }, { templates, verified: false }])('allows only default Save when catalog is unavailable: %j', catalog => {
    expect(validateRecoveryApplicationTemplate(formState, catalog)).toBeNull()
    expect(validateRecoveryApplicationTemplate({ ...formState, pushToOrchestrator: true }, catalog)).not.toBeNull()
    expect(validateRecoveryApplicationTemplate({ ...formState, dagTemplateVersion: 'future-3' }, catalog)).not.toBeNull()
  })
  it('accepts the server default and explicit supported versions after verification', () => {
    const catalog = { templates, verified: true }
    expect(validateRecoveryApplicationTemplate({ ...formState, pushToOrchestrator: true }, catalog)).toBeNull()
    expect(validateRecoveryApplicationTemplate({ ...formState, dagTemplateVersion: 'future-3' }, catalog)).toBeNull()
    expect(validateRecoveryApplicationTemplate({ ...formState, dagTemplateVersion: 'removed' }, catalog)?.messageKey).toBe('recovery.application.lifecycle.templateUnknown')
  })
  it('treats ambiguous defaults as unavailable', () => {
    const catalog = { templates: [...templates, { platform: 'vmware', version: 'other', default: true, description: 'Another default' }], verified: true }
    expect(validateRecoveryApplicationTemplate({ ...formState, pushToOrchestrator: true }, catalog)).not.toBeNull()
  })
})

describe('validateRecoveryApplication', () => {
  it.each([false, true])('rejects zero tiers consistently (locked=%s)', locked => {
    const before = structuredClone(formState)
    expect(validateRecoveryApplication({ ...formState, tiers: new Map() }, providers, [], {
      groups: [],
      lockedProviders: locked ? { platform: 'VMWARE', sourceProviderId: 'vmware-source', targetProviderId: 'vmware-target' } : null,
    })).toEqual({ field: 'recoveryGroup', messageKey: 'recovery.application.validation.tiersRequired' })
    expect(formState).toEqual(before)
  })

  it.each([
    [{ fileName: '', name: '', description: '', policySetId: '' }, 'fileName', 'recovery.application.validation.fileNameRequired'],
    [{ name: '', description: '', policySetId: '' }, 'name', 'alerts.pleaseEnterName'],
    [{ description: '', policySetId: '' }, 'description', 'alerts.pleaseEnterDescription'],
    [{ policySetId: '' }, 'recoveryGroup', 'recovery.application.validation.recoveryGroupRequired'],
    [{}, 'recoveryGroup', 'recovery.application.validation.recoveryGroupRequired'],
  ] as const)('validates Details then Tiers before Policy and Push: %j', (patch, field, messageKey) => {
    const draft: RecoveryApplicationFormState = {
      ...formState, pushToOrchestrator: true, orchestrationProviderId: 'gone',
      tiers: new Map([['database', { order: 1, description: 'Unassigned' }]]), ...patch,
    }
    expect(validateRecoveryApplication(draft, providers, [], { groups: [] })).toEqual({ field, messageKey, ...(field === 'recoveryGroup' ? { params: { tier: 'database' } } : {}) })
  })

  it('accepts a target provider of the source type', () => {
    expect(validateRecoveryApplication(formState, providers)).toBeNull()
  })

  it.each([
    ['KEYCLOAK', 'ok'],
    ['SMTP', 'ok'],
    ['BACKEND', 'ok'],
    ['AIRFLOW', 'missing'],
  ] as const)('rejects a %s orchestration provider with %s credentials on push', (type, credentialStatus) => {
    const platformProviders = [{ id: 'platform-01', type, credentialStatus }] as PlatformProviderRecord[]
    const draft = { ...formState, pushToOrchestrator: true, orchestrationProviderId: 'platform-01' }
    expect(validateRecoveryApplication(draft, providers, platformProviders)).toEqual({
      field: 'platform',
      messageKey: 'recovery.application.validation.platformProviderRequired',
    })
  })

  it('accepts an AIRFLOW orchestration provider with valid credentials on push', () => {
    const platformProviders = [{ id: 'airflow-01', type: 'AIRFLOW', credentialStatus: 'ok' }] as PlatformProviderRecord[]
    expect(validateRecoveryApplication({ ...formState, pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' }, providers, platformProviders)).toBeNull()
  })

  it('accepts the same IBM Power provider as source and target', () => {
    expect(validateRecoveryApplication({ ...formState, platform: 'power-hmc', targetProviderId: 'power-hmc' }, providers)).toBeNull()
  })

  it.each([
    ['source', { sourceProviderId: null, targetProviderId: 'vmware-target' }],
    ['target', { sourceProviderId: 'vmware-source', targetProviderId: null }],
    ['source and target', { sourceProviderId: null, targetProviderId: null }],
  ])('rejects a saved application without a stored %s provider id', (_label, ids) => {
    expect(validateRecoveryApplication(formState, providers, [], { lockedProviders: { platform: 'VMWARE', ...ids } })).toEqual({
      field: 'platform',
      messageKey: 'recovery.application.validation.legacyProviders',
    })
  })

  describe('stored providers of a saved application', () => {
    const vmwareLocked = { platform: 'VMWARE', sourceProviderId: 'vmware-source', targetProviderId: 'vmware-target' }

    it('accepts stored providers that still exist and fit the platform', () => {
      expect(validateRecoveryApplication(formState, providers, [], { lockedProviders: vmwareLocked })).toBeNull()
    })

    it.each([
      ['source', { sourceProviderId: 'vmware-gone' }, 'sourceProviderMissing', 'vmware-gone'],
      ['target', { targetProviderId: 'vmware-target-gone' }, 'targetProviderMissing', 'vmware-target-gone'],
    ])('rejects a %s provider that no longer exists', (_label, ids, key, id) => {
      expect(validateRecoveryApplication(formState, providers, [], { lockedProviders: { ...vmwareLocked, ...ids } })).toEqual({
        field: 'platform',
        messageKey: `recovery.application.validation.${key}`,
        params: { id },
      })
    })

    it.each([
      ['a source of another type', { sourceProviderId: 'power-target' }, 'sourceProviderIncompatible', 'power-target'],
      ['a VMware source with role=target', { sourceProviderId: 'vmware-target' }, 'sourceProviderIncompatible', 'vmware-target'],
      ['a VMware target with role=source', { targetProviderId: 'vmware-source' }, 'targetProviderIncompatible', 'vmware-source'],
    ])('rejects %s', (_label, ids, key, id) => {
      expect(validateRecoveryApplication(formState, providers, [], { lockedProviders: { ...vmwareLocked, ...ids } })).toEqual({
        field: 'platform',
        messageKey: `recovery.application.validation.${key}`,
        params: { id },
      })
    })

    it('accepts one IBM Power provider of any role as source and target', () => {
      const locked = { platform: 'ibm_power', sourceProviderId: 'power-target', targetProviderId: 'power-target' }
      expect(validateRecoveryApplication(formState, providers, [], { lockedProviders: locked })).toBeNull()
    })
  })

  it.each([
    ['missing', ''],
    ['of another type', 'power-target'],
    ['unknown', 'vmware-target-gone'],
  ])('rejects a target provider that is %s', (_label, targetProviderId) => {
    expect(validateRecoveryApplication({ ...formState, targetProviderId }, providers)).toEqual({
      field: 'targetProvider',
      messageKey: 'recovery.application.validation.targetProviderRequired',
    })
  })

  describe('recovery groups', () => {
    const groups = [
      { pushToOrchestrator: true, airflowRunId: 'run-1', id: 'vm_group', providerId: 'vmware-source', resources: ['db01', 'db 01'], sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines' },
      { pushToOrchestrator: true, airflowRunId: 'run-2', id: 'lpar_group', providerId: 'power-hmc', resources: ['db01', 'aix01', 'A', 'lpar.prod_01-a', 'x'.repeat(47), 'bad name', '-lpar', '.lpar', 'lpar/01', 'x'.repeat(48), ''], sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines' },
    ] as const
    const powerProviders = [provider('power-hmc', 'IBM_POWER', 'source')]

    function withGroup(groupId: string, vmNames: string[], state: Partial<RecoveryApplicationFormState> = {}): RecoveryApplicationFormState {
      return {
        ...formState,
        ...state,
        tiers: new Map([['database', {
          order: 1,
          description: 'Database tier',
          recovery_group: { id: groupId, name: `${groupId} name`, vms: vmNames.map(name => ({ name })) },
        }]]),
      }
    }

    it('does not bypass missing Group checks', () => {
      const draft = withGroup('gone_group', ['unknown-vm'], { policySetId: 'nonempty-policy-absent-from-query' })
      expect(validateRecoveryApplication(draft, providers)?.messageKey).toBe('recovery.application.validation.recoveryGroupMissing')
      expect(validateRecoveryApplication(draft, providers, [], { groups: [] })).toEqual({
        field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupMissing',
        params: { tier: 'database', group: 'gone_group name' },
      })
    })

    describe.each(['VMWARE', 'IBM_POWER'] as const)('publication for %s', platform => {
      it.each([
        [true, 'run-1', true], [false, 'run-1', false], [true, null, false],
        [true, '', false], [true, '   ', false], [true, undefined, false], [undefined, 'run-1', false],
      ] as const)('validates pushed=%s and run ID=%s', (pushToOrchestrator, airflowRunId, allowed) => {
        const power = platform === 'IBM_POWER'
        const current = { ...groups[power ? 1 : 0], pushToOrchestrator, airflowRunId }
        const state = withGroup(current.id, ['db01'], power ? { platform: 'power-hmc', targetProviderId: 'power-hmc' } : {})
        const before = structuredClone(state)
        for (const locked of [false, true]) {
          for (const push of [false, true]) {
            const result = validateRecoveryApplication({ ...state, pushToOrchestrator: push, orchestrationProviderId: 'airflow-01' }, providers,
              [{ id: 'airflow-01', type: 'AIRFLOW', credentialStatus: 'ok' }] as PlatformProviderRecord[], {
                groups: [current],
                lockedProviders: locked ? { platform, sourceProviderId: state.platform, targetProviderId: state.targetProviderId } : null,
              })
            expect(result).toEqual(allowed ? null : {
              field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupNotPublished',
              params: { tier: 'database', group: current.id + ' name' },
            })
          }
        }
        expect(state).toEqual(before)
      })
    })

    it('accepts groups of the application platform', () => {
      expect(validateRecoveryApplication(withGroup('vm_group', ['db 01']), providers, [], { groups: [...groups] })).toBeNull()
    })

    it('rejects a group that no longer exists', () => {
      expect(validateRecoveryApplication(withGroup('gone_group', []), providers, [], { groups: [...groups] })).toEqual({
        field: 'recoveryGroup',
        messageKey: 'recovery.application.validation.recoveryGroupMissing',
        params: { tier: 'database', group: 'gone_group name' },
      })
    })

    it('rejects a group of another platform', () => {
      expect(validateRecoveryApplication(withGroup('lpar_group', ['aix01']), providers, [], { groups: [...groups] })).toEqual({
        field: 'recoveryGroup',
        messageKey: 'recovery.application.validation.recoveryGroupPlatformMismatch',
        params: { tier: 'database', group: 'lpar_group name' },
      })
    })

    it('uses the stored platform of locked providers', () => {
      const locked = { platform: 'ibm_power', sourceProviderId: 'power-target', targetProviderId: 'power-target' }
      expect(validateRecoveryApplication(withGroup('vm_group', []), providers, [], { groups: [...groups], lockedProviders: locked }))
        .toMatchObject({ messageKey: 'recovery.application.validation.recoveryGroupPlatformMismatch' })
    })

    it.each(['aix01', 'A', 'lpar.prod_01-a', 'x'.repeat(47)])('accepts the IBM Power LPAR name %s', (name) => {
      const state = withGroup('lpar_group', [name], { platform: 'power-hmc', targetProviderId: 'power-hmc' })
      expect(validateRecoveryApplication(state, powerProviders, [], { groups: [...groups] })).toBeNull()
    })

    it.each(['bad name', '-lpar', '.lpar', 'lpar/01', 'x'.repeat(48), ''])('rejects the IBM Power LPAR name "%s"', (name) => {
      const state = withGroup('lpar_group', [name], { platform: 'power-hmc', targetProviderId: 'power-hmc' })
      expect(validateRecoveryApplication(state, powerProviders, [], { groups: [...groups] })).toEqual({
        field: 'recoveryGroup',
        messageKey: 'recovery.application.validation.lparNameInvalid',
        params: { tier: 'database', name },
      })
    })
  })
})


describe('functional consistency rules', () => {
  const airflow: PlatformProviderRecord[] = [{ id: 'airflow', name: 'Airflow', port: 8080, type: 'AIRFLOW', role: 'source', credentialStatus: 'ok' }]
  function configuration(power: boolean, version: string | null, push: boolean) {
    const source = power ? 'power-hmc' : 'vmware-source'
    const groups = [{ id: 'g', providerId: source, sourceCategory: 'backup_system_workload' as const, workloadType: power ? 'ibm_power_virtual_machines' as const : 'vmware_virtual_machines' as const, pushToOrchestrator: true, airflowRunId: 'run', resources: ['db'] }]
    const tier = { order: 1, description: 'DB', recovery_group: { id: 'g', name: 'Database group', vms: [{ name: 'db' }] } }
    const state: RecoveryApplicationFormState = { ...formState, platform: source, targetProviderId: power ? source : 'vmware-target', dagTemplateVersion: version, pushToOrchestrator: push, orchestrationProviderId: 'airflow', tiers: new Map([['first', tier], ['second', { ...tier, order: 2 }]]) }
    const catalog = { templates: (power ? ['v1', 'v2', 'v3'] : ['v1', 'v2']).map(version => ({ platform: power ? 'ibm_power' : 'vmware', version, default: version === 'v1', description: version })), verified: true }
    return { state, options: { groups, templateCatalog: catalog } }
  }
  describe.each([false, true])('Push=%s', push => {
    it.each([[false, null], [false, 'v1'], [false, 'v2'], [true, null], [true, 'v1'], [true, 'v2'], [true, 'v3']] as const)('gates duplicates for Power=%s version=%s', (power, version) => {
      const { state, options } = configuration(power, version, push)
      for (const locked of [false, true]) {
        const result = validate(state, providers, airflow, { ...options, lockedProviders: locked ? { platform: power ? 'IBM_POWER' : 'VMWARE', sourceProviderId: state.platform, targetProviderId: state.targetProviderId } : null })
        expect(result).toEqual(version && version !== 'v1' ? { field: 'workloads', templateDependent: true, messageKey: 'recovery.application.validation.duplicateWorkloadAcrossTiers', params: { name: 'db', tiers: 'first, second' } } : null)
      }
    })
    it('blocks an invalid email before submitting', () => {
      const { state, options } = configuration(false, null, push)
      expect(validate({ ...state, notificationEmail: 'invalid' }, providers, airflow, options)).toEqual({ field: 'notificationEmail', messageKey: 'forms.notificationEmailInvalid' })
    })
    it.each([false, true])('blocks normalized collisions for Power=%s', power => {
      const { state, options } = configuration(power, power ? 'v3' : 'v2', push)
      const original = fixtureValue(state.tiers.get('first'))
      const group = fixtureValue(original.recovery_group)
      options.groups[0] = { ...fixtureValue(options.groups[0]), resources: ['db.a', 'db_a'] }
      state.tiers = new Map([['first', { ...original, recovery_group: { ...group, vms: [{ name: 'db.a' }, { name: 'db_a' }] } }]])
      expect(validate(state, providers, airflow, options)).toMatchObject({ templateDependent: true, messageKey: 'recovery.application.validation.workloadTaskGroupCollision', params: { tier: 'first', first: 'db.a', second: 'db_a' } })
      state.tiers = new Map([
        ['db.one', { ...original, recovery_group: { ...group, vms: [{ name: 'db.a' }] } }],
        ['db_one', { ...original, recovery_group: { ...group, vms: [{ name: 'db_a' }] } }],
      ])
      expect(validate(state, providers, airflow, options)).toMatchObject({ templateDependent: true, messageKey: 'recovery.application.validation.tierTaskGroupCollision', params: { first: 'db.one', second: 'db_one', id: 'tier_01_db_one' } })
      expect(validate(state, providers, airflow, { ...options, groups: [] })).toMatchObject({ messageKey: 'recovery.application.validation.recoveryGroupMissing' })
    })

    it('resolves null using the verified server default without changing the draft', () => {
      const { state, options } = configuration(true, null, push)
      options.templateCatalog.templates = options.templateCatalog.templates.map(template => ({ ...template, default: template.version === 'v3' }))
      expect(validate(state, providers, airflow, options)).toMatchObject({ templateDependent: true, messageKey: 'recovery.application.validation.duplicateWorkloadAcrossTiers' })
      expect(state.dagTemplateVersion).toBeNull()
    })
    it('uses the source provider rather than target or embedded group snapshot', () => {
      const { state, options } = configuration(false, null, push)
      expect(validate(state, providers, airflow, { ...options, groups: [{ ...fixtureValue(options.groups[0]), providerId: 'vmware-target' }] })).toMatchObject({ messageKey: 'recovery.application.validation.recoveryGroupSourceMismatch', params: { tier: 'first', group: 'Database group', expected: 'vmware-source', actual: 'vmware-target' } })
    })
  })
  it('blocks duplicate LPARs within one tier only for explicit v2', () => {
    const { state, options } = configuration(true, 'v2', false)
    state.tiers.delete('second')
    fixtureValue(fixtureValue(state.tiers.get('first')).recovery_group).vms.push({ name: 'db' })
    expect(validate(state, providers, airflow, options)).toEqual({ field: 'workloads', templateDependent: true, messageKey: 'recovery.application.validation.duplicateWorkloadWithinTier', params: { name: 'db', tier: 'first' } })
    expect(validate({ ...state, dagTemplateVersion: null }, providers, airflow, options)).toBeNull()
    expect(validate({ ...state, dagTemplateVersion: 'v1' }, providers, airflow, options)).toBeNull()
  })
  it('rejects a selected workload absent from current query resources', () => {
    const { state, options } = configuration(false, null, false)
    expect(validate(state, providers, airflow, { ...options, groups: [{ ...fixtureValue(options.groups[0]), resources: [] }] })).toMatchObject({ messageKey: 'recovery.application.validation.workloadMissing', params: { name: 'db', tier: 'first' } })
  })
})
