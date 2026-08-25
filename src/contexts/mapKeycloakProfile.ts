import type { KeycloakProfile } from 'keycloak-js'

export interface AuthUser {
  id: string
  username: string
  displayName: string
  email: string
  initials: string
}

const FALLBACK_USER: AuthUser = {
  id: 'unknown',
  username: 'unknown',
  displayName: 'ABCO operator',
  email: '',
  initials: 'AB',
}

function getInitials(value: string): string {
  const parts = value.split(/[\s._-]+/u).filter(Boolean)

  if (parts.length === 0) {
    return FALLBACK_USER.initials
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  const first = parts[0] ?? ''
  const last = parts.at(-1) ?? ''
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function mapKeycloakProfile(profile: KeycloakProfile): AuthUser {
  const username = profile.username?.trim() ?? ''
  const firstName = profile.firstName?.trim() ?? ''
  const lastName = profile.lastName?.trim() ?? ''
  const email = profile.email?.trim() ?? ''
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || email

  if (!displayName) {
    return FALLBACK_USER
  }

  return {
    id: profile.id?.trim() || username || FALLBACK_USER.id,
    username: username || email || FALLBACK_USER.username,
    displayName,
    email: email || username,
    initials: getInitials(displayName),
  }
}
