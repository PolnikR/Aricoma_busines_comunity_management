import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchVmsByName } from './vmsByNameApi'

describe('fetchVmsByName', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed vms response from API', async () => {
    const mockResponse = {
      count: 2,
      vms: [
        { name: 'WEB-01' },
        { name: 'WEB-02' },
      ],
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchVmsByName({ prefix: 'WEB', providerId: 'vmware-vcenter-01' })

    expect(result.count).toBe(2)
    expect(result.vms.map(vm => vm.name)).toEqual(['WEB-01', 'WEB-02'])
    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain('/api/vms_by_name')
    expect(url).toContain('prefix=WEB')
    expect(url).toContain('provider_id=vmware-vcenter-01')
  })

  it('omits optional params when not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, vms: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchVmsByName()

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toBe('/api/vms_by_name')
  })

  it('throws on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 500 }),
    ))

    await expect(fetchVmsByName()).rejects.toThrow('Vms by name request failed with status 500')
  })

  it('throws on invalid response schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ invalid: 'data' }), { status: 200 }),
    ))

    await expect(fetchVmsByName()).rejects.toThrow()
  })
})
