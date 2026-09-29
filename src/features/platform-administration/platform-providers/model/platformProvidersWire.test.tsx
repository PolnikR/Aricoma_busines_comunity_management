import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useDeletePlatformProvider,
  useGetPlatformProviders,
  useSubmitPlatformProvider,
} from '@/generated/query/platform-providers/platform-providers.gen'
import { selectPlatformProviders } from './selectPlatformProviders'

const airflow = {
  id: 'airflow-01',
  name: 'Airflow',
  type: 'AIRFLOW',
  role: 'source',
  ipAddress: '10.99.99.53',
  port: 8080,
  dagDir: '/opt/airflow/dags',
  credentialId: 'airflow-admin',
  credentialStatus: 'ok',
}
const vcenter = { id: 'vmware-vcenter-01', name: 'vCenter', type: 'VMWARE', role: 'source' }

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function stubFetch() {
  const mock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
    if (url.startsWith('/api/get_platform_providers')) return json({ providers: [airflow, vcenter] })
    if (url.startsWith('/api/submit_platform_provider')) return json({ providers: [airflow] })
    if (url.startsWith('/api/delete_platform_provider')) return json({ providers: [] })
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const calls = (mock: ReturnType<typeof stubFetch>) => mock.mock.calls.map(([url, init]) => ({
  url,
  method: (init)?.method ?? 'GET',
  body: (init)?.body,
}))

describe('platform providers wire contract', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('lists platform providers and skips non-platform types', async () => {
    const mock = stubFetch()
    const { result } = renderHook(
      () => useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } }),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(calls(mock)[0]?.url).toBe('/api/get_platform_providers?type=all')
    expect(result.current.data?.map(provider => provider.id)).toEqual(['airflow-01'])
  })

  it('submits the platform provider body and refetches the list', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => ({
      list: useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } }),
      submit: useSubmitPlatformProvider(),
    }), { wrapper })
    await waitFor(() => { expect(result.current.list.isSuccess).toBe(true) })

    await act(async () => {
      await result.current.submit.mutateAsync({ data: { id: 'airflow-01', name: 'Airflow', type: 'AIRFLOW', port: 8080 } })
    })

    const submit = calls(mock).find(call => call.url === '/api/submit_platform_provider')
    expect(submit?.method).toBe('POST')
    expect(JSON.parse(submit?.body as string)).toEqual({ id: 'airflow-01', name: 'Airflow', type: 'AIRFLOW', port: 8080 })
    await waitFor(() => {
      expect(calls(mock).filter(call => call.url.startsWith('/api/get_platform_providers'))).toHaveLength(2)
    })
  })

  it('deletes by provider_id and refetches the list', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => ({
      list: useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } }),
      remove: useDeletePlatformProvider(),
    }), { wrapper })
    await waitFor(() => { expect(result.current.list.isSuccess).toBe(true) })

    await act(async () => {
      await result.current.remove.mutateAsync({ params: { provider_id: 'airflow-01' } })
    })

    const remove = calls(mock).find(call => call.url.startsWith('/api/delete_platform_provider'))
    expect(remove).toMatchObject({ url: '/api/delete_platform_provider?provider_id=airflow-01', method: 'DELETE' })
    await waitFor(() => {
      expect(calls(mock).filter(call => call.url.startsWith('/api/get_platform_providers'))).toHaveLength(2)
    })
  })
})
