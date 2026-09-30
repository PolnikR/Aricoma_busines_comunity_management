import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  mapRecoveryGroupApiRecord,
  toRecoveryGroup,
  toRecoveryGroupJson,
  toRecoveryGroupReadRecord,
  toRecoveryGroupSubmitPayload,
} from './mapRecoveryGroups'
import { RecoveryGroupRecord } from '@/generated/query/zod'
import type { ValidatedRecoveryGroupDraft } from '../api/recoveryGroupsValidation'

// Fixtures go through the generated schema so contract defaults (e.g. topology)
// apply, exactly like a parsed GET response.
function readRecord(input: RecoveryGroupRecord) {
  return toRecoveryGroupReadRecord(RecoveryGroupRecord.parse(input))
}

const vmwareProvider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'VMware inventory',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

const flashSystemProvider: ProviderRecord = {
  id: 'ibm-flashsystem-01',
  name: 'IBM FlashSystem',
  description: 'Storage inventory',
  type: 'FLASHCOPY',
  role: 'source',
  ipAddress: '10.99.99.246',
  credentialId: 'ibm-admin',
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
  orchestrationProviderId: 'airflow-01',
  pushToOrchestrator: false,
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

  it('carries pushToOrchestrator through, with airflowRunId unknown at create time', () => {
    const group = toRecoveryGroup(validatedVmDraft, 'database_group')

    expect(group.pushToOrchestrator).toBe(false)
    expect(group.airflowRunId).toBeNull()
  })
})

