import { createContext } from 'react'
import type { IdentityAdminGateway } from './identityAdminGateway'
import { mockIdentityAdminGateway } from './mockIdentityAdminGateway'

export const identityAdminGatewayContext = createContext<IdentityAdminGateway>(mockIdentityAdminGateway)
