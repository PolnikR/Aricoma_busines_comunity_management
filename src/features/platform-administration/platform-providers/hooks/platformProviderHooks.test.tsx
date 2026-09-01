import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { platformProviderKeys } from '../api/platformProviderQueryKeys'
import type {
  PlatformProviderRecord,
  PlatformProviderSubmitData,
} from '../model/platformProviderTypes'
import { useDeletePlatformProvider } from './useDeletePlatformProvider'
import { usePlatformProviders } from './usePlatformProviders'
import { useUpsertPlatformProvider } from './useUpsertPlatformProvider'

const airflowProvider: PlatformProviderRecord = {
  id: 'airflow-01',
  name: 'Primary Airflow',
  description: 'Application recovery DAG orchestration.',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.55',
  port: 22,
  dagDir: '/home/airflow/dags',
  credentialId: 'airflow-ssh',
  notificationEmail: null,
  credentialStatus: 'ok',
}

const submitData: PlatformProviderSubmitData = {
  id: airflowProvider.id,
  name: airflowProvider.name,
  description: airflowProvider.description,
  type: 'AIRFLOW',
  ipAddress: '10.99.99.55',
  port: 22,
  dagDir: '/home/airflow/dags',
  credentialId: 'airflow-ssh',
  notificationEmail: null,
}

function createQueryContext() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('platform provider hooks', () => {
  it('loads records into the isolated platform-provider cache', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [airflowProvider] }), { status: 200 }),
    ))
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => usePlatformProviders(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toMatchObject([airflowProvider])
    expect(client.getQueryData(platformProviderKeys.list())).toMatchObject([airflowProvider])
    expect(client.getQueryData(['providers', 'list'])).toBeUndefined()
  })

  it('invalidates only the platform-provider cache after submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [submitData] }), { status: 200 }),
    ))
    const { client, wrapper } = createQueryContext()
    client.setQueryData(platformProviderKeys.list(), [airflowProvider])
    client.setQueryData(['providers', 'list'], [{ id: 'vmware-01' }])

    const { result } = renderHook(() => useUpsertPlatformProvider(), { wrapper })
    result.current.mutate({ provider: submitData })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryState(platformProviderKeys.list())?.isInvalidated).toBe(true)
    expect(client.getQueryState(['providers', 'list'])?.isInvalidated).toBe(false)
  })

  it('invalidates the list after delete instead of caching a response without credential status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    ))
    const { client, wrapper } = createQueryContext()
    client.setQueryData(platformProviderKeys.list(), [airflowProvider])

    const { result } = renderHook(() => useDeletePlatformProvider(), { wrapper })
    result.current.mutate(airflowProvider.id)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(platformProviderKeys.list())).toEqual([airflowProvider])
    expect(client.getQueryState(platformProviderKeys.list())?.isInvalidated).toBe(true)
  })
})