describe('mapRecoveryGroupApiRecord', () => {
  it('defaults a legacy VM record to local topology without losing VM metadata', () => {
    const record = readRecord({
      id: 'legacy-vm',
      name: 'Legacy VM',
      provider_id_vm: 'vmware-vcenter-01',
      vms: [{ name: 'db-vm-01', hostname: 'db01.sampleapp.local' }],
    })

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.topology).toBe('local')
    expect(group.metroMirrorMode).toBeNull()
    expect(group.consistencyGroupId).toBeNull()
    expect(group.auxiliaryNamesByVolume).toEqual({})
    expect(group.vmMetadataByName?.['db-vm-01']).toEqual({ hostname: 'db01.sampleapp.local' })
    expect(group.rawRecord).toBe(record)
  })

  it('keeps Metro Mirror topology and auxiliary names for a VM group', () => {
    const record = readRecord({
      id: 'metro-vm',
      name: 'Metro VM',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: 'ibm-flashsystem-01',
      topology: 'metro_mirror',
      metro_mirror: { mode: 'existing', consistency_group_id: '001' },
      vms: [{ name: 'db-vm-01', hostname: 'db01.sampleapp.local' }],
      volumes: [{ name: 'VOL-01', auxiliary_name: 'AUX-01' }, { name: 'VOL-02', auxiliary_name: null }],
    })

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider, flashSystemProvider])

    expect(group).toMatchObject({
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: '001',
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01', 'VOL-02'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    })
    expect(toRecoveryGroupJson(group)).toBe(record)
  })

  it('keeps managed mode and auxiliary names for a volume group', () => {
    const record = readRecord({
      id: 'metro-volume',
      name: 'Metro Volume',
      provider_id_volume: 'ibm-flashsystem-01',
      topology: 'metro_mirror',
      metro_mirror: { mode: 'managed', consistency_group_id: 'CG-7' },
      volumes: [{ name: 'VOL-01', auxiliary_name: 'AUX-01' }],
    })

    const group = mapRecoveryGroupApiRecord(record, [flashSystemProvider])

    expect(group).toMatchObject({
      topology: 'metro_mirror',
      metroMirrorMode: 'managed',
      consistencyGroupId: 'CG-7',
      providerId: 'ibm-flashsystem-01',
      resources: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    })
    expect(group.rawRecord).toBe(record)
  })

  it('round-trips VM metadata from a GET response into vmMetadataByName', () => {
    // SPEC GAP: the generated RecoveryVM declares only `name`, so the metadata is
    // added after parsing.
    const record = {
      ...readRecord({
        id: 'database_group',
        name: 'Database group',
        description: 'Database tier',
        provider_id_vm: 'vmware-vcenter-01',
        provider_id_volume: '',
        policy_set_id: 'tier2-apps',
        volumes: [],
      }),
      vms: [
        { name: 'db-vm-01', order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
        { name: 'db-vm-02' },
      ],
    }

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.vmMetadataByName).toEqual({
      'db-vm-01': { order: 1, hostname: 'db01.sampleapp.local', ip_address: '192.168.10.11', os: 'Ubuntu 22.04', cpu: 4, memory_gb: 16, storage_gb: 200 },
      'db-vm-02': {},
    })
  })

  it('carries orchestration run id and pushed flag through for a VM group', () => {
    const record = readRecord({
      id: 'database_group2',
      name: 'database_group2',
      description: 'Recovery group containing the database tier VMs',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'TEST-DB01' }],
      volumes: [],
      orchestration: { run_id: '260805131217-6514c730', pushed: true },
    })

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.airflowRunId).toBe('260805131217-6514c730')
    expect(group.pushToOrchestrator).toBe(true)
  })

  it('carries orchestration run id and pushed flag through for a volume-only group', () => {
    const record = readRecord({
      id: 'storage_group',
      name: 'Storage group',
      description: 'Storage volumes',
      provider_id_vm: '',
      provider_id_volume: 'ibm-flashsystem-01',
      policy_set_id: 'tier2-apps',
      vms: [],
      volumes: [{ name: 'V5000_VOLUME01' }],
      orchestration: { run_id: null, pushed: false },
    })

    const group = mapRecoveryGroupApiRecord(record, [flashSystemProvider])

    expect(group.airflowRunId).toBeNull()
    expect(group.pushToOrchestrator).toBe(false)
  })

  it('maps orchestration.provider_id to orchestrationProviderId for VM groups', () => {
    const record = readRecord({
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'TEST-DB01' }],
      volumes: [],
      orchestration: { provider_id: 'airflow-01' },
    })

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.orchestrationProviderId).toBe('airflow-01')
  })

  it('maps absent orchestration.provider_id to null orchestrationProviderId for VM groups', () => {
    const record = readRecord({
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'TEST-DB01' }],
      volumes: [],
    })

    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider])

    expect(group.orchestrationProviderId).toBeNull()
  })

  it('maps orchestration.provider_id to orchestrationProviderId for volume-only groups', () => {
    const record = readRecord({
      id: 'storage_group',
      name: 'Storage group',
      description: 'Storage volumes',
      provider_id_vm: '',
      provider_id_volume: 'ibm-flashsystem-01',
      policy_set_id: 'tier2-apps',
      vms: [],
      volumes: [{ name: 'V5000_VOLUME01' }],
      orchestration: { provider_id: 'airflow-01' },
    })

    const group = mapRecoveryGroupApiRecord(record, [flashSystemProvider])

    expect(group.orchestrationProviderId).toBe('airflow-01')
  })

  it('maps absent orchestration.provider_id to null orchestrationProviderId for volume groups', () => {
    const record = readRecord({
      id: 'storage_group',
      name: 'Storage group',
      description: 'Storage volumes',
      provider_id_vm: '',
      provider_id_volume: 'ibm-flashsystem-01',
      policy_set_id: 'tier2-apps',
      vms: [],
      volumes: [{ name: 'V5000_VOLUME01' }],
    })

    const group = mapRecoveryGroupApiRecord(record, [flashSystemProvider])

    expect(group.orchestrationProviderId).toBeNull()
  })

  it('keeps a VM group when its provider is missing without guessing its platform', () => {
    const record = readRecord({
      id: 'orphan-vm-group',
      name: 'Orphan VM group',
      description: 'Provider was removed after discovery',
      provider_id_vm: 'removed-vmware-provider',
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'ORPHAN-VM-01' }],
      volumes: [],
    })

    const group = mapRecoveryGroupApiRecord(record, [])

    expect(group.providerResolution).toBe('unresolved')
    expect(group.providerId).toBe('removed-vmware-provider')
    expect(group.workloadType).toBeNull()
    expect(group.resourceType).toBe('vm')
    expect(toRecoveryGroupJson(group)).toMatchObject(record)
  })

  it('keeps a volume group when its FlashSystem provider is missing', () => {
    const record = readRecord({
      id: 'orphan-volume-group',
      name: 'Orphan volume group',
      description: 'Provider was removed after discovery',
      provider_id_vm: '',
      provider_id_volume: 'removed-flashsystem-provider',
      policy_set_id: 'tier2-apps',
      vms: [],
      volumes: [{ name: 'ORPHAN-VOLUME-01' }],
    })

    const group = mapRecoveryGroupApiRecord(record, [])

    expect(group.providerResolution).toBe('unresolved')
    expect(group.providerId).toBe('removed-flashsystem-provider')
    expect(group.workloadType).toBe('ibm_flashsystem')
    expect(group.resourceType).toBe('volume')
  })
})
