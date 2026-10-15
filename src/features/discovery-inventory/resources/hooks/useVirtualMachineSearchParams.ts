import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { clearProviderFilterSnapshot, readProviderFilterSnapshot, writeProviderFilterSnapshot, type ProviderFilterScope } from '../state/providerFilterSession'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import {
  VMWARE_ACTIVE_PROVIDER_PARAM,
  VMWARE_DEFAULT_SEARCH_PARAM,
  VMWARE_DEFAULT_TAG_PARAM,
} from './vmwareSearchParamKeys'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'
import { resolveVmwareProviderFilter } from '../helpers/vmwareProviderFilter'
import { getVmwareUrlFilters, hasVmwareUrlFilters, resolveVmwareInitialFilters, type VirtualMachineProviderScope } from '../helpers/resolveVmwareInitialFilters'

export type { VirtualMachineProviderScope } from '../helpers/resolveVmwareInitialFilters'

type VirtualMachineUrlFilters = Omit<VirtualMachineFilters, 'search'>

function getScope(provider: VirtualMachineProviderScope): ProviderFilterScope {
  return {
    role: provider.role ?? 'source',
    resourceTab: 'vmware',
    providerId: provider.id,
  }
}

function getScopeId(scope: ProviderFilterScope): string {
  return `${scope.role}:${encodeURIComponent(scope.providerId)}`
}

export function useVirtualMachineSearchParams(provider?: VirtualMachineProviderScope | null) {
  const [searchParams] = useSearchParams()
  const { query: urlQuery, updateQuery } = useResourceInventorySearchParams<VirtualMachineUrlFilters>({
    parseFilters: getVmwareUrlFilters,
  })
  const scope = provider ? getScope(provider) : undefined
  const scopeId = scope ? getScopeId(scope) : undefined
  const providerPrefix = provider?.vmPrefix
  const providerTags = provider?.vmTags
  const providerFilter = useMemo(
    () => resolveVmwareProviderFilter({
      ...(providerPrefix !== undefined ? { vmPrefix: providerPrefix } : {}),
      ...(providerTags !== undefined ? { vmTags: providerTags } : {}),
    }),
    [providerPrefix, providerTags],
  )
  const activeScopeId = searchParams.get(VMWARE_ACTIVE_PROVIDER_PARAM)
  const query = useMemo(() => {
    if (!provider || !scope || !scopeId) return urlQuery

    const urlFiltersAreActive = activeScopeId === scopeId
      || (activeScopeId === null && hasVmwareUrlFilters(searchParams))
    const savedSnapshot = providerFilter.isFixed || urlFiltersAreActive ? undefined : readProviderFilterSnapshot(scope)
    const filters = resolveVmwareInitialFilters(provider, searchParams, savedSnapshot)

    return { ...urlQuery, ...filters }
  }, [activeScopeId, provider, providerFilter, scope, scopeId, searchParams, urlQuery])
  useEffect(() => {
    if (!scope) return

    if (providerFilter.isFixed) {
      clearProviderFilterSnapshot(scope)

      const hasStaleUrlFilters = hasVmwareUrlFilters(searchParams)
        || searchParams.has(VMWARE_DEFAULT_SEARCH_PARAM)
        || searchParams.has(VMWARE_DEFAULT_TAG_PARAM)
      if (hasStaleUrlFilters) {
        updateQuery({
          search: '',
          powerState: '',
          connectionState: '',
          cluster: '',
          tags: [],
          untagged: false,
          [VMWARE_ACTIVE_PROVIDER_PARAM]: scopeId ?? '',
          [VMWARE_DEFAULT_SEARCH_PARAM]: '',
          [VMWARE_DEFAULT_TAG_PARAM]: '',
        })
      }
      return
    }

    writeProviderFilterSnapshot(scope, {
      resourceTab: 'vmware',
      initialized: true,
      filters: {
        search: query.search,
        powerState: query.powerState,
        connectionState: query.connectionState,
        cluster: query.cluster,
        tags: query.tags,
        untagged: query.untagged,
      },
    })
  }, [providerFilter.isFixed, query.cluster, query.connectionState, query.powerState, query.search, query.tags, query.untagged, scope, scopeId, searchParams, updateQuery])

  const updateFilters = (filters: VirtualMachineFilters) => {
    if (providerFilter.isFixed) return

    updateQuery({
      ...filters,
      [VMWARE_ACTIVE_PROVIDER_PARAM]: scopeId ?? '',
      [VMWARE_DEFAULT_SEARCH_PARAM]: '',
      [VMWARE_DEFAULT_TAG_PARAM]: '',
    }, true)
  }

  return {
    query,
    updateQuery,
    updateFilters,
    providerFilter,
    isFilterFixed: providerFilter.isFixed,
    isInitialized: true,
  }
}
