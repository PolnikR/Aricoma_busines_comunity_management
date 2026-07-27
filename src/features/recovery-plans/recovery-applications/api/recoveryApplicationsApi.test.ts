import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createRecoveryApplication,
  deleteRecoveryApplication,
  fetchRecoveryApplication,
  fetchRecoveryApplications,
  submitRecoveryApplicationDag,
  updateRecoveryApplication,
} from './recoveryApplicationsApi'
import type { RecoveryApplication, RecoveryApplicationData } from '../model/recoveryApplicationTypes'

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

const application: RecoveryApplication = {
  id: 'app-1',
  data,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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

  it('loads a detail and reports an unsuccessful response', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(application), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404, statusText: 'Not Found' })))

    await expect(fetchRecoveryApplication('app-1')).resolves.toEqual(application)
    await expect(fetchRecoveryApplication('missing')).rejects.toThrow('Not Found')
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

  it('uses the expected methods for create, update, and delete', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(application), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(application), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await createRecoveryApplication(data, { status: 'ok', remotePath: '/tmp/app.json' })
    await updateRecoveryApplication('app-1', data)
    await deleteRecoveryApplication('app-1')

    expect(fetchMock.mock.calls.map((call) => (call[1] as RequestInit).method)).toEqual([
      'POST',
      'PUT',
      'DELETE',
    ])
  })
})
