import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { policySetKeys } from '../api/policySetQueryKeys'
import type { PolicySet } from '../model/policySetTypes'
import { useDeletePolicySet } from './useDeletePolicySet'
import { usePolicySets } from './usePolicySets'
import { useSubmitPolicySet } from './useSubmitPolicySet'

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshotPolicyIds: ['medium-6h'],
  recoveryAppPolicyId: 'critical-daily-latest',
}

const wirePolicySet = {
  id: policySet.id,
  name: policySet.name,
  description: policySet.description,
  snapshot_policy_ids: policySet.snapshotPolicyIds,
  recovery_app_policy_id: policySet.recoveryAppPolicyId,
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

function stubPolicySets(policySets: (typeof wirePolicySet)[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ policy_sets: policySets }), { status: 200 }),
  ))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('policy set hooks', () => {
  it('loads policy sets into their isolated cache', async () => {
    stubPolicySets([wirePolicySet])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => usePolicySets(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(result.current.data).toEqual([policySet])
    expect(client.getQueryData(policySetKeys.list())).toEqual([policySet])
  })

  it('replaces the cached list with the authoritative submit response', async () => {
    stubPolicySets([wirePolicySet])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useSubmitPolicySet(), { wrapper })
    result.current.mutate(policySet)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(policySetKeys.list())).toEqual([policySet])
  })

  it('replaces the cached list with the authoritative delete response', async () => {
    stubPolicySets([])
    const { client, wrapper } = createQueryContext()
    client.setQueryData(policySetKeys.list(), [policySet])

    const { result } = renderHook(() => useDeletePolicySet(), { wrapper })
    result.current.mutate(policySet.id)
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(policySetKeys.list())).toEqual([])
  })
})
