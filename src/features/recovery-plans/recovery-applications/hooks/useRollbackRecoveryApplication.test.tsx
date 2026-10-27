import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGetRecoveryAppInventoryQueryKey, getGetRecoveryAppsQueryKey } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { getGetOrchestratorRunsQueryKey } from '@/generated/query/operations/operations.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { applicationHttpStatus, extractApplicationRollbackReport, useRollbackRecoveryApplication } from './useRollbackRecoveryApplication'
import { useRecoveryApplications } from './useRecoveryApplications'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

const app: RecoveryApplicationListItem = {
  id: 'finance', pushToOrchestrator: true, airflowRunId: 'retained-run', orchestrationProviderId: 'airflow-02',
  data: { application: { name: 'Finance', description: 'Recovery', environment: 'prod', platform: 'VMWARE', source_provider_id: 'source-vcenter', target_provider_id: 'target-vcenter', tiers: {} } },
}
const raw = { applications: [{ id: app.id, application: app.data.application, orchestration: { pushed: false, provider_id: 'airflow-02', run_id: 'retained-run' } }], rollback: { status: 'ok' } }
function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 3 } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { queryClient, wrapper }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('standalone application rollback', () => {
  it('cancels the older GET before applying rollback data and awaits the fresh GET', async () => {
    let finishOld!: (response: Response) => void
    let finishRefresh!: (response: Response) => void
    const oldGet = new Promise<Response>(resolve => { finishOld = resolve })
    const freshGet = new Promise<Response>(resolve => { finishRefresh = resolve })
    let reads = 0
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('rollback_app')
      ? Promise.resolve(new Response(JSON.stringify(raw), { status: 200 }))
      : ++reads === 1 ? oldGet : freshGet))
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => ({ list: useRecoveryApplications(), rollback: useRollbackRecoveryApplication() }), { wrapper })
    await waitFor(() => { expect(reads).toBe(1) })
    let settled = false
    let mutation!: Promise<unknown>
    act(() => { mutation = result.current.rollback.mutateAsync(app).then(() => { settled = true }) })
    await waitFor(() => { expect(reads).toBe(2) })
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(raw)
    expect(settled).toBe(false)
    await act(async () => {
      finishOld(new Response(JSON.stringify({ applications: [{ ...raw.applications[0], orchestration: { pushed: true } }] }), { status: 200 }))
      await oldGet
    })
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(raw)
    await act(async () => { finishRefresh(new Response(JSON.stringify(raw), { status: 200 })); await mutation })
    expect(result.current.list.data?.[0]?.pushToOrchestrator).toBe(false)
    expect(result.current.list.data?.[0]?.airflowRunId).toBe('retained-run')
    queryClient.clear()
  })

  it('refetches after an error even when both initiating observers unmount', async () => {
    let finishRollback!: (response: Response) => void
    const rollback = new Promise<Response>(resolve => { finishRollback = resolve })
    let reads = 0
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('rollback_app')) return rollback
      reads++
      return Promise.resolve(new Response(JSON.stringify({ applications: [{ ...raw.applications[0], orchestration: { pushed: true } }] }), { status: 200 }))
    }))
    const { queryClient, wrapper } = setup()
    const { result, unmount } = renderHook(() => ({ list: useRecoveryApplications(), rollback: useRollbackRecoveryApplication() }), { wrapper })
    await waitFor(() => { expect(result.current.list.isSuccess).toBe(true) })
    let mutation!: Promise<unknown>
    act(() => { mutation = result.current.rollback.mutateAsync(app).catch((error: unknown) => error) })
    await waitFor(() => { expect(result.current.rollback.isPending).toBe(true) })
    unmount()
    await act(async () => { finishRollback(new Response(JSON.stringify({ detail: { rollback: { status: 'partial' } } }), { status: 502 })); await mutation })
    expect(reads).toBe(2)
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toMatchObject({ applications: [{ orchestration: { pushed: true } }] })
    queryClient.clear()
  })

  it.each([['VMWARE', 'retained-run'], ['IBM_POWER', 'dag_retained-run']])('sends only the application ID for %s and retains the raw authoritative record', async (platform, runId) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient, wrapper } = setup()
    const inventoryKey = getGetRecoveryAppInventoryQueryKey({ run_id: runId, compute_provider_id: 'target-vcenter' })
    const runKey = getGetOrchestratorRunsQueryKey({ provider_id: 'airflow-02', dag_id: 'dag_retained-run', limit: 1 })
    const unrelatedKey = getGetOrchestratorRunsQueryKey({ provider_id: 'airflow-01', dag_id: 'dag_retained-run' })
    queryClient.setQueryData(inventoryKey, {})
    queryClient.setQueryData(runKey, {})
    queryClient.setQueryData(unrelatedKey, {})
    const { result } = renderHook(() => useRollbackRecoveryApplication(), { wrapper })
    await act(async () => {
      expect(await result.current.mutateAsync({ ...app, airflowRunId: runId, data: { application: { ...app.data.application, platform } } })).toEqual({ report: { status: 'ok' } })
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/rollback_app_from_orchestrator?recovery_app_id=finance', expect.objectContaining({ method: 'POST' }))
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body')
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(raw)
    expect(queryClient.getQueryState(inventoryKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(runKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(unrelatedKey)?.isInvalidated).toBe(false)
    queryClient.clear()
  })

  it.each([403, 409, 400, 502])('keeps the confirmed lock on HTTP %s and never automatically retries', async status => {
    const body = status === 502 ? { detail: { rollback: { status: 'partial', compute: { status: 'failed', errors: ['busy'] } } } } : { detail: 'Denied or stale' }
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
    vi.stubGlobal('fetch', fetchMock)
    const { queryClient, wrapper } = setup()
    const locked = { applications: [{ ...raw.applications[0], orchestration: { pushed: true } }] }
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), locked)
    const { result } = renderHook(() => useRollbackRecoveryApplication(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync(app)).rejects.toBeInstanceOf(Error) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(locked)
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
    await waitFor(() => { expect(result.current.error).toBeInstanceOf(Error) })
    expect(extractApplicationRollbackReport(result.current.error)?.status ?? null).toBe(status === 502 ? 'partial' : null)
    queryClient.clear()
  })

  it('does not fail successful rollback when refresh rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 })))
    const { queryClient, wrapper } = setup()
    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValue(new Error('offline refresh'))
    const { result } = renderHook(() => useRollbackRecoveryApplication(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync(app)).resolves.toEqual({ report: { status: 'ok' } }) })
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(raw)
    queryClient.clear()
  })

  it.each([{ status: 'skipped' }, null])('preserves unavailable or skipped rollback reports without inventing success details (%j)', async report => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...raw, rollback: report }), { status: 200 })))
    const { queryClient, wrapper } = setup()
    const { result } = renderHook(() => useRollbackRecoveryApplication(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync(app)).resolves.toEqual({ report }) })
    queryClient.clear()
  })

  it('reconciles uncertain network failures without optimistic unlock', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')))
    const { queryClient, wrapper } = setup()
    const locked = { applications: [{ ...raw.applications[0], orchestration: { pushed: true } }] }
    queryClient.setQueryData(getGetRecoveryAppsQueryKey(), locked)
    const { result } = renderHook(() => useRollbackRecoveryApplication(), { wrapper })
    await act(async () => { await expect(result.current.mutateAsync(app)).rejects.toThrow('network unavailable') })
    expect(queryClient.getQueryState(getGetRecoveryAppsQueryKey())?.isInvalidated).toBe(true)
    expect(queryClient.getQueryData(getGetRecoveryAppsQueryKey())).toEqual(locked)
    queryClient.clear()
  })

  it('validates report bodies through causes and rejects malformed or cyclic errors', () => {
    const wrapped = new Error('wrapped', { cause: new OrvalApiError(502, '', { detail: { rollback: { status: 'failed' } } }) })
    expect(extractApplicationRollbackReport(wrapped)).toEqual({ status: 'failed' })
    expect(applicationHttpStatus(wrapped)).toBe(502)
    expect(extractApplicationRollbackReport(new OrvalApiError(502, '', { detail: { rollback: { status: 'invented' } } }))).toBeNull()
    const cyclic: { cause?: unknown } = {}
    cyclic.cause = cyclic
    expect(extractApplicationRollbackReport(cyclic)).toBeNull()
    expect(applicationHttpStatus(cyclic)).toBeNull()
  })

  it('retains validated backend report extensions for the technical result view', () => {
    const report = { status: 'partial', airflow: { status: 'failed', errors: ['Airflow unavailable'] }, backend_details: { remaining: 2 } }
    expect(extractApplicationRollbackReport(new OrvalApiError(502, '', { detail: { rollback: report } }))).toEqual(report)
  })
})
