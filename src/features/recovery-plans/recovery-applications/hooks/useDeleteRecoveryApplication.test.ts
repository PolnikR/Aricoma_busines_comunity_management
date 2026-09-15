import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { resolveRollbackProviderIds } from './useDeleteRecoveryApplication'

const application: RecoveryApplicationListItem = {
  id: 'finance-recovery',
  pushToOrchestrator: true,
  orchestrationProviderId: 'airflow-selected-by-application',
  data: {
    application: {
      name: 'Finance Recovery',
      environment: 'prod',
      platform: 'vmware-source-01',
      tiers: {},
    },
  },
}

function targetProvider(id: string): ProviderRecord {
  return {
    id,
    name: id,
    description: 'Target VMware provider',
    type: 'VMWARE',
    role: 'target',
    ipAddress: '10.0.0.1',
    credentialId: 'vmware-credentials',
    credentialStatus: 'ok',
  }
}

describe('resolveRollbackProviderIds', () => {
  it('uses the application orchestration provider and first target VMware provider', () => {
    expect(resolveRollbackProviderIds(application, [
      targetProvider('vmware-target-first'),
      targetProvider('vmware-target-second'),
    ])).toEqual({
      providerId: 'airflow-selected-by-application',
      computeProviderId: 'vmware-target-first',
    })
  })
})
