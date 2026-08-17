import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { keycloak } from '@/config/keycloak'
import { setCurrentUser } from '@/shared/api/currentUser'
import { UserContext, type User } from './UserContext'

// Non-role realm roles Keycloak assigns to every user; not meaningful as
// this app's single "role" field.
const NON_APP_ROLES = new Set(['offline_access', 'uma_authorization'])

function userFromSession(): User {
  const username = typeof keycloak.tokenParsed?.['preferred_username'] === 'string'
    ? keycloak.tokenParsed['preferred_username']
    : 'unknown'
  const roles: string[] = keycloak.tokenParsed?.realm_access?.roles ?? []
  const role = roles.find((r) => !NON_APP_ROLES.has(r) && !r.startsWith('default-roles')) ?? 'user'

  return { username, role }
}

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User>(userFromSession)

  // Write through to the non-React bridge so apiFetch sees the current user.
  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  )
}
