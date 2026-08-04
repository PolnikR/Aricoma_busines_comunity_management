import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { snapshotPolicyKeys } from '../api/snapshotPolicyQueryKeys'
import type { SnapshotPolicy } from '../model/snapshotPolicyTypes'
import { useDeleteSnapshotPolicy } from './useDeleteSnapshotPolicy'
import { useSnapshotPolicies } from './useSnapshotPolicies'
import { useSubmitSnapshotPolicy } from './useSubmitSnapshotPolicy'

const policy: SnapshotPolicy = {
  id: 'critical-15m',
  name: 'Critical — 15 min',
  description: 'Every 15 minutes, retained 3 hours.',
  level: 'critical',
  frequencyValue: 15,
  frequencyUnit: 'minutes',
  retentionValue: 3,
  retentionUnit: 'hours',
  maxSnapshots: 12,
  enabled: true,
}

const wirePolicy = {
  id: policy.id,
  name: policy.name,
  description: policy.description,
  level: policy.level,
  frequency_value: policy.frequencyValue,
  frequency_unit: policy.frequencyUnit,
  retention_value: policy.retentionValue,
  retention_unit: policy.retentionUnit,
  max_snapshots: policy.maxSnapshots,
  enabled: policy.enabled,
}

function createQueryContext() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function stubPolicies(policies: (typeof wirePolicy)[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ snapshot_policies: policies }), { status: 200 }),
  ))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('snapshot policy hooks', () => {
  it('loads policies into their isolated cache', async () => {
    stubPolicies([wirePolicy])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useSnapshotPolicies(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual([policy])
    expect(client.getQueryData(snapshotPolicyKeys.list())).toEqual([policy])
  })

  it('replaces the cached list with the authoritative submit response', async () => {
    stubPolicies([wirePolicy])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useSubmitSnapshotPolicy(), { wrapper })
    result.current.mutate(policy)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(snapshotPolicyKeys.list())).toEqual([policy])
  })

  it('replaces the cached list with the authoritative delete response', async () => {
    stubPolicies([])
    const { client, wrapper } = createQueryContext()
    client.setQueryData(snapshotPolicyKeys.list(), [policy])

    const { result } = renderHook(() => useDeleteSnapshotPolicy(), { wrapper })
    result.current.mutate(policy.id)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(snapshotPolicyKeys.list())).toEqual([])
  })
})
