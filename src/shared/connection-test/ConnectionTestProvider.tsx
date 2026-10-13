import type { ReactNode } from 'react'
import { ConnectionTestContext } from './ConnectionTestContext'
import type { ConnectionTestManager } from './ConnectionTestManager'

export function ConnectionTestProvider({ manager, children }: { manager: ConnectionTestManager; children: ReactNode }) {
  return <ConnectionTestContext.Provider value={manager}>{children}</ConnectionTestContext.Provider>
}
