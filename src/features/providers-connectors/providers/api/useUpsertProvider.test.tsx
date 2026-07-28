import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUpsertProvider } from './useUpsertProvider'
import { providerKeys } from './providerQueryKeys'
import type { ProviderRecord } from '../model/providerTypes'

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
}

function setup(response: ProviderRecord[]) {
  const mockFetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ providers: response }), { status: 200 }),
  )
  vi.stubGlobal('fetch', mockFetch)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useUpsertProvider(), { wrapper })
  return { mockFetch, queryClient, result }
}

function submittedProvider(mockFetch: ReturnType<typeof vi.fn>): ProviderRecord {
  const init = mockFetch.mock.calls[0]?.[1] as RequestInit
  return JSON.parse(init.body as string) as ProviderRecord
}

describe('useUpsertProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a new provider (create) and appends it to the cache', async () => {
    const newProvider: ProviderRecord = {
      id: 'flashsystem-01', name: 'Backup Array', description: '', type: 'FLASHCOPY', ipAddress: '10.0.0.2',
    }
    const { mockFetch, queryClient, result } = setup([providerA, newProvider])

    queryClient.setQueryData(providerKeys.list(), [providerA])
    result.current.mutate({ provider: newProvider })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(submittedProvider(mockFetch)).toEqual(newProvider)
    expect(queryClient.getQueryData(providerKeys.list())).toEqual([providerA, newProvider])
  })

  it('posts an edited provider and replaces it in the cache by id', async () => {
    const edited: ProviderRecord = { ...providerA, name: 'Renamed vCenter' }
    const { mockFetch, queryClient, result } = setup([edited])

    queryClient.setQueryData(providerKeys.list(), [providerA])
    result.current.mutate({ provider: edited })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(submittedProvider(mockFetch)).toEqual(edited)
    expect(queryClient.getQueryData(providerKeys.list())).toEqual([edited])
  })

  it('preserves providers added to the cache while the mutation is pending', async () => {
    const newProvider: ProviderRecord = {
      id: 'flashsystem-01', name: 'Backup Array', description: '', type: 'FLASHCOPY', ipAddress: '10.0.0.2',
    }
    const concurrentProvider: ProviderRecord = {
      id: 'powervm-01', name: 'PowerVM', description: '', type: 'POWERVM', ipAddress: '10.0.0.3',
    }
    const { queryClient, result } = setup([newProvider])
    queryClient.setQueryData(providerKeys.list(), [providerA])

    result.current.mutate({ provider: newProvider })
    queryClient.setQueryData(providerKeys.list(), [providerA, concurrentProvider])

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(queryClient.getQueryData(providerKeys.list())).toEqual([
      providerA,
      concurrentProvider,
      newProvider,
    ])
  })
})
