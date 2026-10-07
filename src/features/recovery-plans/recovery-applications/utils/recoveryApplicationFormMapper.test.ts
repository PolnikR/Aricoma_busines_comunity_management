import { describe, expect, it } from 'vitest'
import {
  toRecoveryApplicationData,
  toRecoveryApplicationFormState,
} from './recoveryApplicationFormMapper'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

function provider(id: string, type: ProviderRecord['type']): ProviderRecord {
  return {
    id,
    name: id,
    description: '',
    type,
    role: 'source',
    ipAddress: '10.0.0.1',
    credentialId: 'credentials',
    credentialStatus: 'ok',
  }
}

const providers = [provider('vmware-vcenter-01', 'VMWARE'), provider('ibm-power-01', 'IBM_POWER')]

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
      source_connection: 'vcenter_special',
      target_connection: 'vcenter_dr',
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

describe('recoveryApplicationFormMapper', () => {
  it('maps backend data to detached builder state', () => {
    const formState = toRecoveryApplicationFormState(application)

    expect(formState).toMatchObject({
      fileName: 'Finance',
      policySetId: 'test_1_hour_ps',
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'vmware-vcenter-01',
      sourceConnection: 'vcenter_special',
      targetConnection: 'vcenter_dr',
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
})
