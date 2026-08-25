import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { keycloak } from '@/config/keycloak'
import { AuthContext, FALLBACK_AUTH_USER, type AuthStatus } from './AuthContext'
import { mapKeycloakProfile } from './mapKeycloakProfile'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('pending')
  const [user, setUser] = useState(FALLBACK_AUTH_USER)
  const { t } = useTranslation()
  // React 19 StrictMode runs effects twice in dev; keycloak-js throws on a
  // second init() call, so a ref guards against that without affecting prod.
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) {
      return
    }
    didInit.current = true

    // PKCE S256 needs window.crypto.subtle, which browsers only expose in a
    // secure context (HTTPS or localhost). The server runs plain HTTP, and
    // installed keycloak-js only supports 'S256' or false (no 'plain'), so
    // PKCE is disabled here (Keycloak client must not enforce it either).
    keycloak
      .init({ onLoad: 'login-required', pkceMethod: false, checkLoginIframe: false })
      .then(async (authenticated) => {
        if (!authenticated) {
          setStatus('error')
          return
        }

        try {
          const profile = await keycloak.loadUserProfile()
          setUser(mapKeycloakProfile(profile))
        } catch (error: unknown) {
          console.error('keycloak profile load failed', error)
        }

        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        console.error('keycloak init failed', error)
        setStatus('error')
      })

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        void keycloak.logout({ redirectUri: window.location.origin })
      })
    }
  }, [])

  if (status !== 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-text-secondary">
        {status === 'error' ? 'Unable to reach the login server.' : t('messages.loading')}
      </div>
    )
  }

  return <AuthContext.Provider value={{ status, user }}>{children}</AuthContext.Provider>
}
