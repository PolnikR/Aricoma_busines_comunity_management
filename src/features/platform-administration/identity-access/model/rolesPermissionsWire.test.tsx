import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGetRolesPermissions } from '@/generated/query/identity-access/identity-access.gen'
import { selectRolesPermissions } from './rolesPermissionsTypes'

function stubFetch(body: unknown) {
  const mock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ))
  vi.stubGlobal('fetch', mock)
  return mock
}

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15 * 60 * 1000 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const useRolesPermissions = () => useGetRolesPermissions({ query: { select: selectRolesPermissions } })

describe('roles and permissions wire contract', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('loads roles keyed by name and serves later consumers from the cache', async () => {
    const fetchMock = stubFetch({
      roles: [{ name: 'platform-admin', permissions: ['providers.read'], description: 'Manages platform configuration.' }],
      permissions: ['providers.read'],
    })
    const wrapper = createWrapper()

    const first = renderHook(useRolesPermissions, { wrapper })
    await waitFor(() => { expect(first.result.current.isSuccess).toBe(true) })
    const second = renderHook(useRolesPermissions, { wrapper })

    // Membership fields are absent on the wire here: the schema defaults users/userCount, the mapper defaults clientId.
    expect(second.result.current.data).toEqual({
      roles: [{ id: 'platform-admin', name: 'platform-admin', permissions: ['providers.read'], description: 'Manages platform configuration.', users: [], userCount: 0, clientId: null }],
      permissions: ['providers.read'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/get_roles_permissions')
  })

  it('rejects a response that does not match the contract', async () => {
    stubFetch({ roles: [] })
    const { result } = renderHook(useRolesPermissions, { wrapper: createWrapper() })

    await waitFor(() => { expect(result.current.isError).toBe(true) })
    expect(result.current.error?.message).toMatch(/GET \/get_roles_permissions response does not match OpenAPI/)
  })
})
