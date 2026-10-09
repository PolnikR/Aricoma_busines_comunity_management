import { describe, expect, it } from 'vitest'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { resolveRollbackProviderIds } from './useDeleteRecoveryApplication'

const application: RecoveryApplicationListItem = {
  id: 'finance-recovery',
  pushToOrchestrator: true,
  orchestrationProviderId: 'airflow-01',
  data: {
    application: {
      name: 'Finance Recovery',
      environment: 'prod',
      platform: 'VMWARE',
      source_provider_id: 'vmware-vcenter-01',
      target_provider_id: 'vmware-vcenter-02',
      tiers: {},
    },
  },
}

function withApplication(changes: Partial<RecoveryApplicationListItem['data']['application']>): RecoveryApplicationListItem {
  return { ...application, data: { application: { ...application.data.application, ...changes } } }
}

describe('resolveRollbackProviderIds', () => {
  it('uses the orchestration provider and the stored target provider, not the source', () => {
    expect(resolveRollbackProviderIds(application)).toEqual({
      providerId: 'airflow-01',
      computeProviderId: 'vmware-vcenter-02',
    })
  })

  it('rolls back an IBM Power application on its stored target IBM Power provider', () => {
    expect(resolveRollbackProviderIds(withApplication({
      platform: 'IBM_POWER',
      source_provider_id: 'ibm-power-01',
      target_provider_id: 'ibm-power-02',
    })).computeProviderId).toBe('ibm-power-02')
  })

  it.each([undefined, null, ''])('fails without falling back to the source provider when target_provider_id is %s', (targetProviderId) => {
    expect(() => resolveRollbackProviderIds(withApplication({ target_provider_id: targetProviderId }))).toThrow(
      expect.objectContaining({ code: 'missing_compute_provider' }),
    )
  })

  it('still requires the orchestration provider', () => {
    expect(() => resolveRollbackProviderIds({ ...application, orchestrationProviderId: null })).toThrow(
      expect.objectContaining({ code: 'missing_orchestration_provider' }),
    )
  })
})
