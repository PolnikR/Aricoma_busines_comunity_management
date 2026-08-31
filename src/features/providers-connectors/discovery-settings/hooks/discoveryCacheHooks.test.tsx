import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discoveryCacheKeys } from '../api/discoveryCacheQueryKeys'
import { useDiscoveryCacheConfig } from './useDiscoveryCacheConfig'
import { useDiscoveryCacheHistory } from './useDiscoveryCacheHistory'
import { useUpdateDiscoveryCacheConfig } from './useUpdateDiscoveryCacheConfig'

const api = vi.hoisted(() => ({
  fetchDiscoveryCacheConfig: vi.fn(), fetchDiscoveryCacheHistory: vi.fn(), updateDiscoveryCacheConfig: vi.fn(),
}))
vi.mock('../api/discoveryCacheApi', () => api)

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider> }
}

describe('Discovery Cache hooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads config and separates history cache identities', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    api.fetchDiscoveryCacheConfig.mockResolvedValue({ defaults: {}, historyRetention: { retentionDays: 30, maxRecords: 100 } })
    api.fetchDiscoveryCacheHistory.mockImplementation((filters: { providerId?: string }) => Promise.resolve({ runs: [{ providerId: filters.providerId }] }))
    const { result: config } = renderHook(useDiscoveryCacheConfig, { wrapper: wrapperFor(client) })
    const { result: first } = renderHook(() => { return useDiscoveryCacheHistory({ providerId: 'a', limit: 1 }) }, { wrapper: wrapperFor(client) })
    const { result: second } = renderHook(() => { return useDiscoveryCacheHistory({ providerId: 'b', limit: 2 }) }, { wrapper: wrapperFor(client) })
    await waitFor(() => {
      expect(config.current.data).toBeDefined()
    })
    await waitFor(() => {
      expect(first.current.data).toBeDefined()
    })
    await waitFor(() => {
      expect(second.current.data).toBeDefined()
    })
    expect(client.getQueryData(discoveryCacheKeys.history({ providerId: 'a', limit: 1 }))).not.toEqual(client.getQueryData(discoveryCacheKeys.history({ providerId: 'b', limit: 2 })))
  })

  it('does not fetch while disabled and fetches the canonical config when enabled', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const configData = { defaults: { VMWARE: 300 }, historyRetention: { retentionDays: 30, maxRecords: 100 } }
    api.fetchDiscoveryCacheConfig.mockResolvedValue(configData)
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDiscoveryCacheConfig({ enabled }),
      { initialProps: { enabled: false }, wrapper: wrapperFor(client) },
    )

    expect(api.fetchDiscoveryCacheConfig).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() => {
      expect(result.current.data).toEqual(configData)
    })
    expect(api.fetchDiscoveryCacheConfig).toHaveBeenCalledTimes(1)
  })

  it('writes a successful update directly to config cache', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const updated = { defaults: { VMWARE: 60 }, historyRetention: { retentionDays: 30, maxRecords: 100 } }
    client.setQueryData(discoveryCacheKeys.config(), { defaults: {}, historyRetention: { retentionDays: 1, maxRecords: 1 } })
    api.updateDiscoveryCacheConfig.mockResolvedValue(updated)
    const { result } = renderHook(() => { return useUpdateDiscoveryCacheConfig() }, { wrapper: wrapperFor(client) })
    await act(() => result.current.mutateAsync({ defaults: { VMWARE: 60 } }))
    expect(client.getQueryData(discoveryCacheKeys.config())).toEqual(updated)
    expect(api.fetchDiscoveryCacheConfig).not.toHaveBeenCalled()
  })
})
