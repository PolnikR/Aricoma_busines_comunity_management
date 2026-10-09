import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
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
  tiers: new Map(),
}

describe('validateRecoveryApplication', () => {
  it('accepts a target provider of the source type', () => {
    expect(validateRecoveryApplication(formState, providers)).toBeNull()
  })

  it('accepts the same IBM Power provider as source and target', () => {
    expect(validateRecoveryApplication({ ...formState, platform: 'power-hmc', targetProviderId: 'power-hmc' }, providers)).toBeNull()
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
})
