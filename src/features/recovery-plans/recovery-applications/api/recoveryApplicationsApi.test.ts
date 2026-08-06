import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchRecoveryApplications,
  submitRecoveryApplicationDag,
} from './recoveryApplicationsApi'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
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
          description: 'Database recovery group',
          vms: [{ name: 'db-01' }],
        },
      },
    },
    file: 'Finance.json',
  }],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recoveryApplicationsApi', () => {
  it('loads and maps the real recovery applications response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(listPayload), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchRecoveryApplications()).resolves.toEqual([{
      id: 'Finance.json',
      data: {
        application: {
          name: 'Finance',
          description: 'Finance recovery',
          environment: 'prod',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: listPayload.applications[0]?.tiers,
        },
      },
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

  it('rejects recovery tiers that do not match the backend recovery_group contract', async () => {
    const invalidPayload = {
      applications: [{
        ...listPayload.applications[0],
        tiers: {
          database: {
            order: 1,
            description: 'Database server tier',
            recovery_group: {
              name: 'database_group',
              description: 'Database recovery group',
            },
          },
        },
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(invalidPayload), { status: 200 }),
    ))

    await expect(fetchRecoveryApplications()).rejects.toBeInstanceOf(Error)
  })

  it('loads a tier without an optional recovery_group', async () => {
    const payloadWithoutRecoveryGroup = {
      applications: [{
        ...listPayload.applications[0],
        tiers: {
          database: {
            order: 1,
            description: 'Database server tier',
          },
        },
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(payloadWithoutRecoveryGroup), { status: 200 }),
    ))

    const applications = await fetchRecoveryApplications()

    expect(applications[0]?.data.application.tiers['database']).toEqual({
      order: 1,
      description: 'Database server tier',
    })
  })

  it('loads a real-world application with no description/connections, a non-enum environment, direct tier vms, and rich VM fields', async () => {
    const sampleAppPayload = {
      applications: [{
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
        file: 'application1.json',
        airflow_run_id: null,
        push_to_orchestrator: false,
      }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleAppPayload), { status: 200 }),
    ))

    const applications = await fetchRecoveryApplications()

    expect(applications).toEqual([{
      id: 'application1.json',
      data: {
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
          airflow_run_id: null,
          push_to_orchestrator: false,
        },
      },
    }])
  })

  it('loads a tier wrapped in a recovery_group with volumes', async () => {
    const payloadWithVolumes = {
      applications: [{
        ...listPayload.applications[0],
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
        description: 'Recovery group containing the database tier VMs',
        vms: [{ name: 'TEST-DB01' }, { name: 'TEST-DB02' }],
        volumes: [{ name: 'TEST-VOLUME1' }, { name: 'TEST-VOLUME2' }],
      },
    })
  })

  it('submits an encoded DAG name without pushing to the orchestrator by default and preserves the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      filename: 'Finance App.json',
      local: 'C:\\projects\\abco-be\\persistency\\dag_jsons\\Finance App.json',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag(
      'Finance App',
      'airflow primary/01',
      data,
    )).resolves.toMatchObject({
      status: 'ok',
      local: 'C:\\projects\\abco-be\\persistency\\dag_jsons\\Finance App.json',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?filename=Finance+App&provider_id=airflow+primary%2F01&push_to_orchestrator=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('supports pushing an explicit DAG submission to the orchestrator', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      filename: 'Finance.json',
      local: 'C:\\projects\\abco-be\\persistency\\dag_jsons\\Finance.json',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await submitRecoveryApplicationDag('Finance', 'airflow-01', data, true)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?filename=Finance&provider_id=airflow-01&push_to_orchestrator=true',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('rejects an empty platform provider before issuing the DAG request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      filename: 'Finance.json',
      local: 'C:\\projects\\abco-be\\persistency\\dag_jsons\\Finance.json',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag('Finance', '   ', data)).rejects.toThrow(
      'Platform provider ID is required',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid successful DAG response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    ))

    await expect(submitRecoveryApplicationDag(
      'Finance',
      'airflow-01',
      data,
    )).rejects.toBeInstanceOf(Error)
  })

  it('reports DAG network and HTTP failures with context', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce(new Response('invalid DAG', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag(
      'Finance',
      'airflow-01',
      data,
    )).rejects.toThrow('Network error')
    await expect(submitRecoveryApplicationDag(
      'Finance',
      'airflow-01',
      data,
    )).rejects.toThrow('invalid DAG')
  })
})
