import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'
import { ConnectionTestManager } from './ConnectionTestManager'

const requests = vi.hoisted(() => ({
  infrastructure: vi.fn<(_params: { provider_id: string }) => Promise<ProviderTestResponseOutput>>(),
  platform: vi.fn<(_params: { provider_id: string }) => Promise<ProviderTestResponseOutput>>(),
}))

vi.mock('@/generated/query/providers/providers.gen', () => ({
  getTestProviderQueryKey: (params: unknown) => ['/test_provider', params],
  getTestProviderQueryOptions: (_params: { provider_id: string }, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: () => requests.infrastructure(_params),
  }),
}))

vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  getTestPlatformProviderQueryKey: (params: unknown) => ['/test_platform_provider', params],
  getTestPlatformProviderQueryOptions: (_params: { provider_id: string }, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: () => requests.platform(_params),
  }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

const result = (id: string, ok = true): ProviderTestResponseOutput => ({
  provider_id: id,
  provider_type: 'AIRFLOW',
  ok,
  checks: [{ name: 'Reachability', status: ok ? 'ok' : 'failed', detail: 'Backend check' }],
})

function setup(scope: string | null = 'session-1', maxSlots = 20) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { manager: new ConnectionTestManager(queryClient, scope, maxSlots), queryClient }
}

beforeEach(() => {
  requests.infrastructure.mockReset()
  requests.platform.mockReset()
})

