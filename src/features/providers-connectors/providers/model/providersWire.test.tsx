import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useDeleteProvider,
  useGetProviders,
  useSubmitProvider,
} from '@/generated/query/providers/providers.gen'
import { selectProviders } from './selectProviders'

const vcenter = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}
const airflow = { id: 'airflow-01', name: 'Airflow', type: 'AIRFLOW', role: 'source' }

function json(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))
}

function stubFetch() {
  const mock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
    if (url.startsWith('/api/get_providers')) return json({ providers: [vcenter, airflow] })
    if (url.startsWith('/api/submit_provider')) return json({ providers: [vcenter] })
    if (url.startsWith('/api/delete_provider')) return json({ providers: [] })
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

describe('providers wire contract', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('lists providers for the requested role and skips non-infrastructure types', async () => {
    const mock = stubFetch()
    const { result } = renderHook(
      () => useGetProviders({ role: 'source' }, { query: { select: selectProviders } }),
      { wrapper },
    )

    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })
    expect(calls(mock)[0]?.url).toBe('/api/get_providers?role=source')
    expect(result.current.data?.map(provider => provider.id)).toEqual(['vmware-vcenter-01'])
    expect(result.current.data?.[0]?.credentialStatus).toBe('ok')
  })

  it('submits the provider body and refetches the list', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => ({
      list: useGetProviders({ role: 'all' }, { query: { select: selectProviders } }),
      submit: useSubmitProvider(),
    }), { wrapper })
    await waitFor(() => { expect(result.current.list.isSuccess).toBe(true) })

    await act(async () => {
      await result.current.submit.mutateAsync({ data: { id: 'vmware-vcenter-01', name: 'Production vCenter', type: 'VMWARE', role: 'source' } })
    })

    const submit = calls(mock).find(call => call.url === '/api/submit_provider')
    expect(submit?.method).toBe('POST')
    expect(JSON.parse(submit?.body as string)).toEqual({ id: 'vmware-vcenter-01', name: 'Production vCenter', type: 'VMWARE', role: 'source' })
    await waitFor(() => {
      expect(calls(mock).filter(call => call.url.startsWith('/api/get_providers'))).toHaveLength(2)
    })
  })

  it('deletes by provider_id and refetches the list', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => ({
      list: useGetProviders({ role: 'all' }, { query: { select: selectProviders } }),
      remove: useDeleteProvider(),
    }), { wrapper })
    await waitFor(() => { expect(result.current.list.isSuccess).toBe(true) })

    await act(async () => {
      await result.current.remove.mutateAsync({ params: { provider_id: 'vmware-vcenter-01' } })
    })

    const remove = calls(mock).find(call => call.url.startsWith('/api/delete_provider'))
    expect(remove).toMatchObject({ url: '/api/delete_provider?provider_id=vmware-vcenter-01', method: 'DELETE' })
    await waitFor(() => {
      expect(calls(mock).filter(call => call.url.startsWith('/api/get_providers'))).toHaveLength(2)
    })
  })
})
