import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getGetRecoveryGroupInventoryQueryKey, useGetRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
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
const source: ProviderRecord = {
  ...provider,
  id: 'flashsystem-source',
  name: 'FlashSystem source',
  type: 'FLASHCOPY',
  partnerProviderId: 'flashsystem-target',
}
const target: ProviderRecord = {
  ...source,
  id: 'flashsystem-target',
  name: 'FlashSystem target',
  partnerProviderId: 'flashsystem-source',
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
  topology: 'local' as const,
  relatedVolumeProviderId: source.id,
  orchestrationProviderId: 'airflow-01',
  pushToOrchestrator: false,
}

type Handler = (url: URL, init?: RequestInit) => unknown

function stubFetch(handlers: Record<string, Handler> = {}) {
  const mock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>((input, init) => {
    const url = new URL(input, 'http://localhost')
    const handler = handlers[url.pathname]
    const body = handler ? handler(url, init) : { recovery_groups: [wireGroup] }
    return Promise.resolve(body instanceof Response
      ? body
      : new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

const calls = (mock: ReturnType<typeof stubFetch>, path: string) => mock.mock.calls
  .map(([input, init]) => ({ url: new URL(input, 'http://localhost'), init }))
  .filter(call => call.url.pathname === path)

function createWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
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
    mocks.useProviders.mockReturnValue({ data: [provider, source, target], isLoading: false, isSuccess: true, error: null, refetch: vi.fn() })
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

  it.each(['create', 'update'] as const)('preserves the push result alongside the mapped group on %s', async operation => {
    const push = { status: 'pushed', dag_id: 'dag_real', dag: '/airflow/real.py', json: '/airflow/real.json' }
    stubFetch({ '/api/submit_recovery_group': () => ({ recovery_groups: [wireGroup], orchestrator_push: push }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    let saved: unknown
    await act(async () => {
      saved = await (operation === 'create' ? result.current.create(draft) : result.current.update(draft.id, draft))
    })
    expect(saved).toMatchObject({ id: 'database_group', name: 'Database group', orchestratorPush: push })
  })

  it.each([null, undefined, { status: 'skipped', reason: 'Provider disabled', dag: null, dag_id: null, json: null }])(
    'preserves missing or skipped push details when the submit omits the group record (%j)', async push => {
      stubFetch({ '/api/submit_recovery_group': () => ({ recovery_groups: [], ...(push === undefined ? {} : { orchestrator_push: push }) }) })
      const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
      await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
      let saved: unknown
      await act(async () => { saved = await result.current.create(draft) })
      expect(saved).toMatchObject({ id: 'database_group', name: 'Database group', orchestratorPush: push ?? null })
    },
  )

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

  it.each(['local', 'metro_mirror'] as const)('creates and reloads a %s VM group through generated hooks', async topology => {
    const vmDraft = {
      ...draft,
      topology,
      relatedVolumes: topology === 'metro_mirror' ? [' VOL-01 '] : [],
      metroMirrorMode: topology === 'metro_mirror' ? 'existing' as const : null,
      consistencyGroupId: topology === 'metro_mirror' ? ' 001 ' : null,
      auxiliaryNamesByVolume: topology === 'metro_mirror' ? { ' VOL-01 ': ' AUX-01 ' } : {},
      vmMetadataByName: { 'DB-01': { hostname: 'db01.example.test' } },
    }
    let saved: Record<string, unknown> | null = null
    const mock = stubFetch({
      '/api/get_recovery_groups': () => ({ recovery_groups: saved ? [saved] : [wireGroup] }),
      '/api/submit_recovery_group': (_url, init) => {
        saved = JSON.parse(init?.body as string) as Record<string, unknown>
        return { recovery_groups: [{ ...saved, orchestration: { provider_id: 'airflow-01', pushed: false, run_id: 'server-run' } }] }
      },
    })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    let created: unknown
    await act(async () => { created = await result.current.create(vmDraft) })
    expect(created).toMatchObject({
      topology,
      metroMirrorMode: topology === 'metro_mirror' ? 'existing' : null,
      consistencyGroupId: topology === 'metro_mirror' ? '001' : null,
      auxiliaryNamesByVolume: topology === 'metro_mirror' ? { 'VOL-01': 'AUX-01' } : {},
      airflowRunId: 'server-run',
      vmMetadataByName: { 'DB-01': { order: 1, hostname: 'db01.example.test' } },
    })
    expect(JSON.parse(calls(mock, '/api/submit_recovery_group')[0]?.init?.body as string)).toMatchObject({
      topology,
      provider_id_vm: provider.id,
      provider_id_volume: source.id,
      volumes: topology === 'metro_mirror' ? [{ name: 'VOL-01', auxiliary_name: 'AUX-01' }] : [],
    })
    await waitFor(() => { expect(result.current.groups[0]?.topology).toBe(topology) })
    expect(result.current.groups[0]?.auxiliaryNamesByVolume).toEqual(topology === 'metro_mirror' ? { 'VOL-01': 'AUX-01' } : {})
  })

  it.each(['local', 'metro_mirror'] as const)('updates and reloads a %s volume group through generated hooks', async topology => {
    const volumeDraft = {
      ...draft,
      sourceCategory: 'storage_system' as const,
      workloadType: 'ibm_flashsystem' as const,
      resourceType: 'volume' as const,
      providerId: source.id,
      resources: [' VOL-01 '],
      relatedVolumeProviderId: null,
      topology,
      metroMirrorMode: topology === 'metro_mirror' ? 'existing' as const : null,
      consistencyGroupId: topology === 'metro_mirror' ? 'CG-7' : null,
      auxiliaryNamesByVolume: topology === 'metro_mirror' ? { ' VOL-01 ': ' AUX-01 ' } : {},
    }
    let saved: Record<string, unknown> | null = null
    const mock = stubFetch({
      '/api/get_recovery_groups': () => ({ recovery_groups: saved ? [saved] : [wireGroup] }),
      '/api/submit_recovery_group': (_url, init) => {
        saved = JSON.parse(init?.body as string) as Record<string, unknown>
        return { recovery_groups: [{ id: 'other', name: 'Other' }, saved] }
      },
    })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    let updated: unknown
    await act(async () => { updated = await result.current.update('database_group', volumeDraft) })
    expect(updated).toMatchObject({
      id: 'database_group', topology, providerId: source.id, resources: ['VOL-01'],
      auxiliaryNamesByVolume: topology === 'metro_mirror' ? { 'VOL-01': 'AUX-01' } : {},
    })
    expect(JSON.parse(calls(mock, '/api/submit_recovery_group')[0]?.init?.body as string)).toMatchObject({
      id: 'database_group', topology, provider_id_vm: '', provider_id_volume: source.id,
      volumes: topology === 'metro_mirror' ? [{ name: 'VOL-01', auxiliary_name: 'AUX-01' }] : [{ name: 'VOL-01' }],
    })
    await waitFor(() => { expect(result.current.groups[0]?.resourceType).toBe('volume') })
    expect(result.current.groups[0]?.topology).toBe(topology)
  })

  it.each(['create', 'update'] as const)('rejects missing Metro storage values before %s mutation', async operation => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    const metro = { ...draft, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const,
      relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX' }, consistencyGroupId: '' }
    const save = () => operation === 'create' ? result.current.create(metro) : result.current.update(draft.id, metro)
    await expect(save()).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(0)
  })

  it('rejects an invalid Source or unavailable provider query before mutation', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    await expect(result.current.create({ ...draft, relatedVolumeProviderId: 'missing' })).rejects.toMatchObject({ code: 'invalid_draft' })
    await expect(result.current.create({ ...draft, topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: 'CG-7', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' }, relatedVolumeProviderId: source.id, })).resolves.toBeTruthy()
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(1)
  })

  it.each([
    { isLoading: true, isSuccess: false, error: null },
    { isLoading: false, isSuccess: false, error: new Error('provider fetch failed') },
  ])('blocks submit while providers are unavailable: %o', async state => {
    mocks.useProviders.mockReturnValue({ data: undefined, ...state, refetch: vi.fn() })
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })

    await expect(result.current.create(draft)).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(0)
  })

  it('allows updating a loaded legacy Local VM without storage volumes', async () => {
    const mock = stubFetch()
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })

    await act(async () => { await result.current.update('database_group', { ...draft, relatedVolumeProviderId: null }) })
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(1)
    await expect(result.current.create({ ...draft, relatedVolumeProviderId: null }))
      .rejects.toMatchObject({ code: 'invalid_draft' })
  })

  it('uses the latest server record for the legacy exception and rejects explicitly unselected topology', async () => {
    let storageAttached = false
    const mock = stubFetch({ '/api/get_recovery_groups': () => ({ recovery_groups: [{ ...wireGroup, provider_id_volume: storageAttached ? source.id : '' }] }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    await expect(result.current.update(draft.id, { ...draft, topology: null, relatedVolumeProviderId: null })).rejects.toMatchObject({ code: 'invalid_draft' })
    await act(async () => { await result.current.update(draft.id, { ...draft, topology: undefined, relatedVolumeProviderId: null }) })
    storageAttached = true
    await act(async () => { await result.current.refresh() })
    await waitFor(() => { expect(result.current.groups[0]?.relatedVolumeProviderId).toBe(source.id) })
    await expect(result.current.update(draft.id, { ...draft, relatedVolumeProviderId: null })).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(1)
  })

  it('blocks an edit when provider relationships change or refresh is pending', async () => {
    const mock = stubFetch()
    const { result, rerender } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    const metroDraft = {
      ...draft, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const,
      consistencyGroupId: 'CG-7', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }

    mocks.useProviders.mockReturnValue({ data: [provider, { ...source, partnerProviderId: 'missing' }], isLoading: false, isSuccess: true, isFetching: false, error: null, refetch: vi.fn() })
    rerender()
    await expect(result.current.update('database_group', metroDraft)).rejects.toMatchObject({ code: 'invalid_draft' })
    mocks.useProviders.mockReturnValue({ data: [provider, source, target], isLoading: false, isSuccess: true, isFetching: true, error: null, refetch: vi.fn() })
    rerender()
    await expect(result.current.update('database_group', metroDraft)).rejects.toMatchObject({ code: 'invalid_draft' })
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(0)
  })

  it('uses the validated draft when the response omits the requested record', async () => {
    stubFetch({ '/api/submit_recovery_group': () => ({ recovery_groups: [{ id: 'other', name: 'Other' }] }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    const metroDraft = {
      ...draft, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const,
      consistencyGroupId: 'CG-7', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }

    let created: unknown
    await act(async () => { created = await result.current.create(metroDraft) })
    expect(created).toMatchObject({
      id: 'database_group', topology: 'metro_mirror', relatedVolumeProviderId: source.id,
      consistencyGroupId: 'CG-7', auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    })
  })

  it('keeps the draft values after a backend submit failure', async () => {
    const mock = stubFetch({ '/api/submit_recovery_group': () => new Response('failed', { status: 500 }) })
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toHaveLength(1) })
    const attempted = { ...draft }
    await expect(result.current.create(attempted)).rejects.toThrow()
    expect(attempted).toEqual(draft)
    expect(calls(mock, '/api/submit_recovery_group')).toHaveLength(1)
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

  it.each([
    { operation: 'rollback', status: 'ok' },
    { operation: 'rollback', status: 'partial' },
    { operation: 'delete', status: 'ok' },
    { operation: 'delete', status: 'partial' },
  ])('refreshes only the affected inventory after $operation with $status report', async ({ operation, status }) => {
    const client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false }, mutations: { retry: false } } })
    const inventory = (groupId: string, runId: string) => ({
      recovery_group_id: groupId, recovery_group_name: groupId, run_id: runId,
      volumes: { 'VOL-01': { found: true, relations: [{ role: 'source', mapping: { id: 'fc-1' }, paired_volume: { name: 'snapshot-1' } }] } },
    })
    const key = getGetRecoveryGroupInventoryQueryKey({ run_id: 'run-1' })
    const previousKey = getGetRecoveryGroupInventoryQueryKey({ run_id: 'previous-run' })
    const otherKey = getGetRecoveryGroupInventoryQueryKey({ run_id: 'other-run' })
    client.setQueryData(key, inventory(wireGroup.id, 'run-1'))
    client.setQueryData(previousKey, inventory(wireGroup.id, 'previous-run'))
    client.setQueryData(otherKey, inventory('other-group', 'other-run'))
    client.setQueryData(['unrelated'], { recovery_group_id: wireGroup.id })
    const report = { status }
    const mock = stubFetch({
      '/api/rollback_group_from_orchestrator': () => ({ recovery_groups: [wireGroup], rollback: report }),
      '/api/delete_recovery_group': () => ({ recovery_groups: [], rollback: report }),
      '/api/get_recovery_group_inventory': () => ({
        ...inventory(wireGroup.id, 'run-1'), volumes: { 'VOL-01': { found: true, relations: [] } },
      }),
    })
    const { result } = renderHook(() => ({
      groups: useRecoveryGroups(),
      inventory: useGetRecoveryGroupInventory({ run_id: 'run-1' }),
      otherInventory: useGetRecoveryGroupInventory({ run_id: 'other-run' }),
    }), { wrapper: createWrapper(client) })
    await waitFor(() => { expect(result.current.groups.groups).toHaveLength(1) })
    expect(result.current.inventory.data?.volumes['VOL-01']?.relations).toHaveLength(1)
    expect(calls(mock, '/api/get_recovery_group_inventory')).toHaveLength(0)

    await act(async () => {
      if (operation === 'rollback') await result.current.groups.rollback(wireGroup.id, 'airflow-01')
      else await result.current.groups.remove({ ...loadedGroup(result.current.groups.groups), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01' })
    })

    await waitFor(() => { expect(result.current.inventory.data?.volumes['VOL-01']?.relations).toHaveLength(0) })
    expect(calls(mock, '/api/get_recovery_group_inventory').map(call => call.url.searchParams.get('run_id'))).toEqual(['run-1'])
    expect(client.getQueryState(previousKey)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false)
    expect(result.current.otherInventory.data?.volumes['VOL-01']?.relations).toHaveLength(1)
    expect(client.getQueryState(['unrelated'])?.isInvalidated).toBe(false)
    if (operation === 'rollback') {
      expect(result.current.groups.groups[0]?.id).toBe(wireGroup.id)
      expect(calls(mock, '/api/delete_recovery_group')).toHaveLength(0)
    }
    client.clear()
  })

  it.each(['rollback', 'delete'])('restarts a pending first inventory load after %s', async operation => {
    const client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false }, mutations: { retry: false } } })
    let releaseInventory: (response: Response) => void = () => { throw new Error('Inventory request has not started') }
    const pendingInventory = new Promise<Response>(resolve => { releaseInventory = resolve })
    const group = { ...wireGroup, orchestration: { run_id: 'run-1', pushed: true, provider_id: 'airflow-01' } }
    const freshInventory = { recovery_group_id: wireGroup.id, recovery_group_name: wireGroup.name, run_id: 'run-1', volumes: { 'VOL-01': { found: true, relations: [] } } }
    const mock = stubFetch()
    mock.mockImplementation(input => {
      const url = new URL(input, 'http://localhost')
      if (url.pathname === '/api/get_recovery_group_inventory') {
        return calls(mock, url.pathname).length === 1 ? pendingInventory : Promise.resolve(new Response(JSON.stringify(freshInventory)))
      }
      const body = url.pathname === '/api/get_recovery_groups'
        ? { recovery_groups: [group] }
        : { recovery_groups: operation === 'rollback' ? [wireGroup] : [], rollback: { status: 'ok' } }
      return Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }))
    })
    const { result } = renderHook(() => ({ groups: useRecoveryGroups(), inventory: useGetRecoveryGroupInventory({ run_id: 'run-1' }) }), { wrapper: createWrapper(client) })
    await waitFor(() => { expect(result.current.groups.groups).toHaveLength(1) })
    expect(result.current.inventory.data).toBeUndefined()
    expect(calls(mock, '/api/get_recovery_group_inventory')).toHaveLength(1)

    await act(async () => {
      if (operation === 'rollback') await result.current.groups.rollback(wireGroup.id, 'airflow-01')
      else await result.current.groups.remove(loadedGroup(result.current.groups.groups))
      releaseInventory(new Response(JSON.stringify({ ...freshInventory, volumes: { 'VOL-01': { found: true, relations: [{ role: 'source', mapping: {}, paired_volume: { name: 'deleted-snapshot' } }] } } })))
    })

    await waitFor(() => { expect(result.current.inventory.data?.volumes['VOL-01']?.relations).toHaveLength(0) })
    expect(calls(mock, '/api/get_recovery_group_inventory')).toHaveLength(2)
    client.clear()
  })
})
