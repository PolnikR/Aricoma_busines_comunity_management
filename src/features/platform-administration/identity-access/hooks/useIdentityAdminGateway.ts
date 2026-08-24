import { useContext } from 'react'
import { identityAdminGatewayContext } from '../services/identityAdminGatewayContext'

export function useIdentityAdminGateway() {
  return useContext(identityAdminGatewayContext)
}
