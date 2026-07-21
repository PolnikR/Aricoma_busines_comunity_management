import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchTags } from './tagsApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchTags', () => {
  it('returns array of tag names from API', async () => {
    const mockResponse = {
      count: 4,
      tags: [
        { id: 'tag-1', name: 'Database' },
        { id: 'tag-2', name: 'ABC Orchestrator' },
        { id: 'tag-3', name: 'Production' },
        { id: 'tag-4', name: 'Development' },
      ],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    ))

    const tags = await fetchTags()

    expect(tags).toEqual(['Database', 'ABC Orchestrator', 'Production', 'Development'])
    expect(tags).toHaveLength(4)
  })

  it('returns empty array when no tags exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, tags: [] }), { status: 200 }),
    ))

    const tags = await fetchTags()

    expect(tags).toEqual([])
    expect(tags).toHaveLength(0)
  })

  it('throws on HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 500 }),
    ))

    await expect(fetchTags()).rejects.toThrow('Tags request failed with status 500')
  })

  it('throws on invalid response schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ invalid: 'data' }), { status: 200 }),
    ))

    await expect(fetchTags()).rejects.toThrow()
  })
})
