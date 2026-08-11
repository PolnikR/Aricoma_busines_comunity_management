import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { recoveryAppPolicyKeys } from '../api/recoveryAppPolicyQueryKeys'
import type { RecoveryAppPolicy } from '../model/recoveryAppPolicyTypes'
import { useDeleteRecoveryAppPolicy } from './useDeleteRecoveryAppPolicy'
import { useRecoveryAppPolicies } from './useRecoveryAppPolicies'
import { useSubmitRecoveryAppPolicy } from './useSubmitRecoveryAppPolicy'

const policy: RecoveryAppPolicy = {
  id: 'critical-daily-latest',
  name: 'Critical - Daily DR Test',
  description: 'Daily recovery test using the newest available snapshot.',
  level: 'critical',
  frequencyValue: 1,
  frequencyUnit: 'days',
  retentionValue: 4,
  retentionUnit: 'hours',
  bootVerify: true,
  snapshotSelectionMode: 'latest',
  snapshotMaxAgeValue: null,
  snapshotMaxAgeUnit: null,
  snapshotTargetTime: null,
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
  boot_verify: policy.bootVerify,
  snapshot_selection_mode: policy.snapshotSelectionMode,
  snapshot_max_age_value: policy.snapshotMaxAgeValue,
  snapshot_max_age_unit: policy.snapshotMaxAgeUnit,
  snapshot_target_time: policy.snapshotTargetTime,
  enabled: policy.enabled,
}

function createQueryContext() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

function stubPolicies(policies: (typeof wirePolicy)[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ recovery_app_policies: policies }), { status: 200 }),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recovery app policy hooks', () => {
  it('loads policies into their isolated cache', async () => {
    stubPolicies([wirePolicy])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useRecoveryAppPolicies(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual([policy])
    expect(client.getQueryData(recoveryAppPolicyKeys.list())).toEqual([policy])
  })

  it('replaces the cached list with the authoritative submit response', async () => {
    stubPolicies([wirePolicy])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useSubmitRecoveryAppPolicy(), { wrapper })
    result.current.mutate(policy)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(recoveryAppPolicyKeys.list())).toEqual([policy])
  })

  it('replaces the cached list with the authoritative delete response', async () => {
    stubPolicies([])
    const { client, wrapper } = createQueryContext()
    client.setQueryData(recoveryAppPolicyKeys.list(), [policy])

    const { result } = renderHook(() => useDeleteRecoveryAppPolicy(), { wrapper })
    result.current.mutate(policy.id)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(recoveryAppPolicyKeys.list())).toEqual([])
  })
})
