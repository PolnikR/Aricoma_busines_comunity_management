import { describe, expect, it } from 'vitest'
import { mapRolesPermissions } from './rolesPermissionsTypes'

describe('rolesPermissionsTypes', () => {
  it('maps generated role records into stable UI records', () => {
    expect(mapRolesPermissions({
      roles: [{
        name: 'platform-admin',
        permissions: ['providers.read'],
        description: 'Manages platform configuration.',
        users: ['alice', 'bob'],
        userCount: 2,
        clientId: 'abco-api',
      }],
      permissions: ['providers.read'],
    })).toEqual({
      roles: [{
        id: 'platform-admin',
        name: 'platform-admin',
        permissions: ['providers.read'],
        description: 'Manages platform configuration.',
        users: ['alice', 'bob'],
        userCount: 2,
        clientId: 'abco-api',
      }],
      permissions: ['providers.read'],
    })
  })

  it('defaults missing membership fields and keeps an unavailable Keycloak lookup as clientId null', () => {
    const { roles } = mapRolesPermissions({
      roles: [
        { name: 'viewer', permissions: [] },
        { name: 'operator', permissions: ['runs.read'], description: null, users: [], userCount: 0, clientId: null },
      ],
      permissions: ['runs.read'],
    })

    expect(roles).toEqual([
      { id: 'viewer', name: 'viewer', permissions: [], description: '', users: [], userCount: 0, clientId: null },
      { id: 'operator', name: 'operator', permissions: ['runs.read'], description: '', users: [], userCount: 0, clientId: null },
    ])
  })
})
