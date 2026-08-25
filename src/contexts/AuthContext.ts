import { createContext, useContext } from 'react'
import { mapKeycloakProfile, type AuthUser } from './mapKeycloakProfile'

export type AuthStatus = 'pending' | 'authenticated' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser
}

export const FALLBACK_AUTH_USER = mapKeycloakProfile({})

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }

  return context
}
