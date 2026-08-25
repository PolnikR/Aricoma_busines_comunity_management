import { describe, expect, it } from 'vitest'
import type { KeycloakProfile } from 'keycloak-js'
import { mapKeycloakProfile } from './mapKeycloakProfile'

describe('mapKeycloakProfile', () => {
  it('maps a complete Keycloak profile to display data', () => {
    const profile: KeycloakProfile = {
      id: 'user-123',
      username: 'jane.doe',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
    }

    expect(mapKeycloakProfile(profile)).toEqual({
      id: 'user-123',
      username: 'jane.doe',
      displayName: 'Jane Doe',
      email: 'jane.doe@example.com',
      initials: 'JD',
    })
  })

  it('falls back to username when names are missing', () => {
    expect(mapKeycloakProfile({ username: 'jane.doe' })).toMatchObject({
      username: 'jane.doe',
      displayName: 'jane.doe',
      email: 'jane.doe',
      initials: 'JD',
    })
  })

  it('falls back to email when both names and username are missing', () => {
    expect(mapKeycloakProfile({ email: 'jane.doe@example.com' })).toMatchObject({
      displayName: 'jane.doe@example.com',
      username: 'jane.doe@example.com',
      email: 'jane.doe@example.com',
      initials: 'JD',
    })
  })

  it('returns neutral display data for an empty profile', () => {
    expect(mapKeycloakProfile({})).toEqual({
      id: 'unknown',
      username: 'unknown',
      displayName: 'ABCO operator',
      email: '',
      initials: 'AB',
    })
  })
})
