import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { validateRecoveryApplication } from './validateRecoveryApplication'

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
  tiers: new Map(),
}

describe('validateRecoveryApplication', () => {
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
      { id: 'vm_group', sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines' },
      { id: 'lpar_group', sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines' },
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
