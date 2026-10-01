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
import { validateRecoveryGroupDraft } from '../api/recoveryGroupsValidation'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

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
  topology: 'local',
  metroMirrorMode: null,
  consistencyGroupId: null,
  auxiliaryNamesByVolume: {},
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
  it('round-trips manually corrected Metro values without UI provenance', () => {
    const corrected = { ...validatedVmDraft, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const,
      consistencyGroupId: '009', auxiliaryNamesByVolume: { 'VOL-01': 'MANUAL-AUX' },
      relatedVolumeProviderId: flashSystemProvider.id, relatedVolumes: ['VOL-01'] }
    const payload = toRecoveryGroupSubmitPayload(corrected, corrected.id)
    expect(payload.metro_mirror).toEqual({ mode: 'existing', consistency_group_id: '009' })
    expect(payload.volumes).toEqual([{ name: 'VOL-01', auxiliary_name: 'MANUAL-AUX' }])
    expect(payload.provider_id_volume).toBe(flashSystemProvider.id)
    expect(payload).not.toHaveProperty('hasConsistencyOverride')
    expect(payload).not.toHaveProperty('auxiliaryNamesByVolume')
    const loaded = mapRecoveryGroupApiRecord(toRecoveryGroupReadRecord(RecoveryGroupRecord.parse(payload)), [vmwareProvider, flashSystemProvider])
    expect(loaded.consistencyGroupId).toBe('009')
    expect(loaded.auxiliaryNamesByVolume).toEqual({ 'VOL-01': 'MANUAL-AUX' })
  })

  it('serializes Local without stale Metro fields', () => {
    const payload = toRecoveryGroupSubmitPayload({
      ...validatedVmDraft,
      topology: 'local',
      metroMirrorMode: null,
      consistencyGroupId: null,
      auxiliaryNamesByVolume: {},
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
    }, 'database_group')

    expect(payload).toMatchObject({ topology: 'local', provider_id_volume: 'ibm-flashsystem-01', volumes: [{ name: 'VOL-01' }] })
    expect(payload).not.toHaveProperty('metro_mirror')
    expect(payload.volumes).toEqual([{ name: 'VOL-01' }])
  })

  it.each(['vm', 'volume'] as const)('serializes Metro Mirror %s volumes with trimmed auxiliary names', resourceType => {
    const draft: RecoveryGroupDraft = {
      id: 'metro-group', name: 'Metro group', description: 'Metro recovery',
      sourceCategory: resourceType === 'vm' ? 'backup_system_workload' : 'storage_system',
      workloadType: resourceType === 'vm' ? 'vmware_virtual_machines' : 'ibm_flashsystem',
      resourceType,
      providerId: resourceType === 'vm' ? 'vmware-vcenter-01' : 'ibm-flashsystem-01',
      policySetId: 'tier2-apps',
      resources: resourceType === 'vm' ? ['db-vm-01'] : [' VOL-01 '],
      relatedVolumeProviderId: resourceType === 'vm' ? 'ibm-flashsystem-01' : null,
      relatedVolumes: resourceType === 'vm' ? [' VOL-01 '] : [],
      topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: ' 001 ',
      auxiliaryNamesByVolume: { ' VOL-01 ': ' AUX-01 ' },
      vmMetadataByName: validatedVmDraft.vmMetadataByName,
      orchestrationProviderId: 'airflow-01', pushToOrchestrator: false,
    }

    const validated = validateRecoveryGroupDraft(draft)
    const payload = toRecoveryGroupSubmitPayload(validated, draft.id)
    expect(payload).toMatchObject({
      topology: 'metro_mirror',
      metro_mirror: { mode: 'existing', consistency_group_id: '001' },
      provider_id_vm: resourceType === 'vm' ? 'vmware-vcenter-01' : '',
      provider_id_volume: 'ibm-flashsystem-01',
      volumes: [{ name: 'VOL-01', auxiliary_name: 'AUX-01' }],
    })
    const group = toRecoveryGroup(validated, draft.id)
    expect(toRecoveryGroupJson(group)).toMatchObject(payload)
  })

  it.each(['vm', 'volume'] as const)('serializes Managed Metro Mirror %s groups without derived values', resourceType => {
    const draft: RecoveryGroupDraft = {
      id: 'aaa', name: 'aa', description: 'aa',
      sourceCategory: resourceType === 'vm' ? 'backup_system_workload' : 'storage_system',
      workloadType: resourceType === 'vm' ? 'vmware_virtual_machines' : 'ibm_flashsystem',
      resourceType,
      providerId: resourceType === 'vm' ? 'vmware-vcenter-01' : 'ibm-flashsystem-01',
      policySetId: 'test_1_hour_ps',
      resources: resourceType === 'vm' ? ['TEST-WEB01'] : ['IBU_source'],
      relatedVolumeProviderId: resourceType === 'vm' ? 'ibm-flashsystem-01' : null,
      relatedVolumes: resourceType === 'vm' ? ['IBU_source'] : [],
      topology: 'metro_mirror', metroMirrorMode: 'managed',
      orchestrationProviderId: 'airflow-01', pushToOrchestrator: false,
    }

    const payload = toRecoveryGroupSubmitPayload(validateRecoveryGroupDraft(draft), draft.id)

    expect(payload).toEqual({
      id: 'aaa',
      name: 'aa',
      description: 'aa',
      provider_id_vm: resourceType === 'vm' ? 'vmware-vcenter-01' : '',
      provider_id_volume: 'ibm-flashsystem-01',
      topology: 'metro_mirror',
      metro_mirror: { mode: 'managed' },
      policy_set_id: 'test_1_hour_ps',
      vms: resourceType === 'vm' ? [{ name: 'TEST-WEB01', order: 1 }] : [],
      volumes: [{ name: 'IBU_source' }],
    })
  })

  it('never submits a consistency group, auxiliary names or target pool for Managed', () => {
    const payload = toRecoveryGroupSubmitPayload({
      ...validatedVmDraft,
      resources: ['TEST-WEB01'],
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['IBU_source'],
      topology: 'metro_mirror',
      metroMirrorMode: 'managed',
      consistencyGroupId: '55',
      auxiliaryNamesByVolume: { IBU_source: 'auxe6d1bdad_IBU_source' },
      vmMetadataByName: undefined,
    }, 'aaa')

    expect(payload.metro_mirror).toEqual({ mode: 'managed' })
    expect(payload.metro_mirror).not.toHaveProperty('consistency_group_id')
    expect(payload.metro_mirror).not.toHaveProperty('target_pool')
    expect(payload.volumes).toEqual([{ name: 'IBU_source' }])
  })

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
    expect(toRecoveryGroupJson(group)).toBe(record)
  })

  it('reads back backend-generated Managed values without resubmitting them', () => {
    const record = readRecord({
      id: 'aaa',
      name: 'aa',
      description: 'aa',
      provider_id_vm: 'vmware-vcenter-01',
      provider_id_volume: 'ibm-flashsystem-01',
      topology: 'metro_mirror',
      metro_mirror: { mode: 'managed', consistency_group_id: '55' },
      policy_set_id: 'test_1_hour_ps',
      vms: [{ name: 'TEST-WEB01' }],
      volumes: [{ name: 'IBU_source', auxiliary_name: 'auxe6d1bdad_IBU_source' }],
    })
    const group = mapRecoveryGroupApiRecord(record, [vmwareProvider, flashSystemProvider])

    expect(group).toMatchObject({
      metroMirrorMode: 'managed',
      consistencyGroupId: '55',
      relatedVolumes: ['IBU_source'],
      auxiliaryNamesByVolume: { IBU_source: 'auxe6d1bdad_IBU_source' },
    })
    expect(toRecoveryGroupJson({ ...group, rawRecord: undefined })).toMatchObject({
      metro_mirror: { mode: 'managed', consistency_group_id: '55' },
      volumes: [{ name: 'IBU_source', auxiliary_name: 'auxe6d1bdad_IBU_source' }],
    })

    const payload = toRecoveryGroupSubmitPayload(validateRecoveryGroupDraft({
      ...group,
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    }), group.id)
    expect(payload.metro_mirror).toEqual({ mode: 'managed' })
    expect(payload.volumes).toEqual([{ name: 'IBU_source' }])
  })

  it('does not invent empty auxiliary names in the JSON view of a Managed group', () => {
    const group = toRecoveryGroup(validateRecoveryGroupDraft({
      id: 'aaa', name: 'aa', description: 'aa',
      sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem', resourceType: 'volume',
      providerId: 'ibm-flashsystem-01', policySetId: 'test_1_hour_ps', resources: ['IBU_source'],
      topology: 'metro_mirror', metroMirrorMode: 'managed',
      orchestrationProviderId: 'airflow-01', pushToOrchestrator: false,
    }), 'aaa')

    expect(toRecoveryGroupJson(group).volumes).toEqual([{ name: 'IBU_source' }])
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
