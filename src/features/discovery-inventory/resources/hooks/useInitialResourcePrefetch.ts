import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getGetProvidersQueryOptions } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { buildResourceTabsByRole, resolveActiveResourceTab } from '../helpers/buildResourceSourceTabs'
import { resolveVmwareInitialFilters } from '../helpers/resolveVmwareInitialFilters'
import { getServerSideTagFilter } from '../helpers/filterVirtualMachines'
import { flashSystemInventoryQuery, powerInventoryQuery, vmwareInventoryQuery } from '../model/inventoryQueries'
import { readProviderFilterSnapshot } from '../state/providerFilterSession'

const labels = { vmware: 'VMware', flashsystem: 'FlashSystem', 'ibm-power': 'IBM Power' }

export function useInitialResourcePrefetch(ready: boolean) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!ready) return
    let disposed = false
    const prefetch = async () => {
      try {
        const response = await queryClient.fetchQuery(getGetProvidersQueryOptions({ role: 'all' }))
        if (disposed) return
        const providers = selectProviders(response)
        for (const role of ['source', 'target'] as const) {
          const tab = resolveActiveResourceTab(buildResourceTabsByRole(providers, labels, role), 'vmware', null, true)
          const provider = providers.find(item => item.id === tab?.providerId)
          if (!provider || provider.credentialStatus === 'missing') continue
          switch (tab?.resourceTab) {
            case 'vmware': {
              const scope = { role, resourceTab: 'vmware' as const, providerId: provider.id }
              const filters = resolveVmwareInitialFilters({ ...provider, role }, new URLSearchParams(), readProviderFilterSnapshot(scope))
              const tag = getServerSideTagFilter(filters.tags)
              void queryClient.prefetchQuery(vmwareInventoryQuery({ providerId: provider.id, namePrefix: filters.search, ...(tag ? { tag } : {}) }))
              break
            }
            case 'flashsystem':
              void queryClient.prefetchQuery(flashSystemInventoryQuery(provider.id))
              break
            case 'ibm-power':
              void queryClient.prefetchQuery(powerInventoryQuery(provider.id))
              break
          }
        }
      } catch {
        // Speculative metadata failure leaves the destination's normal fetch intact.
      }
    }
    const run = () => { if (!disposed) void prefetch() }
    const idle = typeof window.requestIdleCallback === 'function'
    const id = idle ? window.requestIdleCallback(run, { timeout: 1000 }) : window.setTimeout(run, 0)
    return () => {
      disposed = true
      if (idle) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [queryClient, ready])
}
