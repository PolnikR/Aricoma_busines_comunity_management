import { afterEach, describe, expect, it, vi } from 'vitest'
import * as apiFetchModule from '@/shared/api/apiClient'
import type { RollbackReport } from './schemas/recoveryGroupsSchema'
import { createRecoveryGroup, deleteRecoveryGroup, fetchRecoveryGroups, rollbackRecoveryGroupOrchestration } from './recoveryGroupsApi'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

const recoveryGroupsPayload = { recovery_groups: [] }

const orphanGroup = {
  id: 'orphan-vm-group',
  name: 'Orphan VM group',
  description: 'Provider was removed',
  provider_id_vm: 'removed-provider',
  provider_id_volume: '',
  policy_set_id: 'tier2-apps',
  vms: [{ name: 'ORPHAN-VM-01' }],
  volumes: [],
}

const knownProvider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'VMware inventory',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  port: 22,
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

describe('fetchRecoveryGroups', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps records whose configured provider is no longer available', async () => {
    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(JSON.stringify({ recovery_groups: [orphanGroup] }), { status: 200 }),
    )

    const groups = await fetchRecoveryGroups([knownProvider])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({
      id: 'orphan-vm-group',
      providerId: 'removed-provider',
      providerResolution: 'unresolved',
      workloadType: null,
    })
  })
})

describe('createRecoveryGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('takes the airflow run ID from the response record matching the submitted ID', async () => {
    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(JSON.stringify({
        recovery_groups: [
          { ...orphanGroup, id: 'another-group', airflow_run_id: 'wrong-run' },
          { ...orphanGroup, id: 'target_group', airflow_run_id: 'matching-run' },
        ],
      }), { status: 200 }),
    )

    const draft: RecoveryGroupDraft = {
      id: 'target-group',
      name: 'Target group',
      description: 'Target group',
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
    }

    await expect(createRecoveryGroup(draft)).resolves.toMatchObject({ airflowRunId: 'matching-run' })
  })
})

describe('rollbackRecoveryGroupOrchestration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to /api/rollback_from_orchestrator with recovery_group_id and provider_id', async () => {
    const mockFetch = vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          recovery_groups: [],
          rollback: { status: 'ok', airflow: { status: 'ok' }, ibm: { status: 'ok' } },
        }),
        { status: 200 }
      )
    )

    await rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')

    const call = mockFetch.mock.calls[0]
    expect(call).toBeDefined()
    const [url, init] = call as [string, RequestInit]
    expect(url).toContain('/api/rollback_from_orchestrator')
    expect(url).toContain('recovery_group_id=test-group')
    expect(url).toContain('provider_id=airflow-01')
    expect(init.method).toBe('POST')
  })

  it('uses POST method', async () => {
    const mockFetch = vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          recovery_groups: [],
          rollback: { status: 'ok' },
        }),
        { status: 200 }
      )
    )

    await rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')

    const call = mockFetch.mock.calls[0]
    expect(call).toBeDefined()
    const [, init] = call as [string, RequestInit]
    expect(init.method).toBe('POST')
  })

  it('returns the parsed rollback report', async () => {
    const report: RollbackReport = {
      status: 'ok',
      airflow: { status: 'ok', dag_id: 'dag_123' },
      ibm: { status: 'ok', errors: [] },
    }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          recovery_groups: [],
          rollback: report,
        }),
        { status: 200 }
      )
    )

    const result = await rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')
    expect(result).toEqual(report)
  })

  it('allows unrecognised status strings', async () => {
    const report = {
      status: 'unknown_status',
      airflow: { status: 'ok' },
      ibm: { status: 'ok' },
    }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          recovery_groups: [],
          rollback: report,
        }),
        { status: 200 }
      )
    )

    const result = await rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')
    expect(result.status).toBe('unknown_status')
  })

  it('preserves unknown keys in rollback report', async () => {
    const report: Record<string, unknown> = {
      status: 'ok',
      airflow: { status: 'ok', unknown_field: 'preserved' },
      ibm: { status: 'ok' },
      custom_data: { nested: 'value' },
    }

    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          recovery_groups: [],
          rollback: report,
        }),
        { status: 200 }
      )
    )

    const result = await rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')
    expect(result).toHaveProperty('custom_data')
    const airflowSection = result.airflow as Record<string, unknown> | undefined
    expect(airflowSection?.['unknown_field']).toBe('preserved')
  })

  it('throws on non-2xx response', async () => {
    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response('error', { status: 500 })
    )

    await expect(
      rollbackRecoveryGroupOrchestration('test-group', 'airflow-01')
    ).rejects.toThrow('Rollback recovery group orchestration request failed with status 500')
  })
})

describe('deleteRecoveryGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes a non-orchestrated group without a provider id and returns no rollback report', async () => {
    const mockFetch = vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(JSON.stringify(recoveryGroupsPayload), { status: 200 }),
    )

    const result = await deleteRecoveryGroup({
      recoveryGroupId: 'plain group',
      rollbackFromOrchestrator: false,
    })

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/delete_recovery_group')
    expect(url).toContain('recovery_group_id=plain+group')
    expect(url).toContain('rollback_from_orchestrator=false')
    expect(url).not.toContain('provider_id=')
    expect(init.method).toBe('DELETE')
    expect(result).toBeNull()
  })

  it('deletes an orchestrated group with its orchestration provider and returns the rollback report', async () => {
    const rollback = {
      status: 'ok',
      airflow: {
        status: 'ok',
        dag_id: 'dag_260805112701-9f34e409',
        dag_file: 'removed',
        dag_record: 'deleted',
      },
      ibm: { status: 'ok', consistency_groups: [], fcmaps: [], volumes: [], errors: [] },
    }
    const mockFetch = vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(JSON.stringify({ ...recoveryGroupsPayload, rollback }), { status: 200 }),
    )

    const result = await deleteRecoveryGroup({
      recoveryGroupId: 'database-group',
      rollbackFromOrchestrator: true,
      providerId: 'airflow-01',
    })

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('recovery_group_id=database-group')
    expect(url).toContain('rollback_from_orchestrator=true')
    expect(url).toContain('provider_id=airflow-01')
    expect(result).toEqual(rollback)
  })

  it('rejects rollback deletion without a provider before making the request', async () => {
    const mockFetch = vi.spyOn(apiFetchModule, 'apiFetch')

    await expect(deleteRecoveryGroup({
      recoveryGroupId: 'database-group',
      rollbackFromOrchestrator: true,
      providerId: '  ',
    })).rejects.toMatchObject({ code: 'missing_orchestration_provider' })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('rejects a rollback deletion response without a rollback report', async () => {
    vi.spyOn(apiFetchModule, 'apiFetch').mockResolvedValue(
      new Response(JSON.stringify(recoveryGroupsPayload), { status: 200 }),
    )

    await expect(deleteRecoveryGroup({
      recoveryGroupId: 'database-group',
      rollbackFromOrchestrator: true,
      providerId: 'airflow-01',
    })).rejects.toThrow()
  })
})
