import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryApplicationData, RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { RollbackReport as rollbackReportSchema } from '@/generated/query/zod/rollbackReport.gen'
import { useDeleteRecoveryApplication } from './useDeleteRecoveryApplication'
import { useSubmitRecoveryApplication } from './useRecoveryApplications'


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
  it.each([undefined, null])('accepts an optional rollback report from an orchestrated delete: %s', async rollback => {
    const mock = stubFetch({ applications: [], ...(rollback === undefined ? {} : { rollback }) })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })
    let returned: unknown
    await act(async () => {
      returned = await result.current.mutateAsync({ ...application, pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' })
    })
    expect(returned).toEqual({ applications: [], rollback: null })
    expect(request(mock).params['rollback_from_orchestrator']).toBe('true')
    expect(mock).toHaveBeenCalledOnce()
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
    const report = {
      status: 'ok',
      airflow: { status: 'ok' },
      vcenter: {
        datastores: ['recovered-datastore'],
        vms_removed: ['finance-db-01'],
        target_vdisks: ['snapshot-vdisk'],
        errors: [],
      },
      ibm: { status: 'ok', volumes: ['snapshot-vdisk'], unmapped: ['snapshot-vdisk:host'], errors: [] },
    }
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

  it('rolls back an orchestrated IBM Power application on its stored target IBM Power provider', async () => {
    const report = {
      status: 'ok',
      airflow: {
        status: 'ok',
        dag_id: 'dag_261020065027_42e616ff',
        paused: 'paused',
        failed_runs: ['scheduled__2026-10-01T00:00:00+00:00'],
        dag_file: 'removed',
        dag_record: 'deleted',
      },
      compute: {
        lpars: [{ name: 'dr_aix2source', removed: true, wwpns: ['C0507607D7F70392'] }],
        errors: [],
      },
      ibm: { hosts: [{ host: 'h42e616ff_dr_aix2source', unmapped: ['0', '1'], removed: true }], errors: [] },
      warnings: [],
      notes: ['zoning is not undone'],
    }
    const mock = stubFetch({ applications: [], rollback: report })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })

    let returned: { rollback: unknown } | undefined
    await act(async () => {
      returned = await result.current.mutateAsync({
        ...application,
        pushToOrchestrator: true,
        orchestrationProviderId: 'airflow-01',
        data: { application: { ...data.application, platform: 'IBM_POWER', source_provider_id: 'ibm-power-01', target_provider_id: 'ibm-power-02' } },
      })
    })

    expect(returned?.rollback).toEqual(report)
    expect(request(mock).params).toMatchObject({ rollback_from_orchestrator: 'true', compute_provider_id: 'ibm-power-02' })
  })

  it('accepts partial rollback with incomplete nested BE objects', () => {
    const report = {
      status: 'partial',
      airflow: { status: 'ok' },
      compute: { lpars: [{ name: 'dr_aix2source' }], errors: ['could not remove LPAR'] },
      ibm: { hosts: [{ host: 'h42e616ff_dr_aix2source' }], errors: ['unmap failed'] },
      vcenter: { datastores: [{}], errors: ['unregister VM failed'] },
    }
    // These nested fields are untyped in BE OpenAPI. Zod must not require
    // wwPNs, host unmapped lists or vCenter datastore details on failures.
    expect(rollbackReportSchema.safeParse(report).success).toBe(true)
  })

  it('does not send the rollback request when the application has no stored target provider', async () => {
    const mock = stubFetch({ applications: [] })
    const { result } = renderHook(() => useDeleteRecoveryApplication(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({
        ...application,
        pushToOrchestrator: true,
        orchestrationProviderId: 'airflow-01',
        data: { application: { ...data.application, target_provider_id: undefined } },
      })).rejects.toMatchObject({ code: 'missing_compute_provider' })
    })

    expect(mock).not.toHaveBeenCalled()
  })

  it.each([
    { status: 'pushed' },
    { status: 'skipped', reason: 'Provider disabled', dag: null, dag_id: null, json: null },
    null,
    undefined,
  ])('preserves optional push details without turning a saved application into an error (%j)', async push => {
    stubFetch({ applications: [], ...(push === undefined ? {} : { orchestrator_push: push }) })
    const { result } = renderHook(() => useSubmitRecoveryApplication(), { wrapper })
    let returned: unknown
    await act(async () => {
      returned = await result.current.mutateAsync({ providerId: 'airflow-01', data, pushToOrchestrator: true })
    })
    expect(returned).toEqual({ applications: [], orchestrator_push: push ?? null })
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
