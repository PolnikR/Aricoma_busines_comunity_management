import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  fetchRecoveryGroups,
  toRecoveryGroupId,
  updateRecoveryGroup,
} from './recoveryGroupsApi'

const providers: ProviderRecord[] = [
  {
    id: 'vmware-vcenter-01',
    name: 'Production vCenter',
    description: 'VMware inventory',
    type: 'VMWARE',
    ipAddress: '10.99.99.40',
    credentialId: 'vcenter-admin',
    credentialStatus: 'ok',
  },
  {
    id: 'ibm-power-01',
    name: 'IBM Power',
    description: 'Power inventory',
    type: 'IBM_POWER',
    ipAddress: '10.99.99.50',
    credentialId: 'ibm-power-admin',
    credentialStatus: 'ok',
  },
  {
    id: 'ibm-flashsystem-01',
    name: 'IBM FlashSystem',
    description: 'Storage inventory',
    type: 'FLASHCOPY',
    ipAddress: '10.99.99.246',
    credentialId: 'ibm-admin',
    credentialStatus: 'ok',
  },
]

const databaseGroupPayload = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database tier',
  provider_id_vm: 'vmware-vcenter-01',
  provider_id_volume: 'ibm-flashsystem-01',
  policy_set_id: 'tier2-apps',
  vms: [{ name: 'TEST-DB01' }, { name: 'TEST-DB02' }],
  volumes: [{ name: 'TEST-VOLUME1' }, { name: 'TEST-VOLUME2' }],
}

