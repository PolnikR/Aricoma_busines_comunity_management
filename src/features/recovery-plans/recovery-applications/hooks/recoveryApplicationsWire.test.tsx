import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryApplicationData, RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { useDeleteRecoveryApplication } from './useDeleteRecoveryApplication'
import { useSubmitRecoveryApplication } from './useRecoveryApplications'

const mocks = vi.hoisted(() => ({ useProviders: vi.fn() }))

vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: mocks.useProviders,
}))

const targetVcenter: ProviderRecord = {
  id: 'vmware-vcenter-02',
  name: 'Target vCenter',
  description: '',
  type: 'VMWARE',
  role: 'target',
  ipAddress: '10.0.0.2',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
  orchestratorConnId: 'vcenter_default_destination',
}

const sourceVcenter: ProviderRecord = {
  ...targetVcenter,
  id: 'vmware-vcenter-01',
  name: 'Source vCenter',
  role: 'source',
  orchestratorConnId: 'vcenter_default',
}

const data: RecoveryApplicationData = {
  id: 'finance-recovery',
  policy_set_id: 'test_1_hour_ps',
  application: {
    name: 'Finance',
    description: 'Finance recovery',
    environment: 'prod',
    platform: 'VMWARE',
    source_provider_id: 'vmware-vcenter-01',
    source_connection: 'vcenter_default',
    target_connection: 'vcenter_default_destination',
    tiers: {},
  },
}

const application: RecoveryApplicationListItem = {
  id: 'finance-recovery',
  pushToOrchestrator: false,
  data: { application: data.application },
}

function stubFetch(body: unknown) {
  const mock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ))
  vi.stubGlobal('fetch', mock)
  return mock
}

const request = (mock: ReturnType<typeof stubFetch>) => {
  const [input, init] = mock.mock.calls[0] ?? []
  const url = new URL(input ?? '', 'http://localhost')
  return { path: url.pathname, params: Object.fromEntries(url.searchParams), method: init?.method }
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('recovery applications wire contract', () => {
  beforeEach(() => {
    mocks.useProviders.mockReturnValue({ data: [sourceVcenter, targetVcenter], isSuccess: true })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('deletes a local application without rollback parameters', async () => {
    const mock = stubFetch({ applications: [] })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })

    let returned: unknown
    await act(async () => { returned = await result.current.mutateAsync(application) })

    expect(request(mock)).toEqual({
      path: '/api/delete_recovery_app',
      params: { recovery_app_id: 'finance-recovery', rollback_from_orchestrator: 'false' },
      method: 'DELETE',
    })
    expect(returned).toEqual({ applications: [], rollback: null })
  })

  it('rolls back an orchestrated application on its orchestrator and target vCenter', async () => {
    const report = { status: 'ok', airflow: { status: 'ok' }, ibm: { status: 'ok', errors: [] } }
    const mock = stubFetch({ applications: [], rollback: report })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })

    let returned: { rollback: unknown } | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({ ...application, pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' })
    })

    expect(request(mock).params).toEqual({
      recovery_app_id: 'finance-recovery',
      rollback_from_orchestrator: 'true',
      provider_id: 'airflow-01',
      compute_provider_id: 'vmware-vcenter-02',
    })
    expect(returned?.rollback).toMatchObject(report)
  })

  it.each([
    ['no target provider uses the target connection', [sourceVcenter], 'missing_compute_provider', 'VMWARE'],
    ['several target providers use the target connection', [targetVcenter, { ...targetVcenter, id: 'vmware-vcenter-04' }], 'ambiguous_compute_provider', 'VMWARE'],
    ['the application is IBM Power', [targetVcenter], 'ibm_power_rollback_unsupported', 'IBM_POWER'],
  ])('does not send the rollback request when %s', async (_label, providers, code, platform) => {
    mocks.useProviders.mockReturnValue({ data: providers, isSuccess: true })
    const mock = stubFetch({ applications: [] })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({
        ...application,
        pushToOrchestrator: true,
        orchestrationProviderId: 'airflow-01',
        data: { application: { ...data.application, platform } },
      })).rejects.toMatchObject({ code })
    })

    expect(mock).not.toHaveBeenCalled()
  })

  it('requires the DAG details of an orchestrator push', async () => {
    stubFetch({ applications: [], orchestrator_push: { status: 'pushed' } })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })

    result.current.mutate({ providerId: 'airflow-01', data, pushToOrchestrator: true })

    await waitFor(() => { expect(result.current.isError).toBe(true) })
    expect(result.current.error?.message).toBe('Orchestrator response is missing DAG details')
  })

  it('returns the orchestrator push when the DAG details are present', async () => {
    const push = { status: 'pushed', dag: 'dag source', json: '{}', dag_id: 'dag_finance' }
    const mock = stubFetch({ applications: [], orchestrator_push: push })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })

    let returned: unknown
    await act(async () => {
      returned = await result.current.mutateAsync({ providerId: 'airflow-01', data, pushToOrchestrator: true })
    })

    expect(request(mock)).toMatchObject({
      path: '/api/submit_recovery_dag',
      params: { provider_id: 'airflow-01', push_to_orchestrator: 'true' },
      method: 'POST',
    })
    expect(returned).toEqual({ applications: [], orchestrator_push: push })
  })
})
