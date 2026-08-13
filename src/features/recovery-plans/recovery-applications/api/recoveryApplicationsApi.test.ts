import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRecoveryApplications,
  submitRecoveryApplicationDag,
} from './recoveryApplicationsApi'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
  id: 'finance-recovery',
  policy_set_id: 'test_1_hour_ps',
  application: {
    name: 'Finance',
    description: 'Finance recovery',
    environment: 'prod',
    platform: 'VMware vCenter ESXi',
    source_connection: 'vcenter_default',
    target_connection: 'vcenter_default_destination',
    tiers: {},
  },
}

const listPayload = {
  applications: [{
    id: 'finance-recovery',
    policy_set_id: 'test_1_hour_ps',
    application: {
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {
        database: {
          order: 1,
          description: 'Database server tier',
          recovery_group: {
            name: 'database_group',
            vms: [{ name: 'db-01' }],
          },
        },
      },
    },
    airflow_run_id: 'run-1',
    push_to_orchestrator: false,
  }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recoveryApplicationsApi', () => {
  it('loads the current generated response contract without a recovery group description', async () => {
    const currentBackendPayload = {
      applications: [{
        id: 'ibu_rec-app',
        application: {
          name: 'ibu_rec-app',
          description: 'ibu_rec-app',
          environment: 'dev',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
              recovery_group: {
                name: 'database_group',
                vms: [{ name: 'TEST-DB01' }],
              },
            },
          },
        },
        policy_set_id: 'test_1_hour_ps',
        airflow_run_id: '260813110808_a8284a9c',
        push_to_orchestrator: true,
      }],
      rollback: null,
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(currentBackendPayload), { status: 200 }),
    ))

    const applications = await fetchRecoveryApplications()

    expect(applications[0]).toEqual({
      id: 'ibu_rec-app',
      policySetId: 'test_1_hour_ps',
      data: {
        application: {
          ...currentBackendPayload.applications[0]?.application,
        },
      },
      airflowRunId: '260813110808_a8284a9c',
      pushToOrchestrator: true,
    })
  })

  it('loads and maps the real recovery applications response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(listPayload), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRecoveryApplications()).resolves.toEqual([{
      id: 'finance-recovery',
      policySetId: 'test_1_hour_ps',
      data: {
        application: {
          ...listPayload.applications[0]?.application,
        },
      },
      airflowRunId: 'run-1',
      pushToOrchestrator: false,
    }])
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_recovery_apps')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('reports backend and response contract failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ applications: 'invalid' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRecoveryApplications()).rejects.toThrow(
      'Failed to fetch recovery applications: Unavailable'
    )
    await expect(fetchRecoveryApplications()).rejects.toBeInstanceOf(Error)
  })

  it('applies the generated empty VM default to a recovery group', async () => {
    const payloadWithoutVms = {
      applications: [{
        ...listPayload.applications[0],
        application: {
          ...listPayload.applications[0]?.application,
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
              recovery_group: {
                name: 'database_group',
              },
            },
          },
        },
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payloadWithoutVms), { status: 200 }),
    ))

    const applications = await fetchRecoveryApplications()

    expect(applications[0]?.data.application.tiers['database']?.recovery_group?.vms)
      .toEqual([])
  })

  it('reports the generated contract path when a tier omits recovery_group', async () => {
    const payloadWithoutRecoveryGroup = {
      applications: [{
        ...listPayload.applications[0],
        application: {
          ...listPayload.applications[0]?.application,
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
            },
          },
        },
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payloadWithoutRecoveryGroup), { status: 200 }),
    ))

    await expect(fetchRecoveryApplications()).rejects.toThrow(
      'applications.0.application.tiers.database.recovery_group',
    )
  })

  it('reports all required generated application fields that are missing', async () => {
    const sampleAppPayload = {
      applications: [{
        id: 'application1',
        policy_set_id: 'test_1_hour_ps',
        application: {
          name: 'SampleApp',
          environment: 'production',
          platform: 'VMware vCenter ESXi',
          tiers: {
            database: {
              order: 1,
              description: 'Database server group',
              vms: [
                {
                  order: 1,
                  name: 'db-vm-01',
                  hostname: 'db01.sampleapp.local',
                  ip_address: '192.168.10.11',
                  os: 'Ubuntu 22.04',
                  cpu: 4,
                  memory_gb: 16,
                  storage_gb: 200,
                },
              ],
            },
          },
        },
        airflow_run_id: null,
        push_to_orchestrator: false,
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleAppPayload), { status: 200 }),
    ))

    await expect(fetchRecoveryApplications()).rejects.toThrow(
      'applications.0.application.description',
    )
  })

  it('maps only fields declared by the generated embedded recovery group contract', async () => {
    const payloadWithVolumes = {
      applications: [{
        ...listPayload.applications[0],
        application: {
          ...listPayload.applications[0]?.application,
          tiers: {
            database: {
              order: 1,
              description: 'Database server tier',
              recovery_group: {
                name: 'database_group',
                description: 'Recovery group containing the database tier VMs',
                vms: [{ name: 'TEST-DB01' }, { name: 'TEST-DB02' }],
                volumes: [{ name: 'TEST-VOLUME1' }, { name: 'TEST-VOLUME2' }],
              },
            },
          },
        },
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payloadWithVolumes), { status: 200 }),
    ))

    const applications = await fetchRecoveryApplications()

    expect(applications[0]?.data.application.tiers['database']).toEqual({
      order: 1,
      description: 'Database server tier',
      recovery_group: {
        name: 'database_group',
        vms: [{ name: 'TEST-DB01' }, { name: 'TEST-DB02' }],
      },
    })
  })

  it('submits the application body without pushing to the orchestrator by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag(
      'airflow primary/01',
      data,
    )).resolves.toMatchObject({
      applications: [],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?provider_id=airflow+primary%2F01&push_to_orchestrator=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('supports pushing an explicit DAG submission to the orchestrator', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
      orchestrator_push: {
        status: 'pushed',
        dag: '/home/airflow/dags/dag.py',
        json: '/home/airflow/dags/dag.json',
        dag_id: 'dag_1',
      },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await submitRecoveryApplicationDag('airflow-01', data, true)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?provider_id=airflow-01&push_to_orchestrator=true',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('submits locally without an orchestration provider', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag('   ', data)).resolves.toMatchObject(
      { applications: [] },
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?push_to_orchestrator=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('requires an orchestration provider when pushing the DAG', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag('   ', data, true)).rejects.toThrow(
      'Platform provider ID is required',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid successful DAG response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    ))

    await expect(submitRecoveryApplicationDag(
      'airflow-01',
      data,
    )).rejects.toBeInstanceOf(Error)
  })

  it('rejects an orchestrated response that omits orchestrator details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ applications: [] }), { status: 200 }),
    ))

    await expect(submitRecoveryApplicationDag(
      'airflow-01',
      data,
      true,
    )).rejects.toBeInstanceOf(Error)
  })

  it('rejects an orchestrator status outside the generated response contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
      orchestrator_push: {
        status: 'queued',
        dag: '/home/airflow/dags/dag.py',
        json: '/home/airflow/dags/dag.json',
        dag_id: 'dag_1',
      },
    }), { status: 200 })))

    await expect(submitRecoveryApplicationDag(
      'airflow-01',
      data,
      true,
    )).rejects.toThrow('orchestrator_push')
  })

  it('reports DAG network and HTTP failures with context', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce(new Response('invalid DAG', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag(
      'airflow-01',
      data,
    )).rejects.toThrow('Network error')
    await expect(submitRecoveryApplicationDag(
      'airflow-01',
      data,
    )).rejects.toThrow('invalid DAG')
  })
})