function stubFetch(payload: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue(
    new Response(payload === null ? null : JSON.stringify(payload), { status }),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

function parseRequestBody(init: RequestInit): unknown {
  if (typeof init.body !== 'string') throw new Error('Expected a JSON request body')
  return JSON.parse(init.body) as unknown
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRecoveryGroups', () => {
  it('maps VMware VMs and preserves their related FlashSystem volumes', async () => {
    const mock = stubFetch({ recovery_groups: [databaseGroupPayload] })

    await expect(fetchRecoveryGroups(providers)).resolves.toEqual([{
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['TEST-DB01', 'TEST-DB02'],
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['TEST-VOLUME1', 'TEST-VOLUME2'],
      resourceCount: 2,
      status: 'Active',
      vmMetadataByName: { 'TEST-DB01': {}, 'TEST-DB02': {} },
    }])

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_recovery_groups')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('recognizes IBM Power VMs from provider_id_vm', async () => {
    stubFetch({
      recovery_groups: [{
        ...databaseGroupPayload,
        id: 'power_group',
        provider_id_vm: 'ibm-power-01',
        provider_id_volume: '',
        vms: [{ name: 'vios1' }],
        volumes: [],
      }],
    })

    await expect(fetchRecoveryGroups(providers)).resolves.toEqual([
      expect.objectContaining({
        id: 'power_group',
        workloadType: 'ibm_power_virtual_machines',
        providerId: 'ibm-power-01',
        resources: ['vios1'],
      }),
    ])
  })

  it('maps a volume-only recovery group to FlashSystem', async () => {
    stubFetch({
      recovery_groups: [{
        ...databaseGroupPayload,
        id: 'storage_group',
        provider_id_vm: '',
        vms: [],
      }],
    })

    await expect(fetchRecoveryGroups(providers)).resolves.toEqual([
      expect.objectContaining({
        id: 'storage_group',
        sourceCategory: 'storage_system',
        workloadType: 'ibm_flashsystem',
        resourceType: 'volume',
        providerId: 'ibm-flashsystem-01',
        resources: ['TEST-VOLUME1', 'TEST-VOLUME2'],
      }),
    ])
  })

  it('rejects malformed responses', async () => {
    stubFetch({ recovery_groups: 'invalid' })
    await expect(fetchRecoveryGroups(providers)).rejects.toBeInstanceOf(Error)
  })

  it('keeps valid groups available when another group references a missing provider', async () => {
    stubFetch({
      recovery_groups: [
        databaseGroupPayload,
        { ...databaseGroupPayload, id: 'orphan', provider_id_vm: 'missing-provider' },
      ],
    })

    await expect(fetchRecoveryGroups(providers)).resolves.toEqual([
      expect.objectContaining({ id: 'database_group' }),
    ])
  })

  it('preserves airflow_run_id and push_to_orchestrator through schema parsing', async () => {
    stubFetch({
      recovery_groups: [{
        ...databaseGroupPayload,
        airflow_run_id: '260805131217-6514c730',
        push_to_orchestrator: true,
      }],
    })

    const groups = await fetchRecoveryGroups(providers)

    expect(groups[0]?.airflowRunId).toBe('260805131217-6514c730')
    expect(groups[0]?.pushToOrchestrator).toBe(true)
  })

  it('tolerates a null airflow_run_id and an absent push_to_orchestrator', async () => {
    stubFetch({
      recovery_groups: [{ ...databaseGroupPayload, airflow_run_id: null }],
    })

    const groups = await fetchRecoveryGroups(providers)

    expect(groups[0]?.airflowRunId).toBeNull()
    expect(groups[0]?.pushToOrchestrator).toBeUndefined()
  })

  it('reports an HTTP failure', async () => {
    stubFetch(null, 503)
    await expect(fetchRecoveryGroups(providers)).rejects.toThrow(
      'Get recovery groups request failed with status 503',
    )
  })
})

describe('submitRecoveryGroup', () => {
  it.each([
    ['VMware', 'vmware_virtual_machines', 'vmware-vcenter-01'],
    ['IBM Power', 'ibm_power_virtual_machines', 'ibm-power-01'],
  ] as const)('submits %s resources through provider_id_vm and vms', async (
    _label,
    workloadType,
    providerId,
  ) => {
    const mock = stubFetch(null)

    await createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType,
      resourceType: 'vm',
      providerId,
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_recovery_group?provider_id=airflow-01&push_to_orchestrator=false')
    expect(init.method).toBe('POST')
    expect(parseRequestBody(init)).toEqual({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      provider_id_vm: providerId,
      provider_id_volume: '',
      policy_set_id: 'tier2-apps',
      vms: [{ name: 'VM-01', order: 1 }],
      volumes: [],
    })
  })

  it('submits FlashSystem resources through provider_id_volume and volumes', async () => {
    const mock = stubFetch(null)

    await createRecoveryGroup({
      id: 'storage_group',
      name: 'Storage group',
      description: 'Storage volumes',
      sourceCategory: 'storage_system',
      workloadType: 'ibm_flashsystem',
      resourceType: 'volume',
      providerId: 'ibm-flashsystem-01',
      policySetId: 'tier2-apps',
      resources: ['VOL-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })

    const [, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(parseRequestBody(init)).toEqual({
      id: 'storage_group',
      name: 'Storage group',
      description: 'Storage volumes',
      provider_id_vm: '',
      provider_id_volume: 'ibm-flashsystem-01',
      policy_set_id: 'tier2-apps',
      vms: [],
      volumes: [{ name: 'VOL-01' }],
    })
  })

  it('includes push_to_orchestrator=true in the query string when the toggle is on', async () => {
    const mock = stubFetch(null)

    await createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    })

    const [url] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_recovery_group?provider_id=airflow-01&push_to_orchestrator=true')
  })

  it('surfaces the airflow_run_id returned in the submit response', async () => {
    stubFetch({
      recovery_groups: [{
        ...databaseGroupPayload,
        airflow_run_id: '260806091844_d023a7ef',
        push_to_orchestrator: true,
      }],
    })

    const result = await createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    })

    expect(result.airflowRunId).toBe('260806091844_d023a7ef')
  })

  it('resolves a null airflowRunId when the submit response has none', async () => {
    stubFetch(null)

    const result = await createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })

    expect(result.airflowRunId).toBeNull()
  })

  it('rejects a draft with no orchestration provider before calling the backend', async () => {
    const mock = stubFetch(null)

    await expect(createRecoveryGroup({
      id: 'vm_group',
      name: 'VM group',
      description: 'Virtual machines',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['VM-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: null,
      pushToOrchestrator: false,
    })).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(mock).not.toHaveBeenCalled()
  })

  it('preserves related volumes while upserting an existing VM group', async () => {
    const mock = stubFetch(null)

    await updateRecoveryGroup('database_group', {
      id: 'database_group',
      name: 'Database group',
      description: 'Updated database tier',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['TEST-DB01'],
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['TEST-VOLUME1'],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })

    const [, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(parseRequestBody(init)).toMatchObject({
      id: 'database_group',
      provider_id_volume: 'ibm-flashsystem-01',
      volumes: [{ name: 'TEST-VOLUME1' }],
    })
  })

  it('rejects invalid drafts before calling the backend', async () => {
    const mock = stubFetch(null)

    await expect(createRecoveryGroup({
      id: 'invalid',
      name: '',
      description: 'Invalid group',
      sourceCategory: 'storage_system',
      workloadType: 'ibm_flashsystem',
      resourceType: 'volume',
      providerId: null,
      policySetId: null,
      resources: [],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(mock).not.toHaveBeenCalled()
  })

  it('reports an HTTP failure', async () => {
    stubFetch(null, 500)
    await expect(createRecoveryGroup({
      id: 'database_group',
      name: 'Database group',
      description: 'Database tier',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      providerId: 'vmware-vcenter-01',
      policySetId: 'tier2-apps',
      resources: ['DB-01'],
      relatedVolumeProviderId: null,
      relatedVolumes: [],
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: false,
    })).rejects.toThrow('Submit recovery group request failed with status 500')
  })
})

describe('deleteRecoveryGroup', () => {
  it('deletes an encoded recovery-group ID and validates the returned list', async () => {
    const mock = stubFetch({ recovery_groups: [] })

    await deleteRecoveryGroup('database/group 01')

    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_recovery_group?recovery_group_id=database%2Fgroup+01')
    expect(init.method).toBe('DELETE')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('rejects an invalid successful response', async () => {
    stubFetch({ recovery_groups: 'invalid' })
    await expect(deleteRecoveryGroup('database_group')).rejects.toBeInstanceOf(Error)
  })

  it('reports an HTTP failure', async () => {
    stubFetch(null, 404)
    await expect(deleteRecoveryGroup('missing')).rejects.toThrow(
      'Delete recovery group request failed with status 404',
    )
  })
})

describe('toRecoveryGroupId', () => {
  it('normalizes accented names for use as IDs', () => {
    expect(toRecoveryGroupId('Produkčná DB skupina')).toBe('produkcna_db_skupina')
  })
})
