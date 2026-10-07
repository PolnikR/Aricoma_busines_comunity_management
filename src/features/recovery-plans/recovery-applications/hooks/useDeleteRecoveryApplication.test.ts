import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
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
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {},
    },
  },
}

function vmwareProvider(id: string, role: 'source' | 'target', orchestratorConnId: string): ProviderRecord {
  return {
    id,
    name: id,
    description: '',
    type: 'VMWARE',
    role,
    ipAddress: '10.0.0.1',
    credentialId: 'vmware-credentials',
    credentialStatus: 'ok',
    orchestratorConnId,
  }
}

const sourceVcenter = vmwareProvider('vmware-vcenter-01', 'source', 'vcenter_default')
const targetVcenter = vmwareProvider('vmware-vcenter-02', 'target', 'vcenter_default_destination')

describe('resolveRollbackProviderIds', () => {
  it('uses the orchestration provider and the target provider of the target connection, not the source', () => {
    expect(resolveRollbackProviderIds(application, [
      sourceVcenter,
      vmwareProvider('vmware-vcenter-03', 'target', 'another_destination'),
      targetVcenter,
    ])).toEqual({
      providerId: 'airflow-01',
      computeProviderId: 'vmware-vcenter-02',
    })
  })

  it('ignores a source provider that shares the target connection', () => {
    expect(resolveRollbackProviderIds(application, [
      vmwareProvider('vmware-vcenter-01', 'source', 'vcenter_default_destination'),
      targetVcenter,
    ]).computeProviderId).toBe('vmware-vcenter-02')
  })

  it('fails without falling back to the source provider when no target uses the target connection', () => {
    expect(() => resolveRollbackProviderIds(application, [sourceVcenter])).toThrow(
      expect.objectContaining({ code: 'missing_compute_provider' }),
    )
  })

  it('fails when several target providers use the target connection', () => {
    expect(() => resolveRollbackProviderIds(application, [
      targetVcenter,
      vmwareProvider('vmware-vcenter-04', 'target', 'vcenter_default_destination'),
    ])).toThrow(expect.objectContaining({
      code: 'ambiguous_compute_provider',
      message: expect.stringContaining('vmware-vcenter-02, vmware-vcenter-04') as unknown,
    }))
  })

  it('blocks an IBM Power rollback because the target provider is not stored', () => {
    const powerApplication: RecoveryApplicationListItem = {
      ...application,
      data: { application: { ...application.data.application, platform: 'IBM_POWER', source_provider_id: 'ibm-power-01' } },
    }

    expect(() => resolveRollbackProviderIds(powerApplication, [targetVcenter])).toThrow(
      expect.objectContaining({ code: 'ibm_power_rollback_unsupported' }),
    )
  })

  it('still requires the orchestration provider', () => {
    expect(() => resolveRollbackProviderIds({ ...application, orchestrationProviderId: null }, [targetVcenter])).toThrow(
      expect.objectContaining({ code: 'missing_orchestration_provider' }),
    )
  })
})
