import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useUpsertProvider } from './useUpsertProvider'
import { providerKeys } from '../api/providerQueryKeys'
import type { ProviderRecord, ProviderSubmitData } from '../model/providerTypes'

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  port: 22,
  credentialId: 'vcenter-admin',
  role: 'source',
  credentialStatus: 'ok',
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

function submittedProvider(mockFetch: ReturnType<typeof vi.fn>): ProviderSubmitData {
  const init = mockFetch.mock.calls[0]?.[1] as RequestInit
  return JSON.parse(init.body as string) as ProviderSubmitData
}

describe('useUpsertProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a new provider and invalidates the provider list', async () => {
    const newProvider: ProviderSubmitData = {
      id: 'flashsystem-01',
      name: 'Backup Array',
      description: '',
      type: 'FLASHCOPY',
      ipAddress: '10.0.0.2',
      credentialId: 'ibm-admin',
      role: 'source',
    }
    const { mockFetch, queryClient, result } = setup([
      providerA,
      { ...newProvider, credentialStatus: 'ok' },
    ])

    queryClient.setQueryData(providerKeys.list(), [providerA])
    result.current.mutate({ provider: newProvider })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(submittedProvider(mockFetch)).toEqual(newProvider)
    expect(queryClient.getQueryState(providerKeys.list())?.isInvalidated).toBe(true)
  })

  it('posts an edited provider without sending backend-owned credentialStatus', async () => {
    const providerSubmitData: ProviderSubmitData = {
      id: providerA.id,
      name: providerA.name,
      description: providerA.description,
      type: providerA.type,
      ipAddress: providerA.ipAddress,
      credentialId: providerA.credentialId,
      role: providerA.role ?? 'source',
    }
    const edited: ProviderSubmitData = { ...providerSubmitData, name: 'Renamed vCenter' }
    const { mockFetch, queryClient, result } = setup([{ ...providerA, name: edited.name }])

    queryClient.setQueryData(providerKeys.list(), [providerA])
    result.current.mutate({ provider: edited })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(submittedProvider(mockFetch)).toEqual(edited)
    expect(submittedProvider(mockFetch)).not.toHaveProperty('credentialStatus')
    expect(queryClient.getQueryState(providerKeys.list())?.isInvalidated).toBe(true)
  })

  it('preserves providers added to the cache while the mutation is pending', async () => {
    const newProvider: ProviderSubmitData = {
      id: 'flashsystem-01',
      name: 'Backup Array',
      description: '',
      type: 'FLASHCOPY',
      ipAddress: '10.0.0.2',
      credentialId: 'ibm-admin',
      role: 'source',
    }
    const concurrentProvider: ProviderRecord = {
      id: 'powervm-01',
      name: 'PowerVM',
      description: '',
      type: 'IBM_POWER',
      ipAddress: '10.0.0.3',
      port: 22,
      credentialId: null,
      credentialStatus: 'none',
    }
    const { queryClient, result } = setup([{ ...newProvider, credentialStatus: 'ok' }])
    queryClient.setQueryData(providerKeys.list(), [providerA])

    result.current.mutate({ provider: newProvider })
    queryClient.setQueryData(providerKeys.list(), [providerA, concurrentProvider])

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(queryClient.getQueryData(providerKeys.list())).toEqual([
      providerA,
      concurrentProvider,
    ])
  })
})
