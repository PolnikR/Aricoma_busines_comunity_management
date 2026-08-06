import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  mapRecoveryGroupApiRecord,
  toRecoveryGroup,
  toRecoveryGroupJson,
  toRecoveryGroupSubmitPayload,
} from './mapRecoveryGroups'
import type { ValidatedRecoveryGroupDraft } from '../api/recoveryGroupsValidation'

const vmwareProvider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'VMware inventory',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

const validatedVmDraft: ValidatedRecoveryGroupDraft = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database tier',
  providerId: 'vmware-vcenter-01',
  policySetId: 'tier2-apps',
  resources: ['db-vm-01', 'db-vm-02'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  configuration: {
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
  },
  vmMetadataByName: {
    'db-vm-01': { hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
  },
}

describe('toRecoveryGroupSubmitPayload', () => {
  it('embeds captured VM metadata and assigns order by array position', () => {
    const payload = toRecoveryGroupSubmitPayload(validatedVmDraft, 'database_group')

    expect(payload.vms).toEqual([
      { name: 'db-vm-01', order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
      { name: 'db-vm-02', order: 2 },
    ])
  })

  it('submits volume-type groups unaffected, with bare {name} vms/volumes', () => {
    const volumeDraft: ValidatedRecoveryGroupDraft = {
      ...validatedVmDraft,
      id: 'storage_group',
      resources: ['VOL-01'],
      configuration: {
        sourceCategory: 'storage_system',
        workloadType: 'ibm_flashsystem',
        resourceType: 'volume',
      },
      vmMetadataByName: undefined,
    }

    const payload = toRecoveryGroupSubmitPayload(volumeDraft, 'storage_group')

    expect(payload.vms).toEqual([])
    expect(payload.volumes).toEqual([{ name: 'VOL-01' }])
  })
})

describe('toRecoveryGroupJson', () => {
  it('embeds VM metadata for an already-created group', () => {
    const group = toRecoveryGroup(validatedVmDraft, 'database_group')
    const payload = toRecoveryGroupJson(group)

    expect(payload.vms).toEqual([
      { name: 'db-vm-01', order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
      { name: 'db-vm-02', order: 2 },
    ])
  })
})

describe('mapRecoveryGroupApiRecord', () => {
  it('round-trips VM metadata from a GET response into vmMetadataByName', () => {
    const record = {
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [
        { name: 'db-vm-01', order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
        { name: 'db-vm-02' },
      ],
      volumes: [],
    }

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.vmMetadataByName).toEqual({
      'db-vm-01': { order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
      'db-vm-02': {},
    })
  })
})
