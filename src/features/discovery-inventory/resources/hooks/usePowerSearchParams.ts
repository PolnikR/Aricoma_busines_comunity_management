import { useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router'
import { readProviderFilterSnapshot, writeProviderFilterSnapshot, type ProviderFilterScope } from '../state/providerFilterSession'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { PowerFilters } from '../model/sourceInventoryTypes'

type PowerUrlFilters = Omit<PowerFilters, 'search'>

export interface PowerProviderScope {
  id: string
  role?: ProviderFilterScope['role']
}

const POWER_ACTIVE_PROVIDER_PARAM = 'powerActiveProvider'
const POWER_FILTER_PARAMS = ['search', 'partitionKind', 'partitionState', 'operatingSystemType', 'volumeState']

function getFilters(searchParams: URLSearchParams): PowerFilters {
  return {
    search: searchParams.get('search') ?? '',
    partitionKind: searchParams.get('partitionKind') ?? '',
    partitionState: searchParams.get('partitionState') ?? '',
    operatingSystemType: searchParams.get('operatingSystemType') ?? '',
    volumeState: searchParams.get('volumeState') ?? '',
  }
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return POWER_FILTER_PARAMS.some((key) => searchParams.has(key))
}

function getScope(provider: PowerProviderScope): ProviderFilterScope {
  return { role: provider.role ?? 'source', resourceTab: 'ibm-power', providerId: provider.id }
}

function getScopeId(scope: ProviderFilterScope): string {
  return `${scope.role}:ibm-power:${encodeURIComponent(scope.providerId)}`
}

export function usePowerSearchParams(provider?: PowerProviderScope | null) {
  const [searchParams] = useSearchParams()
  const { query, updateQuery } = useResourceInventorySearchParams<PowerUrlFilters>({
    parseFilters: (params) => getFilters(params),
  })
  const [initializedScopeId, markScopeInitialized] = useReducer(
    (_previous: string | undefined, scopeId: string) => scopeId,
    undefined,
  )
  const scope = provider ? getScope(provider) : undefined
  const scopeId = scope ? getScopeId(scope) : undefined
  const activeScopeId = searchParams.get(POWER_ACTIVE_PROVIDER_PARAM)
  const isInitialized = !provider || (initializedScopeId === scopeId && activeScopeId === scopeId)

  useEffect(() => {
    if (!scope || !scopeId) return
    if (initializedScopeId === scopeId && activeScopeId === scopeId) return

    const urlFiltersAreActive = hasUrlFilters(searchParams)
      && (activeScopeId === scopeId || activeScopeId === null)
    const savedSnapshot = urlFiltersAreActive ? undefined : readProviderFilterSnapshot(scope)
    const filters = urlFiltersAreActive ? getFilters(searchParams) : savedSnapshot?.filters ?? getFilters(new URLSearchParams())

    updateQuery({ ...filters, [POWER_ACTIVE_PROVIDER_PARAM]: scopeId })
    markScopeInitialized(scopeId)
  }, [activeScopeId, initializedScopeId, scope, scopeId, searchParams, updateQuery])

  useEffect(() => {
    if (!scope || !isInitialized) return

    writeProviderFilterSnapshot(scope, {
      resourceTab: 'ibm-power',
      initialized: true,
      filters: {
        search: query.search,
        partitionKind: query.partitionKind,
        partitionState: query.partitionState,
        operatingSystemType: query.operatingSystemType,
        volumeState: query.volumeState,
      },
    })
  }, [isInitialized, query.operatingSystemType, query.partitionKind, query.partitionState, query.search, query.volumeState, scope])

  const updateFilters = (filters: Partial<PowerFilters>) => {
    updateQuery({ ...filters, [POWER_ACTIVE_PROVIDER_PARAM]: scopeId ?? '' }, true)
  }

  return { query, updateQuery, updateFilters, isInitialized }
}
