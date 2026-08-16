import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useProviders } from './useProviders'
import { providerKeys } from '../api/providerQueryKeys'
import type { ProviderRoleFilter } from '../model/providerTypes'

afterEach(() => { vi.unstubAllGlobals() })

describe('useProviders', () => {
  it('loads providers into the provider list cache', async () => {
    const provider = {
      id: 'vcenter-01',
      name: 'Production',
      description: 'Primary',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      credentialId: 'vcenter-admin',
      role: 'source',
      credentialStatus: 'ok',
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [provider] }), { status: 200 }),
    ))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useProviders(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    const expectedProvider = { ...provider, rawRecord: provider }
    expect(result.current.data).toEqual([expectedProvider])
    expect(client.getQueryData(providerKeys.list())).toEqual([expectedProvider])
  })

  it('keeps role responses in separate caches and reuses fresh role data', async () => {
    const sourceProvider = {
      id: 'vcenter-source',
      name: 'Source vCenter',
      description: 'Source provider',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      credentialId: 'source-admin',
      role: 'source',
      credentialStatus: 'ok',
    }
    const targetProvider = {
      id: 'vcenter-target',
      name: 'Target vCenter',
      description: 'Target provider',
      type: 'VMWARE',
      ipAddress: '10.0.0.2',
      credentialId: 'target-admin',
      role: 'target',
      credentialStatus: 'ok',
    }
    const fetchMock = vi.fn((input: string | URL) => {
      const providers = String(input).includes('role=target')
        ? [targetProvider]
        : [sourceProvider]
      return Promise.resolve(new Response(JSON.stringify({ providers }), { status: 200 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 15 * 60 * 1000 },
      },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result, rerender } = renderHook(
      ({ role }: { role: ProviderRoleFilter }) => useProviders(role),
      { initialProps: { role: 'source' as ProviderRoleFilter }, wrapper },
    )
    const expectedSourceProvider = { ...sourceProvider, rawRecord: sourceProvider }
    const expectedTargetProvider = { ...targetProvider, rawRecord: targetProvider }

    await waitFor(() => { expect(result.current.data).toEqual([expectedSourceProvider]) })

    rerender({ role: 'target' })
    await waitFor(() => { expect(result.current.data).toEqual([expectedTargetProvider]) })

    rerender({ role: 'source' })
    await waitFor(() => { expect(result.current.data).toEqual([expectedSourceProvider]) })

    expect(client.getQueryData(providerKeys.list('source'))).toEqual([expectedSourceProvider])
    expect(client.getQueryData(providerKeys.list('target'))).toEqual([expectedTargetProvider])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
