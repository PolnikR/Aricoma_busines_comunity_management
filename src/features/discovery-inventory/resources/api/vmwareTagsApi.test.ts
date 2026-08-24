import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTags } from './vmwareTagsApi'

describe('fetchTags', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns array of tag names from API', async () => {
    const mockResponse = {
      count: 4,
      tags: [
        { id: 'tag-1', name: 'Database', provider_id: 'vmware-vcenter-01', provider_type: 'VMWARE' },
        { id: 'tag-2', name: 'ABC Orchestrator' },
        { id: 'tag-3', name: 'Production' },
        { id: 'tag-4', name: 'Database' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    ))

    const tags = await fetchTags('vmware-vcenter-01')

    expect(tags).toEqual(['Database', 'ABC Orchestrator', 'Production'])
    expect(tags).toHaveLength(3)
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/tags?provider_id=vmware-vcenter-01')
  })

  it('returns empty array when no tags exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, tags: [] }), { status: 200 }),
    ))

    const tags = await fetchTags('vmware-vcenter-01')

    expect(tags).toEqual([])
    expect(tags).toHaveLength(0)
  })

  it('throws on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 500 }),
    ))

    await expect(fetchTags('vmware-vcenter-01')).rejects.toThrow('Tags request failed with status 500')
  })

  it('throws on invalid response schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ invalid: 'data' }), { status: 200 }),
    ))

    await expect(fetchTags('vmware-vcenter-01')).rejects.toThrow()
  })
})
