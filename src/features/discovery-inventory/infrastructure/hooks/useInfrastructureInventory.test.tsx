import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { invalidateProviderMutation } from '@/shared/query/providerMutationInvalidation'
import { useInfrastructureInventory } from './useInfrastructureInventory'
import { createDiscoveryFetchHandlers, installDiscoveryFetch } from '../../resources/test/discoveryFetch'

const discoveryFetch = createDiscoveryFetchHandlers()
const { fetchPowerInventory, fetchVmwareInventory } = discoveryFetch


function provider(type: ProviderRecord['type'], id: string): ProviderRecord {
  return { id, type, role: 'source', name: id, description: '', ipAddress: '', credentialId: null, credentialStatus: 'ok' }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  installDiscoveryFetch(discoveryFetch)
})

describe('useInfrastructureInventory', () => {
  it('clears a mounted deleted VMware observer and automatically recovers after recreate', async () => {
    fetchVmwareInventory.mockReturnValueOnce({ count: 1, vms: [{ name: 'Old VM' }] })
    fetchVmwareInventory.mockReturnValueOnce({ count: 1, vms: [{ name: 'Current VM' }] })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>
    }
    const hook = renderHook(() => useInfrastructureInventory(provider('VMWARE', 'vcenter-01')), { wrapper: Wrapper })
    await waitFor(() => { expect(hook.result.current.isSuccess).toBe(true) })
    expect(hook.result.current.data).toMatchObject({ virtualMachines: [{ name: 'Old VM' }] })
    await act(async () => {
      await invalidateProviderMutation(client, ['deleteProvider'], { params: { provider_id: 'vcenter-01' } })
    })
    expect(hook.result.current.data).toBeUndefined()
    expect(hook.result.current.isSuccess).toBe(false)
    await act(async () => { await hook.result.current.refetch() })
    expect(fetchVmwareInventory).toHaveBeenCalledTimes(1)
    await act(async () => {
      await invalidateProviderMutation(client, ['submitProvider'], { data: { id: 'vcenter-01' } })
    })
    await waitFor(() => { expect(hook.result.current.isSuccess).toBe(true) })
    expect(hook.result.current.data).toMatchObject({ virtualMachines: [{ name: 'Current VM' }] })
    expect(fetchVmwareInventory).toHaveBeenCalledTimes(2)
    hook.unmount()
    client.clear()
  })

  it('loads VMware inventory with the selected provider id', async () => {
    const selected = provider('VMWARE', 'vcenter-01')
    const { result } = renderHook(() => useInfrastructureInventory(selected), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchVmwareInventory).toHaveBeenCalledWith({ providerId: 'vcenter-01' })
    expect(fetchPowerInventory).not.toHaveBeenCalled()
  })

  it('loads IBM Power inventory with the selected provider id', async () => {
    const selected = provider('IBM_POWER', 'power-01')
    const { result } = renderHook(() => useInfrastructureInventory(selected), { wrapper })

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(fetchPowerInventory).toHaveBeenCalledWith('power-01')
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
  })

  it('does not request inventory without a compatible provider', () => {
    const { result } = renderHook(() => useInfrastructureInventory(null), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchPowerInventory).not.toHaveBeenCalled()
    expect(fetchVmwareInventory).not.toHaveBeenCalled()
  })
})
