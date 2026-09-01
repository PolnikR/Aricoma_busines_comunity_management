import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRolesPermissions } from './identityAccessApi'

describe('identityAccessApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      roles: [{
        id: 'platform-admin',
        name: 'platform-admin',
        permissions: ['providers.read', 'providers.write'],
        description: 'Manages platform configuration.',
      }],
      permissions: ['providers.read', 'providers.write'],
    }), { status: 200 })))
  })

  it('loads the generated roles and permissions contract', async () => {
    await expect(fetchRolesPermissions()).resolves.toEqual({
      roles: [{
        id: 'platform-admin',
        name: 'platform-admin',
        permissions: ['providers.read', 'providers.write'],
        description: 'Manages platform configuration.',
      }],
      permissions: ['providers.read', 'providers.write'],
    })
    expect(fetch).toHaveBeenCalledWith('/api/get_roles_permissions', expect.objectContaining({ method: 'GET' }))
  })

  it('rejects malformed permission responses at the API boundary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ roles: [] }), { status: 200 })))
    await expect(fetchRolesPermissions()).rejects.toThrow(/GET \/get_roles_permissions response does not match OpenAPI/)
  })
})
