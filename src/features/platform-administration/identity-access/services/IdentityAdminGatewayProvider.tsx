import type { ReactNode } from 'react'
import type { IdentityAdminGateway } from './identityAdminGateway'
import { identityAdminGatewayContext as IdentityAdminGatewayContext } from './identityAdminGatewayContext'

export function IdentityAdminGatewayProvider({ gateway, children }: { gateway: IdentityAdminGateway; children: ReactNode }) {
  return <IdentityAdminGatewayContext.Provider value={gateway}>{children}</IdentityAdminGatewayContext.Provider>
}
