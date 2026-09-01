import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rolesPermissionsKeys } from '../api/rolesPermissionsQueryKeys'
import { useRolesPermissions } from './useRolesPermissions'

const keycloakMock = vi.hoisted(() => ({
  token: 'roles-permissions-test-token',
  updateToken: vi.fn(() => Promise.resolve(true)),
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

afterEach(() => { vi.unstubAllGlobals() })

describe('useRolesPermissions', () => {
  it('loads and caches the current user roles and permissions', async () => {
    const response = {
      roles: [{
        name: 'platform-admin',
        permissions: ['providers.read'],
        description: 'Manages platform configuration.',
      }],
      permissions: ['providers.read'],
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 15 * 60 * 1000 } } })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

    const first = renderHook(() => useRolesPermissions(), { wrapper })
    await waitFor(() => { expect(first.result.current.isSuccess).toBe(true) })
    const second = renderHook(() => useRolesPermissions(), { wrapper })
    expect(second.result.current.data?.roles[0]?.id).toBe('platform-admin')
    expect(client.getQueryData(rolesPermissionsKeys.detail())).toEqual({
      roles: [{
        id: 'platform-admin',
        name: 'platform-admin',
        permissions: ['providers.read'],
        description: 'Manages platform configuration.',
      }],
      permissions: ['providers.read'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
