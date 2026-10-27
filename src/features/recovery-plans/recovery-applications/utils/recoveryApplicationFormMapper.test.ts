import { describe, expect, it } from 'vitest'
import {
  lockedProvidersOf,
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from './recoveryApplicationFormMapper'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

function provider(id: string, type: ProviderRecord['type'], role: 'source' | 'target' = 'source'): ProviderRecord {
  return {
    id,
    name: id,
    description: '',
    type,
    role,
    ipAddress: '10.0.0.1',
    credentialId: 'credentials',
    credentialStatus: 'ok',
  }
}

const providers = [
  provider('vmware-vcenter-01', 'VMWARE'),
  provider('vmware-dr-01', 'VMWARE', 'target'),
  provider('ibm-power-01', 'IBM_POWER'),
  provider('ibm-power-dr-01', 'IBM_POWER', 'target'),
]

const application: RecoveryApplicationListItem = {
  id: 'Finance.json',
  policySetId: 'test_1_hour_ps',
  data: {
    application: {
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'VMWARE',
      source_provider_id: 'vmware-vcenter-01',
      target_provider_id: 'vmware-dr-01',
      tiers: {
        database: {
          order: 1,
          description: 'Database server tier',
          recovery_group: {
            id: 'database_group',
            name: 'database_group',
            description: 'Database recovery group',
            vms: [{ name: 'db-01' }],
          },
        },
      },
    },
  },
}

describe('DAG template configuration round trip', () => {
  it.each([undefined, null, 'release-2027'])('keeps configured %s separate from the deployed version', version => {
    const item = { ...application, deployedTemplateVersion: 'deployed-old', data: { application: { ...application.data.application, dag_template_version: version } } }
    const form = toRecoveryApplicationFormState(item)
    expect(form.dagTemplateVersion).toBe(version ?? null)
    expect(toRecoveryApplicationData(form, providers).application.dag_template_version).toBe(version ?? null)
  })
})

describe('recoveryApplicationFormMapper', () => {
  it.each(['dr-team@example.test', null, undefined])('preserves the exact rich multi-tier wire payload with email %s across local/pushed Create and authoritative Edit', notificationEmail => {
    const record = {
      ...application,
      data: { application: { ...application.data.application, notificationEmail } },
    }
    const state = toRecoveryApplicationFormState(record)
    state.tiers = new Map([
      ['database', {
        order: 1, description: 'Database server tier',
        recovery_group: {
          id: 'database_group', name: 'Database Group', description: 'Database recovery group',
          vms: [{ name: 'db-01', order: 1, hostname: 'db-01.example.test', ip_address: '192.0.2.10', os: 'Linux', cpu: 8, memory_gb: 32, storage_gb: 200 }],
        },
      }],
      ['web', {
        order: 2, description: 'Web server tier',
        recovery_group: { id: 'web_group', name: 'Web Group', description: 'Web recovery group', vms: [{ name: 'web-01', order: 1 }] },
      }],
    ])
    const before = structuredClone(state)
    const recordBefore = structuredClone(record)
    const expected = {
      id: 'Finance', policy_set_id: 'test_1_hour_ps',
      application: {
        name: 'Finance', description: 'Finance recovery', environment: 'prod', platform: 'VMWARE',
        source_provider_id: 'vmware-vcenter-01', target_provider_id: 'vmware-dr-01', notificationEmail: notificationEmail ?? null,
        dag_template_version: null,
        tiers: {
          database: {
            order: 1, description: 'Database server tier',
            recovery_group: {
              id: 'database_group', name: 'Database Group', description: 'Database recovery group',
              vms: [{ name: 'db-01', order: 1, hostname: 'db-01.example.test', ip_address: '192.0.2.10', os: 'Linux', cpu: 8, memory_gb: 32, storage_gb: 200 }],
            },
          },
          web: {
            order: 2, description: 'Web server tier',
            recovery_group: { id: 'web_group', name: 'Web Group', description: 'Web recovery group', vms: [{ name: 'web-01', order: 1 }] },
          },
        },
      },
    }
    for (const pushToOrchestrator of [false, true]) {
      const draft = { ...state, pushToOrchestrator, orchestrationProviderId: 'airflow-01' }
      expect(toRecoveryApplicationData(draft, providers)).toEqual(expected)
      expect(toRecoveryApplicationData({ ...draft, platform: 'draft-source', targetProviderId: 'draft-target' }, [], {
        platform: 'VMWARE', sourceProviderId: 'vmware-vcenter-01', targetProviderId: 'vmware-dr-01',
      })).toEqual(expected)
    }
    expect(state).toEqual(before)
    expect([...state.tiers]).toEqual([...before.tiers])
    expect(record).toEqual(recordBefore)
  })

  it('maps backend data to detached builder state', () => {
    const formState = toRecoveryApplicationFormState(application)

    expect(formState).toMatchObject({
      fileName: 'Finance',
      policySetId: 'test_1_hour_ps',
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'vmware-vcenter-01',
      targetProviderId: 'vmware-dr-01',
    })
    expect(formState.tiers.get('database')).toEqual(application.data.application.tiers['database'])

    formState.tiers.get('database')?.recovery_group?.vms.push({ name: 'db-02' })
    expect(application.data.application.tiers['database']?.recovery_group?.vms).toEqual([{ name: 'db-01' }])
  })

  it('restores the orchestrator toggle without adding it to the request body', () => {
    const pushedApplication: RecoveryApplicationListItem = {
      ...application,
      pushToOrchestrator: true,
    }

    const formState = toRecoveryApplicationFormState(pushedApplication)

    expect(formState.pushToOrchestrator).toBe(true)
    expect(toRecoveryApplicationData(formState, providers)).not.toHaveProperty('pushToOrchestrator')
  })

  it('maps builder state to the submit_recovery_dag contract', () => {
    const data = toRecoveryApplicationData(toRecoveryApplicationFormState(application), providers)

    expect(data).toEqual({
      id: 'Finance',
      policy_set_id: 'test_1_hour_ps',
      application: {
        ...application.data.application,
        notificationEmail: null,
        dag_template_version: null,
        tiers: application.data.application.tiers,
      },
    })
  })

  it('preserves a tier without recovery_group in form state, but refuses to submit it', () => {
    const applicationWithoutGroup: RecoveryApplicationListItem = {
      ...application,
      data: {
        application: {
          ...application.data.application,
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
            },
          },
        },
      },
    }

    const formState = toRecoveryApplicationFormState(applicationWithoutGroup)
    expect(formState.tiers.get('database')).toEqual({
      order: 1,
      description: 'Database server tier',
    })
    expect(() => toRecoveryApplicationData(formState, providers)).toThrow(
      'Tier "database" has no recovery group attached',
    )
  })

  it('preserves an environment value introduced by the backend', () => {
    const formState = toRecoveryApplicationFormState({
      ...application,
      data: {
        application: {
          ...application.data.application,
          environment: 'production',
        },
      },
    })

    expect(formState.environment).toBe('production')
    expect(toRecoveryApplicationData(formState, providers).application.environment).toBe('production')
  })

  it('selects the provider named by source_provider_id, not by platform', () => {
    const formState = toRecoveryApplicationFormState({
      ...application,
      data: { application: { ...application.data.application, platform: 'IBM_POWER', source_provider_id: 'ibm-power-01' } },
    })

    expect(formState.platform).toBe('ibm-power-01')
  })

  it.each([
    ['IBM Power', 'ibm-power-01', 'IBM_POWER'],
    ['VMware', 'vmware-vcenter-01', 'VMWARE'],
  ])('sends the %s provider type as platform and its id as source_provider_id', (_label, providerId, type) => {
    const formState = { ...toRecoveryApplicationFormState(application), platform: providerId }

    expect(toRecoveryApplicationData(formState, providers).application).toMatchObject({
      platform: type,
      source_provider_id: providerId,
    })
  })

  it('sends the selected target provider id and no Airflow connections', () => {
    const formState = { ...toRecoveryApplicationFormState(application), platform: 'ibm-power-01', targetProviderId: 'ibm-power-dr-01' }

    const sent = toRecoveryApplicationData(formState, providers).application
    expect(sent).toMatchObject({ source_provider_id: 'ibm-power-01', target_provider_id: 'ibm-power-dr-01' })
    expect(sent).not.toHaveProperty('source_connection')
    expect(sent).not.toHaveProperty('target_connection')
  })

  it('sends one IBM Power provider as both source and target', () => {
    const formState = { ...toRecoveryApplicationFormState(application), platform: 'ibm-power-01', targetProviderId: 'ibm-power-01' }

    expect(toRecoveryApplicationData(formState, providers).application).toMatchObject({
      platform: 'IBM_POWER',
      source_provider_id: 'ibm-power-01',
      target_provider_id: 'ibm-power-01',
    })
  })

  it.each([
    ['an address', 'dr-team@example.test', 'dr-team@example.test'],
    ['null', null, null],
    ['no value', undefined, null],
  ])('keeps a stored notification email of %s when saving', (_label, stored, sent) => {
    const formState = toRecoveryApplicationFormState({
      ...application,
      data: { application: { ...application.data.application, notificationEmail: stored } },
    })

    expect(formState.notificationEmail).toBe(sent)
    expect(toRecoveryApplicationData(formState, providers).application.notificationEmail).toBe(sent)
  })

  it.each([undefined, null])('leaves the target empty for a legacy record with target_provider_id %s', (targetProviderId) => {
    const formState = toRecoveryApplicationFormState({
      ...application,
      data: { application: { ...application.data.application, target_provider_id: targetProviderId } },
    })

    expect(formState.targetProviderId).toBe('')
  })

  it('refuses to submit a target provider that is not in the providers dataset', () => {
    const formState = { ...toRecoveryApplicationFormState(application), targetProviderId: 'vmware-dr-gone' }

    expect(() => toRecoveryApplicationData(formState, providers)).toThrow('Target provider "vmware-dr-gone" is not available')
  })

  it('reads a legacy provider id stored in platform and saves it in the new shape', () => {
    const legacy: RecoveryApplicationListItem = {
      ...application,
      data: { application: { ...application.data.application, platform: 'vmware-vcenter-01', source_provider_id: undefined } },
    }

    const formState = toRecoveryApplicationFormState(legacy)

    expect(formState.platform).toBe('vmware-vcenter-01')
    expect(toRecoveryApplicationData(formState, providers).application).toMatchObject({
      platform: 'VMWARE',
      source_provider_id: 'vmware-vcenter-01',
    })
  })

  it.each(['VMWARE', 'IBM_POWER', 'vmware'])('does not guess a provider from a bare %s platform', (platform) => {
    const formState = toRecoveryApplicationFormState({
      ...application,
      data: { application: { ...application.data.application, platform, source_provider_id: null } },
    })

    expect(formState.platform).toBe('')
  })

  it('refuses to submit a provider that is not in the providers dataset', () => {
    const formState = { ...toRecoveryApplicationFormState(application), platform: 'vmware-gone' }

    expect(() => toRecoveryApplicationData(formState, providers)).toThrow('Source provider "vmware-gone" is not available')
  })

  describe('locked providers of a saved application', () => {
    it('locks the stored platform and both provider ids', () => {
      expect(lockedProvidersOf({
        ...application,
        data: { application: { ...application.data.application, platform: 'ibm_power', source_provider_id: 'ibm-power-01', target_provider_id: 'ibm-power-01' } },
      })).toEqual({ platform: 'ibm_power', sourceProviderId: 'ibm-power-01', targetProviderId: 'ibm-power-01' })
    })

    it.each([
      ['no source provider id', { source_provider_id: null }, { sourceProviderId: null, targetProviderId: 'vmware-dr-01' }],
      ['no target provider id', { target_provider_id: undefined }, { sourceProviderId: 'vmware-vcenter-01', targetProviderId: null }],
      ['no provider ids', { source_provider_id: '', target_provider_id: null }, { sourceProviderId: null, targetProviderId: null }],
    ])('still locks a legacy record with %s, keeping the missing ids empty', (_label, changes, ids) => {
      expect(lockedProvidersOf({ ...application, data: { application: { ...application.data.application, ...changes } } }))
        .toEqual({ platform: 'VMWARE', ...ids })
    })

    it('sends the original platform and provider ids, even when the form or the providers list changed', () => {
      const locked = { platform: 'ibm_power', sourceProviderId: 'ibm-power-gone', targetProviderId: 'ibm-power-gone' }
      const formState = { ...toRecoveryApplicationFormState(application), platform: 'vmware-vcenter-01', targetProviderId: 'vmware-dr-01' }

      expect(toRecoveryApplicationData(formState, [], locked).application).toMatchObject({
        platform: 'ibm_power',
        source_provider_id: 'ibm-power-gone',
        target_provider_id: 'ibm-power-gone',
      })
    })
  })
})
