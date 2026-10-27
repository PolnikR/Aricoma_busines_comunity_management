import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGetProvidersQueryKey } from '@/generated/query/providers/providers.gen'
import { getGetVdisksByVmQueryKey } from '@/generated/query/discovery/discovery.gen'
import { getGetMetroMirrorRelationshipsQueryKey } from '@/generated/query/storage-volumes/storage-volumes.gen'
import { mockVirtualLayout } from '@/shared/components/resource-sidebar/test/mockVirtualLayout'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupBuilder } from './RecoveryGroupBuilder'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({ useGetPolicySets: () => ({ data: [] }) }))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({ useGetPlatformProviders: () => ({ data: [{ id: 'airflow', name: 'Airflow', type: 'AIRFLOW', credentialStatus: 'ok' }] }) }))
const inventory = { data: { resourceNames: ['VM-A', 'VM-B', 'VOL'] }, isLoading: false, isFetching: false, error: null }
vi.mock('../hooks/useRecoveryGroupResourceInventory', () => ({ useRecoveryGroupResourceInventory: () => inventory }))

const group: RecoveryGroup = {
  id: 'group', name: 'Group', description: 'Description', sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm',
  providerId: 'compute', relatedVolumeProviderId: 'source', resources: ['VM-A'], relatedVolumes: ['VOL'], policySetId: 'policy', resourceCount: 1, status: 'Active',
  topology: 'metro_mirror', metroMirrorMode: 'existing', consistencyGroupId: 'SAVED', auxiliaryNamesByVolume: { VOL: 'SAVED-AUX' },
}
const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
function deferredResponse() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
let client: QueryClient
let restoreLayout: () => void
beforeEach(() => {
  restoreLayout = mockVirtualLayout()
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(getGetProvidersQueryKey({ role: 'all' }), { providers: [
    { id: 'compute', name: 'Compute', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
    { id: 'source', name: 'Source', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok', partnerProviderId: 'target' },
    { id: 'target', name: 'Target', type: 'FLASHCOPY', role: 'target', credentialStatus: 'ok' },
  ] })
})
afterEach(() => { cleanup(); client.clear(); restoreLayout(); vi.unstubAllGlobals() })
function show(initialData = group) {
  const onCreate = vi.fn()
  const onDirtyChange = vi.fn()
  render(<StrictMode><QueryClientProvider client={client}><RecoveryGroupBuilder initialData={initialData} onCreate={onCreate} onCancel={vi.fn()} onDirtyChange={onDirtyChange} /></QueryClientProvider></StrictMode>)
  return { onCreate, onDirtyChange }
}

describe('Recovery Group discovery lifecycle through real query hooks', () => {
  it('prunes obsolete overrides after the new VM resolves and ignores the removed VM response arriving late', async () => {
    const oldDisks = deferredResponse()
    const newDisks = deferredResponse()
    const fetch = vi.fn((input: string) => {
      const url = new URL(input, 'http://localhost')
      if (input.includes('vdisks_by_vm')) return url.searchParams.get('vm_name') === 'VM-A' ? oldDisks.promise : newDisks.promise
      return Promise.resolve(response({ provider_id: 'source', consistency_group_id: 'AUTO', volumes: [] }))
    })
    vi.stubGlobal('fetch', fetch)
    const { onCreate } = show({ ...group, auxiliaryNamesByVolume: { VOL: 'SAVED-AUX', OLD: 'OBSOLETE', NEW: 'KEEP' } })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Resources' }))
    await waitFor(() => { expect(fetch.mock.calls.some(([input]) => input.includes('vm_name=VM-A'))).toBe(true) })
    fireEvent.drop(screen.getByLabelText('Selected recovery group virtual machines'), { dataTransfer: { getData: () => 'VM-B' } })
    await user.click(screen.getByRole('button', { name: 'Remove virtual machine: VM-A' }))
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.getByLabelText('Auxiliary volume name: VOL')).toHaveValue('SAVED-AUX')
    await act(async () => { newDisks.resolve(response({ name: 'VM-B', count_vm: 1, count_ibm: 1, vdisks: { disk: { name: 'NEW' } } })); await newDisks.promise })
    await waitFor(() => { expect(screen.getByLabelText('Auxiliary volume name: NEW')).toHaveValue('KEEP') })
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: NEW'), { target: { value: 'LATEST' } })
    await act(async () => { oldDisks.resolve(response({ name: 'VM-A', count_vm: 1, count_ibm: 1, vdisks: { disk: { name: 'OLD' } } })); await oldDisks.promise })
    expect(screen.queryByLabelText('Auxiliary volume name: OLD')).not.toBeInTheDocument()
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'OLD' } })
    expect(screen.getByLabelText('Auxiliary volume name: OLD')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Remove volume: OLD' }))
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ resources: ['VM-B'], relatedVolumes: ['VOL', 'NEW'], auxiliaryNamesByVolume: { VOL: 'SAVED-AUX', NEW: 'LATEST' } }))
  })

  it('keeps removed and cleared disks excluded after real Discovery refetch while allowing explicit readd', async () => {
    vi.stubGlobal('fetch', vi.fn((input: string) => Promise.resolve(response(input.includes('vdisks_by_vm')
      ? { name: 'VM-A', count_vm: 1, count_ibm: 1, vdisks: { disk: { name: 'VOL' } } }
      : { provider_id: 'source', consistency_group_id: 'AUTO', volumes: [] }))))
    show()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    await waitFor(() => { expect(client.getQueryData(getGetVdisksByVmQueryKey({ vm_name: 'VM-A', provider_id: 'compute' }))).toBeDefined() })
    await user.click(screen.getByRole('button', { name: 'Remove volume: VOL' }))
    await act(async () => { await client.refetchQueries({ queryKey: getGetVdisksByVmQueryKey() }) })
    expect(screen.queryByRole('button', { name: 'Remove volume: VOL' })).not.toBeInTheDocument()
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL' } })
    expect(screen.getByLabelText('Auxiliary volume name: VOL')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await act(async () => { await client.refetchQueries({ queryKey: getGetVdisksByVmQueryKey() }) })
    expect(screen.queryByRole('button', { name: 'Remove volume: VOL' })).not.toBeInTheDocument()
    fireEvent.drop(screen.getByLabelText('Selected recovery group volumes'), { dataTransfer: { getData: () => 'VOL' } })
    expect(screen.getByRole('button', { name: 'Remove volume: VOL' })).toBeEnabled()
  })

  it.each(['local', 'existing', 'managed'] as const)('allows direct Save with saved %s selections before Discovery is fetched', async mode => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { onCreate } = show({ ...group, topology: mode === 'local' ? 'local' : 'metro_mirror', metroMirrorMode: mode === 'local' ? null : mode,
      ...(mode === 'managed' ? { consistencyGroupId: '', auxiliaryNamesByVolume: {} } : {}) })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Orchestration' }))
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ resources: ['VM-A'], relatedVolumes: ['VOL'] }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves the newest manual values through pending discovery and a relationship refetch in StrictMode', async () => {
    const disks = deferredResponse()
    const firstLookup = deferredResponse()
    const nextLookup = deferredResponse()
    let lookups = 0
    vi.stubGlobal('fetch', vi.fn((input: string) => input.includes('vdisks_by_vm') ? disks.promise : ++lookups === 1 ? firstLookup.promise : nextLookup.promise))
    const { onCreate, onDirtyChange } = show()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Related storage' }))
    expect(screen.getByLabelText('Auxiliary volume name: VOL')).toHaveValue('SAVED-AUX')
    fireEvent.change(screen.getByLabelText('Consistency group ID'), { target: { value: 'MANUAL-CG' } })
    await act(async () => { disks.resolve(response({ name: 'VM-A', count_vm: 1, count_ibm: 1, vdisks: { disk: { name: 'VOL' } } })); await disks.promise })
    await waitFor(() => { expect(lookups).toBe(1) })
    await act(async () => { firstLookup.resolve(response({ provider_id: 'source', consistency_group_id: 'AUTO', volumes: [{ name: 'VOL', status: 'ok', auxiliary_name: 'AUTO-AUX' }] })); await firstLookup.promise })
    const dirtyCalls = onDirtyChange.mock.calls.length
    let refetch!: Promise<void>
    act(() => { refetch = client.refetchQueries({ queryKey: getGetMetroMirrorRelationshipsQueryKey() }) })
    await waitFor(() => { expect(lookups).toBe(2) })
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: VOL'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Auxiliary volume name: VOL'), { target: { value: 'LATEST-AUX' } })
    await act(async () => { nextLookup.resolve(response({ provider_id: 'source', consistency_group_id: 'NEW-AUTO', volumes: [{ name: 'VOL', status: 'ok', auxiliary_name: 'NEW-AUTO-AUX' }] })); await refetch })
    expect(onDirtyChange).toHaveBeenCalledTimes(dirtyCalls + 2)
    expect(screen.getByLabelText('Consistency group ID')).toHaveValue('MANUAL-CG')
    expect(screen.getByLabelText('Auxiliary volume name: VOL')).toHaveValue('LATEST-AUX')
    await user.click(screen.getByRole('button', { name: 'Orchestration' }))
    await user.click(screen.getByRole('button', { name: 'Create Recovery Group' }))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ consistencyGroupId: 'MANUAL-CG', auxiliaryNamesByVolume: { VOL: 'LATEST-AUX' } }))
  })
})
