import { describe, expect, it } from 'vitest'
import { mapRolesPermissions } from './rolesPermissionsTypes'

describe('rolesPermissionsTypes', () => {
  it('maps generated role records into stable UI records', () => {
    expect(mapRolesPermissions({
      roles: [{ name: 'platform-admin', permissions: ['providers.read'], description: 'Manages platform configuration.' }],
      permissions: ['providers.read'],
    })).toEqual({
      roles: [{ id: 'platform-admin', name: 'platform-admin', permissions: ['providers.read'], description: 'Manages platform configuration.' }],
      permissions: ['providers.read'],
    })
  })
})
