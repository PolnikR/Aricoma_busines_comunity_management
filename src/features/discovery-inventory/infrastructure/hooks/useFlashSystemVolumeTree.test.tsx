import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchFlashSystemVolumeTree } from '../api/flashSystemVolumeTreeApi'
import { useFlashSystemVolumeTree } from './useFlashSystemVolumeTree'

vi.mock('../api/flashSystemVolumeTreeApi', () => ({
  fetchFlashSystemVolumeTree: vi.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchFlashSystemVolumeTree).mockResolvedValue({
    counts: { pools: 0, volumes: 0, fcmaps: 0, consistency_groups: 0 },
    nodes: [],
  })
})

describe('useFlashSystemVolumeTree', () => {
  it('loads the requested view for the given provider', async () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree('ibm-flashsystem-01', 'flat'), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchFlashSystemVolumeTree).toHaveBeenCalledWith('ibm-flashsystem-01', 'flat')
  })

  it('does not request the tree without a provider id', () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree(undefined, 'flat'), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchFlashSystemVolumeTree).not.toHaveBeenCalled()
  })

  it('does not request the tree without a view', () => {
    const { result } = renderHook(() => useFlashSystemVolumeTree('ibm-flashsystem-01', undefined), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchFlashSystemVolumeTree).not.toHaveBeenCalled()
  })
})
