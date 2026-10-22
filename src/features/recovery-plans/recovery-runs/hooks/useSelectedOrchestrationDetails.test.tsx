import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGetOrchestratorRunsQueryKey } from '@/generated/query/operations/operations.gen'
import { application, createQueryWrapper, deferredResponse, provider, stubSelectedOrchestration } from '../test/selectedOrchestrationFixtures'
import { runsBody } from '../test/stubOrchestratorRuns'
import { useSelectedOrchestrationDetails } from './useSelectedOrchestrationDetails'
import type { SelectedOrchestrationInput } from './useSelectedOrchestrationDetails'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe.each(['application', 'group'] as const)('useSelectedOrchestrationDetails: %s', entityType => {
  function input(changes: Partial<SelectedOrchestrationInput> = {}): SelectedOrchestrationInput {
    return {
      entityType, selected: application,
      providers: { providers: [provider], isLoading: false, isError: false },
      ...changes,
    }
  }

  it('returns no detail and starts no request without selection, preserving Hook order through open and close', async () => {
    const http = stubSelectedOrchestration()
    const { Wrapper } = createQueryWrapper()
    const view = renderHook(useSelectedOrchestrationDetails, { initialProps: input({ selected: null }), wrapper: Wrapper })
    expect(view.result.current).toBeNull()
    expect(http.requests).toEqual([])
    view.rerender(input())
    await waitFor(() => { expect(view.result.current?.state.kind).toBe('lastRun') })
    view.rerender(input({ selected: null }))
    expect(view.result.current).toBeNull()
    expect(http.params('get_orchestrator_runs')).toHaveLength(1)
    expect(http.params('get_platform_providers')).toEqual([])
  })

  it.each([
    ['Push off', { pushToOrchestrator: false }, 'notOrchestrated'],
    ['provider ID missing', { orchestrationProviderId: null }, 'incomplete'],
    ['run ID missing', { airflowRunId: null }, 'noRunId'],
  ])('preserves reference and eligibility for %s', (label, changes, kind) => {
    const http = stubSelectedOrchestration()
    const { client, Wrapper } = createQueryWrapper()
    const { result } = renderHook(useSelectedOrchestrationDetails, {
      initialProps: input({ selected: { ...application, ...changes } }), wrapper: Wrapper,
    })
    expect(result.current).toMatchObject({
      state: { kind }, canViewRecoveryRuns: false,
      displayRunId: entityType === 'group' && label !== 'run ID missing' ? 'run-1' : null,
    })
    expect(http.requests).toEqual([])
    if (label === 'provider ID missing') {
      expect(client.getQueryState(getGetOrchestratorRunsQueryKey({
        provider_id: '', dag_id: entityType === 'application' ? 'dag_run-1' : '', limit: 1, order_by: '-logical_date',
      }))?.fetchStatus).toBe('idle')
    }
  })

  it.each([
    ['providersPending', true, false, [provider]],
    ['providersFailed', false, true, [provider]],
    ['orchestratorUnavailable', false, false, []],
  ] as const)('maps %s without gating an eligible latest request', async (kind, isLoading, isError, providers) => {
    const http = stubSelectedOrchestration()
    const { Wrapper } = createQueryWrapper()
    const { result } = renderHook(useSelectedOrchestrationDetails, {
      initialProps: input({ providers: { providers, isLoading, isError } }), wrapper: Wrapper,
    })
    expect(result.current).toMatchObject({ state: { kind }, canViewRecoveryRuns: true, displayRunId: 'run-1' })
    await waitFor(() => { expect(http.params('get_orchestrator_runs')).toEqual([
      { provider_id: 'airflow-01', dag_id: 'dag_run-1', limit: '1', order_by: '-logical_date' },
    ]) })
    expect(result.current?.state.kind).toBe(kind)
    expect(result.current?.providerUrl).toBe(providers.length ? 'https://airflow.test' : undefined)
    expect(http.params('get_platform_providers')).toEqual([])
  })

  it('preserves Push and incomplete precedence over provider and latest loading', () => {
    stubSelectedOrchestration()
    const { Wrapper } = createQueryWrapper()
    const providers = { providers: [], isLoading: true, isError: true }
    const view = renderHook(useSelectedOrchestrationDetails, {
      initialProps: input({ selected: { ...application, pushToOrchestrator: false }, providers }), wrapper: Wrapper,
    })
    expect(view.result.current?.state.kind).toBe('notOrchestrated')
    view.rerender(input({ selected: { ...application, orchestrationProviderId: null }, providers }))
    expect(view.result.current?.state.kind).toBe('incomplete')
    view.rerender(input({ selected: { ...application, airflowRunId: null }, providers }))
    expect(view.result.current?.state.kind).toBe('providersPending')
  })

  it.each([
    ['runPending', 'pending'], ['runFailed', 'failed'], ['noRuns', 'empty'], ['lastRun', 'success'],
  ])('interprets a real latest query as %s', async (kind, response) => {
    const pending = deferredResponse()
    const http = stubSelectedOrchestration({ latest: () => response === 'pending' ? pending.promise
      : Response.json(response === 'failed' ? { detail: 'unavailable' } : runsBody(response === 'empty' ? [] : [{ id: 'latest-1', state: 'success' }]),
        { status: response === 'failed' ? 503 : 200 }) })
    const { Wrapper } = createQueryWrapper()
    const view = renderHook(useSelectedOrchestrationDetails, { initialProps: input(), wrapper: Wrapper })
    await waitFor(() => { expect(view.result.current?.state.kind).toBe(kind) })
    expect(view.result.current).toMatchObject({ providerUrl: 'https://airflow.test', displayRunId: 'run-1', canViewRecoveryRuns: true })
    expect(http.params('get_orchestrator_runs')).toHaveLength(1)
    if (response === 'success') expect(view.result.current?.state).toMatchObject({
      providerName: 'Airflow PROD', run: { runId: 'latest-1', status: 'success' },
    })
    await act(async () => { pending.resolve(Response.json(runsBody([]))); await pending.promise })
  })

  it('passes an already normalized DAG unchanged and keeps a missing URL for the existing fallback builder', async () => {
    const http = stubSelectedOrchestration()
    const { Wrapper } = createQueryWrapper()
    const view = renderHook(useSelectedOrchestrationDetails, {
      initialProps: input({ selected: { ...application, airflowRunId: 'dag_run-1' },
        providers: { providers: [{ id: 'airflow-01', name: 'Airflow PROD' }], isLoading: false, isError: false } }),
      wrapper: Wrapper,
    })
    await waitFor(() => { expect(view.result.current?.state.kind).toBe('lastRun') })
    expect(view.result.current?.providerUrl).toBeUndefined()
    expect(http.params('get_orchestrator_runs')).toEqual([
      { provider_id: 'airflow-01', dag_id: 'dag_run-1', limit: '1', order_by: '-logical_date' },
    ])
  })
})
