import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useTags } from './useTags'
import { discoveryInventoryKeys } from './discoveryInventoryQueryKeys'

afterEach(() => { vi.unstubAllGlobals() })

describe('useTags', () => {
  it('loads tag names into the shared tag cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      count: 2,
      tags: [{ id: '1', name: 'prod' }, { id: '2', name: 'db' }],
    }), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useTags(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual(['prod', 'db'])
    expect(client.getQueryData(discoveryInventoryKeys.tags())).toEqual(['prod', 'db'])
  })
})
