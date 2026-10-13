import { createContext, useCallback, useContext, useSyncExternalStore } from 'react'
import {
  ConnectionTestManager,
  type ConnectionTestKind,
  type ConnectionTestProviderState,
  type ConnectionTestSnapshot,
} from './ConnectionTestManager'

export const ConnectionTestContext = createContext<ConnectionTestManager | null>(null)

export function useConnectionTestManager(): ConnectionTestManager {
  const manager = useContext(ConnectionTestContext)
  if (!manager) throw new Error('useConnectionTestManager must be used within ConnectionTestProvider')
  return manager
}

export function useConnectionTestSnapshot(): ConnectionTestSnapshot {
  const manager = useConnectionTestManager()
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot)
}

export function useProviderTestState(kind: ConnectionTestKind, providerId: string): ConnectionTestProviderState {
  const manager = useConnectionTestManager()
  const getSnapshot = useCallback(
    () => manager.getProviderTestState(kind, providerId),
    [manager, kind, providerId],
  )
  return useSyncExternalStore(manager.subscribe, getSnapshot, getSnapshot)
}
