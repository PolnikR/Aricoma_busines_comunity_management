import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { isAuthEnabled } from '@/config/authEnabled'
import { useAuthContext } from '@/contexts/AuthContext'
import { ConnectionTestProvider } from '@/shared/connection-test/ConnectionTestProvider'
import { ConnectionTestHost } from '@/shared/connection-test/ConnectionTestHost'
import { ConnectionTestManager } from '@/shared/connection-test/ConnectionTestManager'
import { SidebarProvider } from '@/layouts/app-shell/SidebarContext'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      ...STANDARD_QUERY_OPTIONS,
    },
  },
})

let nextSessionGeneration = 0

interface AppProvidersProps {
  children: ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  const { status, user } = useAuthContext()
  const [generation] = useState(() => ++nextSessionGeneration)
  const scope = isAuthEnabled()
    ? status === 'authenticated' && user.id.trim() && user.id !== 'unknown'
      ? `auth:${String(generation)}:${user.id}`
      : null
    : `dev:${String(generation)}`
  const [manager] = useState(() => new ConnectionTestManager(queryClient, scope))
  const mountGeneration = useRef({ value: 0 })

  useLayoutEffect(() => { manager.setSessionScope(scope) }, [manager, scope])
  useEffect(() => {
    const state = mountGeneration.current
    const mounted = ++state.value
    return () => {
      // StrictMode replays effects; only a real unmount clears this session's cache.
      queueMicrotask(() => {
        if (state.value === mounted) manager.setSessionScope(null)
      })
    }
  }, [manager])

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionTestProvider manager={manager}>
        <SidebarProvider>{children}</SidebarProvider>
        <ConnectionTestHost />
      </ConnectionTestProvider>
    </QueryClientProvider>
  )
}
