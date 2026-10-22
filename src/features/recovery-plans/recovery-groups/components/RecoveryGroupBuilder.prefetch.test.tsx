import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { invalidateProviderMutation } from '@/shared/query/providerMutationInvalidation'
import { getGetProvidersQueryKey } from '@/generated/query/providers/providers.gen'
import { emptyPowerResponse, emptyVolumesResponse } from '@/features/discovery-inventory/resources/test/discoveryFetch'
import { vmwareInventoryQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({ useGetPolicySets: () => ({ data: [] }) }))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({ useGetPlatformProviders: () => ({ data: [] }) }))

const providers = [
  { id: 'compute', name: 'Compute', type: 'VMWARE', role: 'source', credentialStatus: 'ok', vmPrefix: ' APP ', vmTags: ['prod'] },
  { id: 'flash', name: 'Flash', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok' },
]
const group: RecoveryGroup = {
  id: 'group', name: 'Group', description: 'Description', sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines', resourceType: 'vm', providerId: 'compute', policySetId: '',
  resources: ['APP-01'], relatedVolumeProviderId: 'flash', relatedVolumes: [], resourceCount: 1, status: 'Active', topology: 'local',
}
let client: QueryClient
type FetchInventory = (input: string, init?: RequestInit) => Promise<Response>
let fetchMock: ReturnType<typeof vi.fn<FetchInventory>>
function show(initialData = group, isInitialLoading = false) {
  return render(<QueryClientProvider client={client}><RecoveryGroupBuilder initialData={initialData} isInitialLoading={isInitialLoading} onCreate={vi.fn()} onCancel={vi.fn()} /></QueryClientProvider>)
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  client.setQueryData(getGetProvidersQueryKey({ role: 'all' }), { providers })
  fetchMock = vi.fn<FetchInventory>((input: string) => Promise.resolve(new Response(JSON.stringify(input.includes('/get_volumes') ? emptyVolumesResponse
    : input.includes('/vdisks_by_vm') ? { name: 'APP-01', count_vm: 1, count_ibm: 0, vdisks: {} }
      : input.includes('/get_power_vm') ? emptyPowerResponse : { count: 1, vms: [{ name: 'APP-01' }] }))))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals() })

describe('RecoveryGroupBuilder inventory prefetch', () => {
  it('discards a pending Provider-step response after delete/recreate without replacing the new prefetch', async () => {
    let finishOld!: (response: Response) => void
    const pending = new Promise<Response>(resolve => { finishOld = resolve })
    fetchMock.mockImplementationOnce(() => pending)
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    await act(async () => {
      await invalidateProviderMutation(client, ['deleteProvider'], { params: { provider_id: 'compute' } })
      await invalidateProviderMutation(client, ['submitProvider'], { data: { id: 'compute' } })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(2) })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    await act(async () => { finishOld(Response.json({ count: 1, vms: [{ name: 'STALE' }] })); await pending })
    expect(client.getQueryData(vmwareInventoryQuery({ providerId: 'compute', namePrefix: 'APP', tag: 'prod' }).queryKey)).toMatchObject({ vms: [{ name: 'APP-01' }] })
  })

  it('blocks the actual Provider-step prefetch after delete and retries the same scope after recreate', async () => {
    await invalidateProviderMutation(client, ['deleteProvider'], { params: { provider_id: 'compute' } })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      await invalidateProviderMutation(client, ['submitProvider'], { data: { id: 'compute' } })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    expect(fetchMock).toHaveBeenCalledWith('/api/vms/search?provider_id=compute', expect.objectContaining({ body: '{"tag":"prod","name_prefix":"APP"}' }))
  })

  it.each([
    { type: 'IBM_POWER', workloadType: 'ibm_power_virtual_machines' as const, resourceType: 'vm' as const, providerId: 'power', endpoint: '/api/get_power_vm?provider_id=power' },
    { type: 'FLASHCOPY', workloadType: 'ibm_flashsystem' as const, resourceType: 'volume' as const, providerId: 'flash', endpoint: '/api/get_volumes?provider_id=flash' },
  ])('prepares the selected $type provider without adding scope parameters', async ({ type, resourceType, providerId, endpoint }) => {
    client.setQueryData(getGetProvidersQueryKey({ role: 'all' }), { providers: [
      ...providers, { id: 'power', name: 'Power', type, role: 'source', credentialStatus: 'ok', vmPrefix: 'APP', vmTags: ['not-an-api-filter'] },
    ] })
    show(resourceType === 'volume'
      ? { ...group, workloadType: 'ibm_flashsystem', resourceType: 'volume', providerId, sourceCategory: 'storage_system' }
      : { ...group, workloadType: 'ibm_power_virtual_machines', resourceType: 'vm', providerId, sourceCategory: 'backup_system_workload' })
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(endpoint)
  })

  it('starts the exact provider scope before Resources and reuses a fresh Resources cache entry', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    expect(fetchMock).toHaveBeenCalledWith('/api/vms/search?provider_id=compute', expect.objectContaining({ body: '{"tag":"prod","name_prefix":"APP"}' }))
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('allows immediate Resources navigation while the provider request is pending', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementation(() => new Promise<Response>(done => { resolve = done }))
    show({ ...group, resources: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(1) })
    fireEvent.click(screen.getByRole('button', { name: 'Resources' }))
    expect(screen.getByRole('button', { name: 'Resources' })).toHaveAttribute('aria-current', 'step')
    await act(async () => { resolve(new Response(JSON.stringify({ count: 0, vms: [] }))); await Promise.resolve() })
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uses a pre-existing Resources result instead of a second provider request', async () => {
    client.setQueryData(vmwareInventoryQuery({ providerId: 'compute', namePrefix: 'APP', tag: 'prod' }).queryKey, { count: 0, vms: [] })
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await act(async () => { await Promise.resolve() })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('prepares only selected VM disks and the related storage provider before that step', async () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Resources' }))
    await waitFor(() => { expect(fetchMock.mock.calls.some(([url]) => url.includes('/vdisks_by_vm'))).toBe(true) })
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/vdisks_by_vm')).map(([url]) => url))
      .toEqual(['/api/vdisks_by_vm?vm_name=APP-01&provider_id=compute'])
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/get_volumes')).map(([url]) => url))
      .toEqual(['/api/get_volumes?provider_id=flash'])
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    fireEvent.click(screen.getByRole('button', { name: 'Related storage' }))
    await waitFor(() => { expect(client.isFetching()).toBe(0) })
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/vdisks_by_vm'))).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/get_volumes'))).toHaveLength(1)
  })

  it('does not speculate from a readonly editor or missing credentials', async () => {
    const readonly = show({ ...group, pushToOrchestrator: true })
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await act(async () => { await Promise.resolve() })
    expect(fetchMock).not.toHaveBeenCalled()
    readonly.unmount()
    client.setQueryData(getGetProvidersQueryKey({ role: 'all' }), { providers: providers.map(provider => ({ ...provider, credentialStatus: 'missing' })) })
    show()
    expect(screen.getByRole('button', { name: 'Resources' })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not prefetch from an initially loading editor', async () => {
    show(group, true)
    fireEvent.click(screen.getByRole('button', { name: 'Provider' }))
    await act(async () => { await Promise.resolve() })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
