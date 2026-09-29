import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useRecoveryGroups } from './useRecoveryGroups'

const mocks = vi.hoisted(() => ({ useProviders: vi.fn() }))

vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: mocks.useProviders,
}))

const provider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'VMware inventory',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

const wireGroup = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database virtual machines',
  provider_id_vm: provider.id,
  provider_id_volume: '',
  policy_set_id: 'tier2-apps',
  vms: [{ name: 'DB-01', order: 1 }],
  volumes: [],
}

const draft = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database virtual machines',
  sourceCategory: 'backup_system_workload' as const,
  workloadType: 'vmware_virtual_machines' as const,
  resourceType: 'vm' as const,
  providerId: provider.id,
  policySetId: 'tier2-apps',
  resources: ['DB-01'],
  orchestrationProviderId: 'airflow-01',
  pushToOrchestrator: false,
}

type Handler = (url: URL, init?: RequestInit) => unknown

function stubFetch(handlers: Record<string, Handler> = {}) {
  const mock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>((input, init) => {
    const url = new URL(input, 'http://localhost')
    const handler = handlers[url.pathname]
    const body = handler ? handler(url, init) : { recovery_groups: [wireGroup] }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const calls = (mock: ReturnType<typeof stubFetch>, path: string) => mock.mock.calls
  .map(([input, init]) => ({ url: new URL(input, 'http://localhost'), init }))
  .filter(call => call.url.pathname === path)

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

function loadedGroup<T>(groups: T[]): T {
  const [group] = groups
  if (!group) throw new Error('Expected a loaded recovery group')
  return group
}

describe('useRecoveryGroups', () => {
  beforeEach(() => {
    mocks.useProviders.mockReturnValue({ data: [provider], isLoading: false, isSuccess: true, error: null, refetch: vi.fn() })
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('loads groups and resolves the VM workload type from the providers', async () => {
    stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    expect(result.current.groups[0]).toMatchObject({
      id: 'database_group',
      workloadType: 'vmware_virtual_machines',
      resources: ['DB-01'],
      vmMetadataByName: { 'DB-01': { order: 1 } },
    })
  })

  it('waits for providers before requesting recovery groups', () => {
    mocks.useProviders.mockReturnValue({ data: undefined, isLoading: true, isSuccess: false, error: null, refetch: vi.fn() })
    const mock = stubFetch()
    renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })

    expect(calls(mock, '/api/get_recovery_groups')).toHaveLength(0)
  })

  it('submits the group with orchestration params and refetches the list', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    await act(async () => { await result.current.create(draft) })

    const [submit] = calls(mock, '/api/submit_recovery_group')
    expect(submit?.url.searchParams.get('provider_id')).toBe('airflow-01')
    expect(submit?.url.searchParams.get('push_to_orchestrator')).toBe('false')
    expect(JSON.parse(submit?.init?.body as string)).toMatchObject({
      id: 'database_group',
      provider_id_vm: provider.id,
      vms: [{ name: 'DB-01', order: 1 }],
    })
    await waitFor(() => { expect(calls(mock, '/api/get_recovery_groups')).toHaveLength(2) })
  })

  it('removes a non-orchestrated group without rollback parameters', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    let returned: unknown
    await act(async () => { returned = await result.current.remove(loadedGroup(result.current.groups)) })

    const [remove] = calls(mock, '/api/delete_recovery_group')
    expect(remove?.init?.method).toBe('DELETE')
    expect(Object.fromEntries(remove?.url.searchParams ?? [])).toEqual({
      recovery_group_id: 'database_group',
      rollback_from_orchestrator: 'false',
    })
    expect(returned).toBeNull()
  })

  it('removes an orchestrated group with its orchestration provider and returns the report', async () => {
    const report = { status: 'ok', airflow: { status: 'ok' }, ibm: { status: 'ok', errors: [] } }
    const mock = stubFetch({ '/api/delete_recovery_group': () => ({ recovery_groups: [], rollback: report }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    let returned: unknown
    await act(async () => {
      returned = await result.current.remove({ ...loadedGroup(result.current.groups), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' })
    })

    expect(Object.fromEntries(calls(mock, '/api/delete_recovery_group')[0]?.url.searchParams ?? [])).toEqual({
      recovery_group_id: 'database_group',
      rollback_from_orchestrator: 'true',
      provider_id: 'airflow-01',
    })
    expect(returned).toMatchObject(report)
  })

  it('rejects an orchestrated group without a provider before calling the API', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    await expect(result.current.remove({ ...loadedGroup(result.current.groups), pushToOrchestrator: true, orchestrationProviderId: null }))
      .rejects.toMatchObject({ code: 'missing_orchestration_provider' })
    expect(calls(mock, '/api/delete_recovery_group')).toHaveLength(0)
  })

  it('returns the rollback report and refetches the list after a standalone rollback', async () => {
    const report = { status: 'partial', airflow: { status: 'ok' }, ibm: { status: 'failed', errors: ['volume busy'] } }
    const mock = stubFetch({ '/api/rollback_group_from_orchestrator': () => ({ recovery_groups: [wireGroup], rollback: report }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    let returned: unknown
    await act(async () => { returned = await result.current.rollback('database_group', 'airflow-01') })

    const [rollback] = calls(mock, '/api/rollback_group_from_orchestrator')
    expect(rollback?.init?.method).toBe('POST')
    expect(Object.fromEntries(rollback?.url.searchParams ?? [])).toEqual({ recovery_group_id: 'database_group', provider_id: 'airflow-01' })
    expect(returned).toMatchObject(report)
    await waitFor(() => { expect(calls(mock, '/api/get_recovery_groups')).toHaveLength(2) })
  })
})
