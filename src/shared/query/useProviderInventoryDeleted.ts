import { useCallback, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isProviderInventoryDeleted, subscribeProviderInventoryDeleted } from './providerInventoryRevision'

export function useProviderInventoryDeleted(providerId: string | undefined) {
  const client = useQueryClient()
  const subscribe = useCallback((listener: () => void) => subscribeProviderInventoryDeleted(client, providerId, listener), [client, providerId])
  return useSyncExternalStore(subscribe, () => isProviderInventoryDeleted(client, providerId), () => isProviderInventoryDeleted(client, providerId))
}
