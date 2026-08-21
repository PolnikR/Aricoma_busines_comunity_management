import { useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router'
import { readProviderFilterSnapshot, writeProviderFilterSnapshot, type ProviderFilterScope } from '../state/providerFilterSession'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import {
  VMWARE_ACTIVE_PROVIDER_PARAM,
  VMWARE_DEFAULT_SEARCH_PARAM,
  VMWARE_DEFAULT_TAG_PARAM,
} from './vmwareSearchParamKeys'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

type VirtualMachineUrlFilters = Omit<VirtualMachineFilters, 'search'>

export interface VirtualMachineProviderScope {
  id: string
  role?: ProviderFilterScope['role']
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

type VirtualMachineSearchParamChanges = Partial<VirtualMachineFilters> & Partial<Record<
  typeof VMWARE_ACTIVE_PROVIDER_PARAM | typeof VMWARE_DEFAULT_SEARCH_PARAM | typeof VMWARE_DEFAULT_TAG_PARAM,
  string
>>

const VMWARE_FILTER_PARAMS = ['search', 'powerState', 'connectionState', 'cluster', 'tags', 'untagged']

function parseTags(value: string | null): string[] {
  if (!value) return []
  const firstTag = value.split(',').find(Boolean)
  return firstTag ? [firstTag] : []
}

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return VMWARE_FILTER_PARAMS.some((key) => searchParams.has(key))
}

function getFilters(searchParams: URLSearchParams): VirtualMachineFilters {
  return {
    search: searchParams.get('search') ?? '',
    powerState: searchParams.get('powerState') ?? '',
    connectionState: searchParams.get('connectionState') ?? '',
    cluster: searchParams.get('cluster') ?? '',
    tags: parseTags(searchParams.get('tags')),
    untagged: parseBoolean(searchParams.get('untagged')),
  }
}

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

function getProviderDefaults(provider: VirtualMachineProviderScope): VirtualMachineFilters {
  return {
    search: provider.vmPrefix?.trim() ?? '',
    powerState: '',
    connectionState: '',
    cluster: '',
    tags: provider.vmTags?.[0]?.trim() ? [provider.vmTags[0].trim()] : [],
    untagged: false,
  }
}

export function useVirtualMachineSearchParams(provider?: VirtualMachineProviderScope | null) {
  const [searchParams] = useSearchParams()
  const { query, updateQuery } = useResourceInventorySearchParams<VirtualMachineUrlFilters>({
    parseFilters: getFilters,
  })
  const [initializedScopeId, markScopeInitialized] = useReducer(
    (_previous: string | undefined, scopeId: string) => scopeId,
    undefined,
  )
  const scope = provider ? getScope(provider) : undefined
  const scopeId = scope ? getScopeId(scope) : undefined
  const activeScopeId = searchParams.get(VMWARE_ACTIVE_PROVIDER_PARAM)
  const isInitialized = !provider || (initializedScopeId === scopeId && activeScopeId === scopeId)

  useEffect(() => {
    if (!provider || !scope || !scopeId) return
    if (initializedScopeId === scopeId && activeScopeId === scopeId) return

    const urlFiltersAreActive = activeScopeId === scopeId
      || (activeScopeId === null && hasUrlFilters(searchParams))
    const savedSnapshot = urlFiltersAreActive ? undefined : readProviderFilterSnapshot(scope)
    const filters = urlFiltersAreActive
      ? getFilters(searchParams)
      : savedSnapshot?.filters ?? getProviderDefaults(provider)
    const changes: VirtualMachineSearchParamChanges = {
      ...filters,
      [VMWARE_ACTIVE_PROVIDER_PARAM]: scopeId,
      [VMWARE_DEFAULT_SEARCH_PARAM]: '',
      [VMWARE_DEFAULT_TAG_PARAM]: '',
    }

    updateQuery(changes)
    markScopeInitialized(scopeId)
  }, [activeScopeId, initializedScopeId, provider, scope, scopeId, searchParams, updateQuery])

  useEffect(() => {
    if (!scope || !isInitialized) return

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
  }, [isInitialized, query.cluster, query.connectionState, query.powerState, query.search, query.tags, query.untagged, scope])

  const updateFilters = (filters: VirtualMachineFilters) => {
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
    isInitialized,
  }
}