describe('ConnectionTestManager', () => {
  it('starts only after explicit action and deduplicates pending tests by kind and id', async () => {
    const pending = deferred<ProviderTestResponseOutput>()
    requests.infrastructure.mockReturnValue(pending.promise)
    const { manager } = setup()
    expect(requests.infrastructure).not.toHaveBeenCalled()

    const first = manager.startTest('infrastructure', 'same', 'VMware', 'target')
    const duplicate = manager.startTest('infrastructure', 'same', 'VMware', 'target')
    expect(first.status).toBe('started')
    expect(duplicate).toEqual({ status: 'existing', runId: first.status === 'started' ? first.runId : -1 })
    expect(requests.infrastructure).toHaveBeenCalledTimes(1)
    expect(manager.getRun(first.status === 'started' ? first.runId : -1)?.providerRole).toBe('target')
    pending.resolve(result('same'))
    await vi.waitFor(() => {
      expect(manager.getRun(first.status === 'started' ? first.runId : -1)?.phase).toBe('complete')
    })
  })

  it('runs different identities concurrently with separate generated endpoints', async () => {
    const infra = deferred<ProviderTestResponseOutput>()
    const platform = deferred<ProviderTestResponseOutput>()
    requests.infrastructure.mockReturnValue(infra.promise)
    requests.platform.mockReturnValue(platform.promise)
    const { manager } = setup()
    const first = manager.startTest('infrastructure', 'same', 'VMware', 'source')
    const second = manager.startTest('platform', 'same', 'Airflow')
    expect(first.status).toBe('started')
    expect(second.status).toBe('started')
    expect(requests.infrastructure).toHaveBeenCalledWith({ provider_id: 'same' })
    expect(requests.platform).toHaveBeenCalledWith({ provider_id: 'same' })
    infra.resolve(result('same'))
    platform.resolve(result('same'))
    await vi.waitFor(() => {
      expect(manager.getRun(second.status === 'started' ? second.runId : -1)?.phase).toBe('complete')
    })
  })

  it('releases the prior visible run when another provider starts', async () => {
    const pending = deferred<ProviderTestResponseOutput>()
    requests.platform.mockImplementation((params) => params.provider_id === 'one'
      ? pending.promise
      : Promise.resolve(result(params.provider_id)))
    const { manager, queryClient } = setup()
    const first = manager.startTest('platform', 'one', 'First')
    const second = manager.startTest('platform', 'two', 'Second')
    if (first.status === 'rejected' || second.status === 'rejected') throw new Error('Unexpected rejection')
    expect(manager.getProviderTestState('platform', 'one').isResultOpen).toBe(false)
    expect(manager.getProviderTestState('platform', 'two').isResultOpen).toBe(true)

    pending.resolve(result('one'))
    await vi.waitFor(() => {
      expect(manager.getSnapshot().notificationRunIds).toContain(first.runId)
      expect(manager.getRun(second.runId)?.phase).toBe('complete')
    })
    const oldKey = manager.getRun(second.runId)?.queryKey ?? []
    manager.startTest('platform', 'three', 'Third')
    expect(manager.getRun(second.runId)).toBeNull()
    expect(queryClient.getQueryData(oldKey)).toBeUndefined()
    expect(manager.getSnapshot().notificationRunIds).toContain(first.runId)
  })

  it('keeps a hidden pending request alive and reopens its cached result without another GET', async () => {
    const pending = deferred<ProviderTestResponseOutput>()
    requests.platform.mockReturnValue(pending.promise)
    const { manager, queryClient } = setup()
    const started = manager.startTest('platform', 'airflow', 'Airflow')
    if (started.status === 'rejected') throw new Error('Unexpected rejection')
    const run = manager.getRun(started.runId)
    expect(run?.queryKey).toContain('session-1')
    manager.closeResult()
    expect(manager.getProviderTestState('platform', 'airflow').run?.phase).toBe('pending')
    pending.resolve(result('airflow', false))
    await vi.waitFor(() => {
      expect(manager.getSnapshot().notificationRunIds).toEqual([started.runId])
    })
    expect(queryClient.getQueryData(run?.queryKey ?? [])).toEqual(result('airflow', false))
    expect(manager.openResult(started.runId)).toBe(true)
    expect(manager.getResult(started.runId)?.ok).toBe(false)
    expect(requests.platform).toHaveBeenCalledTimes(1)
    manager.closeResult()
    expect(queryClient.getQueryData(run?.queryKey ?? [])).toBeUndefined()
    expect(manager.getProviderTestState('platform', 'airflow').run).toBeNull()
  })

  it('starts a fresh run after completion and replaces only that provider notification', async () => {
    requests.platform.mockResolvedValue(result('airflow'))
    const { manager } = setup()
    const first = manager.startTest('platform', 'airflow', 'Airflow')
    if (first.status === 'rejected') throw new Error('Unexpected rejection')
    manager.closeResult()
    await vi.waitFor(() => {
      expect(manager.getSnapshot().notificationRunIds).toContain(first.runId)
    })
    const second = manager.startTest('platform', 'airflow', 'Airflow')
    expect(second.status).toBe('started')
    expect(requests.platform).toHaveBeenCalledTimes(2)
    expect(manager.getRun(first.runId)).toBeNull()
    expect(manager.getSnapshot().notificationRunIds).not.toContain(first.runId)
  })

  it('keeps all queued results, rejects capacity overflow, and frees slots on dismiss', async () => {
    requests.platform.mockImplementation((params: { provider_id: string }) => Promise.resolve(result(params.provider_id)))
    const { manager, queryClient } = setup('session-1', 6)
    for (let index = 0; index < 6; index++) {
      const started = manager.startTest('platform', String(index), `Airflow ${String(index)}`)
      expect(started.status).toBe('started')
      manager.closeResult()
    }
    await vi.waitFor(() => {
      expect(manager.getSnapshot().notificationRunIds).toHaveLength(6)
    })
    expect(manager.startTest('platform', 'overflow', 'Overflow')).toEqual({ status: 'rejected', reason: 'capacity' })
    expect(requests.platform).toHaveBeenCalledTimes(6)
    const firstId = manager.getSnapshot().notificationRunIds[0]
    expect(firstId).toBeDefined()
    const firstRun = manager.getRun(firstId ?? -1)
    manager.dismissNotification(firstId ?? -1)
    expect(queryClient.getQueryData(firstRun?.queryKey ?? [])).toBeUndefined()
    expect(manager.getSnapshot().notificationRunIds).toHaveLength(5)
    expect(manager.startTest('platform', 'new', 'New').status).toBe('started')
  })

  it('blocks an unknown session and drops stale completion after a session change', async () => {
    const pending = deferred<ProviderTestResponseOutput>()
    requests.infrastructure.mockReturnValue(pending.promise)
    const { manager, queryClient } = setup(null)
    expect(manager.startTest('infrastructure', 'id', 'VMware')).toEqual({ status: 'rejected', reason: 'session' })
    expect(requests.infrastructure).not.toHaveBeenCalled()
    manager.setSessionScope('session-1')
    const started = manager.startTest('infrastructure', 'id', 'VMware')
    if (started.status === 'rejected') throw new Error('Unexpected rejection')
    const key = manager.getRun(started.runId)?.queryKey ?? []
    manager.setSessionScope('session-2')
    pending.resolve(result('id'))
    await pending.promise
    expect(manager.getRun(started.runId)).toBeNull()
    expect(manager.getSnapshot().notificationRunIds).toEqual([])
    expect(queryClient.getQueryData(key)).toBeUndefined()
  })

  it('records transport errors in QueryClient without inventing a response', async () => {
    requests.platform.mockRejectedValue(new Error('Network unavailable'))
    const { manager } = setup()
    const started = manager.startTest('platform', 'id', 'Airflow')
    if (started.status === 'rejected') throw new Error('Unexpected rejection')
    await vi.waitFor(() => {
      expect(manager.getRun(started.runId)?.phase).toBe('error')
    })
    expect(manager.getResult(started.runId)).toBeNull()
    expect(manager.getError(started.runId)?.message).toBe('Network unavailable')
  })
})
