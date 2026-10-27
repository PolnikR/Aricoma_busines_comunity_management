import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  useSubmitRecoveryApplication,
} from './useRecoveryApplications'
import { getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryApplicationData } from '../model/recoveryApplicationTypes'

const data: RecoveryApplicationData = {
  id: 'finance-recovery',
  policy_set_id: 'test_1_hour_ps',
  application: {
    name: 'Finance',
    description: 'Finance recovery',
    environment: 'prod',
    platform: 'VMWARE',
    source_provider_id: 'vmware-vcenter-01',
    target_provider_id: 'vmware-vcenter-02',
    notificationEmail: null,
    tiers: {},
  },
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
  it('starts invalidation before per-call completion without waiting for its promise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ applications: [] }), { status: 200 })))
    const { queryClient, wrapper } = setup()
    const order: string[] = []
    let finishInvalidation!: () => void
    const invalidation = new Promise<void>(resolve => { finishInvalidation = resolve })
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(() => {
      order.push('invalidate')
      return invalidation
    })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })
    act(() => { result.current.mutate({ providerId: '', data, pushToOrchestrator: false }, {
      onSuccess: () => { order.push('complete') },
    }) })
    await waitFor(() => { expect(order).toEqual(['invalidate', 'complete']) })
    expect(result.current.isSuccess).toBe(true)
    finishInvalidation()
    queryClient.clear()
  })

  it.each([true, false])('only completes the latest observed save when requests overlap (older first=%s)', async olderFirst => {
    let finishOlder!: (response: Response) => void
    let finishNewer!: (response: Response) => void
    const older = new Promise<Response>(resolve => { finishOlder = resolve })
    const newer = new Promise<Response>(resolve => { finishNewer = resolve })
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(older).mockReturnValueOnce(newer))
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), { applications: [] })
    const oldComplete = vi.fn()
    const newComplete = vi.fn()
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })
    act(() => { result.current.mutate({ providerId: '', data, pushToOrchestrator: false }, { onSuccess: oldComplete }) })
    await waitFor(() => { expect(result.current.isPending).toBe(true) })
    act(() => { result.current.mutate({ providerId: '', data: { ...data, id: 'newer' }, pushToOrchestrator: false }, { onSuccess: newComplete }) })
    const response = () => new Response(JSON.stringify({ applications: [] }), { status: 200 })
    await act(async () => {
      (olderFirst ? finishOlder : finishNewer)(response())
      await (olderFirst ? older : newer)
    })
    await waitFor(() => { expect(queryClient.getMutationCache().getAll().filter(item => item.state.status === 'success')).toHaveLength(1) })
    expect(oldComplete).not.toHaveBeenCalled()
    if (olderFirst) expect(newComplete).not.toHaveBeenCalled()
    await act(async () => {
      (olderFirst ? finishNewer : finishOlder)(response())
      await (olderFirst ? newer : older)
    })
    await waitFor(() => { expect(queryClient.getMutationCache().getAll().every(item => item.state.status === 'success')).toBe(true) })
    expect(newComplete).toHaveBeenCalledOnce()
    expect(oldComplete).not.toHaveBeenCalled()
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
    queryClient.clear()
  })

  it('invalidates after unmount without running page completion', async () => {
    let respond!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { respond = resolve })
    vi.stubGlobal('fetch', vi.fn(() => pending))
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), { applications: [] })
    const complete = vi.fn()
    const { result, unmount } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })
    act(() => { result.current.mutate({ providerId: '', data, pushToOrchestrator: false }, { onSuccess: complete }) })
    await waitFor(() => { expect(result.current.isPending).toBe(true) })
    unmount()
    await act(async () => {
      respond(new Response(JSON.stringify({ applications: [] }), { status: 200 }))
      await pending
    })
    await waitFor(() => { expect(queryClient.getMutationCache().getAll()[0]?.state.status).toBe('success') })
    expect(complete).not.toHaveBeenCalled()
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
    queryClient.clear()
  })

  it('submits to the real DAG endpoint and invalidates the backend list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      applications: [],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), { applications: [] })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })

    result.current.mutate({
      providerId: 'airflow-01',
      data,
      pushToOrchestrator: false,
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/submit_recovery_dag?provider_id=airflow-01&push_to_orchestrator=false',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(data) }),
    )
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
  })
})
