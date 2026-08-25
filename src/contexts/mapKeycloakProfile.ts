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
  const localPart = value.split('@')[0] ?? value
  const parts = localPart.split(/[\s._-]+/u).filter(Boolean)

  if (parts.length === 0) {
    return FALLBACK_USER.initials
  }

  if (parts.length === 1) {
    const first = parts[0] ?? ''
    return first.slice(0, 2).toUpperCase()
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
  const namedDisplay = [firstName, lastName].filter(Boolean).join(' ')
  const displayName = namedDisplay.length > 0 ? namedDisplay : username.length > 0 ? username : email

  if (displayName.length === 0) {
    return FALLBACK_USER
  }

  const resolvedUsername = username.length > 0 ? username : email.length > 0 ? email : FALLBACK_USER.username
  const profileId = profile.id?.trim() ?? ''
  const resolvedId = profileId.length > 0 ? profileId : resolvedUsername

  return {
    id: resolvedId,
    username: resolvedUsername,
    displayName,
    email: email.length > 0 ? email : username,
    initials: getInitials(displayName),
  }
}
