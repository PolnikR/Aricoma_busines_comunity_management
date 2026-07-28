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
          tiers: {
            database: {
              name: 'database_group',
              order: 1,
              description: 'Database server tier',
              recoveryGroupDescription: 'Database recovery group',
              vms: [{ name: 'db-01' }],
            },
          },
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

  it('submits an encoded DAG name and preserves the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 'ok',
      filename: 'Finance App',
      remote_path: '/tmp/finance.json',
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag('Finance App', data)).resolves.toMatchObject({
      status: 'ok',
      remote_path: '/tmp/finance.json',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_dag?filename=Finance%20App',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
  })

  it('reports DAG network and HTTP failures with context', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce(new Response('invalid DAG', { status: 500, statusText: 'Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(submitRecoveryApplicationDag('Finance', data)).rejects.toThrow('Network error')
    await expect(submitRecoveryApplicationDag('Finance', data)).rejects.toThrow('invalid DAG')
  })
})
