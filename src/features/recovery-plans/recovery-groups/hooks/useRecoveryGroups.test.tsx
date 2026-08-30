import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { useRecoveryGroups } from './useRecoveryGroups'

const mocks = vi.hoisted(() => ({
  fetchRecoveryGroups: vi.fn(),
  createRecoveryGroup: vi.fn(),
  updateRecoveryGroup: vi.fn(),
  deleteRecoveryGroup: vi.fn(),
  rollbackRecoveryGroupOrchestration: vi.fn(),
  useProviders: vi.fn(),
}))

vi.mock('../api/recoveryGroupsApi', () => ({
  fetchRecoveryGroups: mocks.fetchRecoveryGroups,
  createRecoveryGroup: mocks.createRecoveryGroup,
  updateRecoveryGroup: mocks.updateRecoveryGroup,
  deleteRecoveryGroup: mocks.deleteRecoveryGroup,
  rollbackRecoveryGroupOrchestration: mocks.rollbackRecoveryGroupOrchestration,
}))

vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: mocks.useProviders,
}))

const provider: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'VMware inventory',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  port: 22,
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}

const group: RecoveryGroup = {
  id: 'database_group',
  name: 'Database group',
  description: 'Database virtual machines',
  sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines',
  resourceType: 'vm',
  providerId: provider.id,
  policySetId: 'tier2-apps',
  resources: ['DB-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  resourceCount: 1,
  status: 'Active',
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useRecoveryGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useProviders.mockReturnValue({
      data: [provider],
      isLoading: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    })
    mocks.fetchRecoveryGroups.mockResolvedValue([group])
    mocks.createRecoveryGroup.mockResolvedValue(group)
    mocks.updateRecoveryGroup.mockResolvedValue(group)
    mocks.deleteRecoveryGroup.mockResolvedValue(null)
    mocks.rollbackRecoveryGroupOrchestration.mockResolvedValue({ status: 'ok' })
  })

  it('loads groups using the provider records needed to identify VM type', async () => {
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.groups).toEqual([group]) })
    expect(mocks.fetchRecoveryGroups).toHaveBeenCalledWith([provider])
  })

  it('waits for providers before requesting recovery groups', () => {
    mocks.useProviders.mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
      error: null,
      refetch: vi.fn(),
    })

    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(mocks.fetchRecoveryGroups).not.toHaveBeenCalled()
  })

  it('invalidates and reloads the list after an upsert', async () => {
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toEqual([group]) })
    mocks.fetchRecoveryGroups.mockClear()

    await act(async () => {
      await result.current.create({
        id: group.id,
        name: group.name,
        description: group.description,
        sourceCategory: group.sourceCategory,
        workloadType: group.workloadType,
        resourceType: group.resourceType,
        providerId: group.providerId,
        policySetId: group.policySetId,
        resources: group.resources,
        orchestrationProviderId: 'airflow-01',
        pushToOrchestrator: false,
      })
    })

    await waitFor(() => { expect(mocks.fetchRecoveryGroups).toHaveBeenCalledWith([provider]) })
  })

  it('removes a non-orchestrated group without rollback parameters', async () => {
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toEqual([group]) })

    await act(async () => {
      await result.current.remove(group)
    })

    expect(mocks.deleteRecoveryGroup).toHaveBeenCalledWith({
      recoveryGroupId: group.id,
      rollbackFromOrchestrator: false,
    })
  })

  it('removes an orchestrated group with its orchestration provider and returns the report', async () => {
    const report = { status: 'ok', airflow: { status: 'ok' }, ibm: { status: 'ok', errors: [] } }
    mocks.deleteRecoveryGroup.mockResolvedValue(report)
    const orchestratedGroup: RecoveryGroup = {
      ...group,
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    }
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toEqual([group]) })

    let returned: unknown
    await act(async () => {
      returned = await result.current.remove(orchestratedGroup)
    })

    expect(mocks.deleteRecoveryGroup).toHaveBeenCalledWith({
      recoveryGroupId: group.id,
      rollbackFromOrchestrator: true,
      providerId: 'airflow-01',
    })
    expect(returned).toEqual(report)
  })

  it('rejects an orchestrated group without a provider before calling the API', async () => {
    const orchestratedGroup: RecoveryGroup = { ...group, pushToOrchestrator: true }
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toEqual([group]) })

    await expect(result.current.remove(orchestratedGroup)).rejects.toMatchObject({
      code: 'missing_orchestration_provider',
    })
    expect(mocks.deleteRecoveryGroup).not.toHaveBeenCalled()
  })

  it('returns the rollback report and invalidates the list after a standalone rollback', async () => {
    const report = { status: 'partial', airflow: { status: 'ok' }, ibm: { status: 'failed', errors: ['volume busy'] } }
    mocks.rollbackRecoveryGroupOrchestration.mockResolvedValue(report)
    const { result } = renderHook(() => useRecoveryGroups(), { wrapper: createWrapper() })
    await waitFor(() => { expect(result.current.groups).toEqual([group]) })
    mocks.fetchRecoveryGroups.mockClear()

    let returned: unknown
    await act(async () => {
      returned = await result.current.rollback(group.id, 'airflow-01')
    })

    expect(mocks.rollbackRecoveryGroupOrchestration).toHaveBeenCalledWith(group.id, 'airflow-01')
    expect(returned).toEqual(report)
    await waitFor(() => { expect(mocks.fetchRecoveryGroups).toHaveBeenCalledWith([provider]) })
  })
})
