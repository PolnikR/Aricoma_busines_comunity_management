import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRecoveryGroups } from './useRecoveryGroups'

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useRecoveryGroups', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('creates one cache entry without duplicating the group', async () => {
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })

    await act(async () => {
      await result.current.create({
        id: 'database_group',
        name: 'Database group',
        description: 'Database virtual machines',
        sourceCategory: 'backup_system_workload',
        workloadType: 'vmware_virtual_machines',
        resourceType: 'vm',
        providerId: 'vmware-vcenter-01',
        resources: ['DB-01'],
      })
    })

    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    expect(result.current.groups[0]?.id).toBe('database_group')
  })

  it('refreshes the query when another tab changes recovery-group storage', async () => {
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.isLoading).toBe(false) })
    localStorage.setItem('abcm.recovery-groups', JSON.stringify([{
      id: 'external_group',
      name: 'External group',
      description: 'Created in another tab',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['VM-01'],
    }]))

    window.dispatchEvent(new StorageEvent('storage', { key: 'abcm.recovery-groups' }))

    await waitFor(() => { expect(result.current.groups[0]?.id).toBe('external_group') })
  })
})
