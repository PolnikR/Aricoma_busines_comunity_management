import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  recoveryApplicationQueryKey,
  recoveryApplicationsQueryKey,
  useCreateRecoveryApplication,
  useRecoveryApplication,
} from './useRecoveryApplications'
import type { RecoveryApplication, RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
  application: {
    name: 'Finance',
    description: 'Finance recovery',
    environment: 'prod',
    platform: 'VMware vCenter ESXi',
    source_connection: 'vcenter_default',
    target_connection: 'vcenter_default_destination',
    tiers: {},
  },
}

const application: RecoveryApplication = {
  id: 'app-1',
  data,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, wrapper }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recovery application hooks', () => {
  it('does not fetch a detail without an id', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { wrapper } = setup()
    const { result } = renderHook(() => useRecoveryApplication(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('loads a detail under the id-specific query key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(application), { status: 200 }),
    ))
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRecoveryApplication('app-1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(queryClient.getQueryData(recoveryApplicationQueryKey('app-1'))).toEqual(application)
  })

  it('invalidates the application list after creation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify(application), { status: 200 }),
    ))
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(recoveryApplicationsQueryKey, [])
    const { result } = renderHook(() => useCreateRecoveryApplication(), { wrapper })

    result.current.mutate(data)
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(queryClient.getQueryState(recoveryApplicationsQueryKey)?.isInvalidated).toBe(true)
  })
})
