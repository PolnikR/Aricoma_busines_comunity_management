import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanRoomPolicyKeys } from '../api/cleanRoomPolicyQueryKeys'
import type { CleanRoomPolicy } from '../model/cleanRoomPolicyTypes'
import { useCleanRoomPolicies } from './useCleanRoomPolicies'
import { useDeleteCleanRoomPolicy } from './useDeleteCleanRoomPolicy'
import { useSubmitCleanRoomPolicy } from './useSubmitCleanRoomPolicy'

const policy: CleanRoomPolicy = {
  id: 'enforce-clean-target',
  name: 'Enforce Clean Target',
  description: 'Remove conflicting target resources before recovery.',
  enabled: true,
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

function stubPolicies(policies: CleanRoomPolicy[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ clean_room_policies: policies }), { status: 200 }),
  ))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('clean room policy hooks', () => {
  it('loads policies into an isolated cache', async () => {
    stubPolicies([policy])
    const { client, wrapper } = createQueryContext()

    const { result } = renderHook(() => useCleanRoomPolicies(), { wrapper })
    await waitFor(() => { expect(result.current.isSuccess).toBe(true) })

    expect(client.getQueryData(cleanRoomPolicyKeys.list())).toEqual([policy])
  })

  it('replaces the cache after submit and delete', async () => {
    stubPolicies([policy])
    const submitContext = createQueryContext()
    const submit = renderHook(() => useSubmitCleanRoomPolicy(), { wrapper: submitContext.wrapper })
    submit.result.current.mutate(policy)
    await waitFor(() => { expect(submit.result.current.isSuccess).toBe(true) })
    expect(submitContext.client.getQueryData(cleanRoomPolicyKeys.list())).toEqual([policy])

    stubPolicies([])
    const deleteContext = createQueryContext()
    deleteContext.client.setQueryData(cleanRoomPolicyKeys.list(), [policy])
    const remove = renderHook(() => useDeleteCleanRoomPolicy(), { wrapper: deleteContext.wrapper })
    remove.result.current.mutate(policy.id)
    await waitFor(() => { expect(remove.result.current.isSuccess).toBe(true) })
    expect(deleteContext.client.getQueryData(cleanRoomPolicyKeys.list())).toEqual([])
  })
})
