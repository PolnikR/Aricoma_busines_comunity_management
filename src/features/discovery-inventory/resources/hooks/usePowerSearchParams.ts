import { useEffect, useMemo } from 'react'
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
  const { query: urlQuery, updateQuery } = useResourceInventorySearchParams<PowerUrlFilters>({
    parseFilters: (params) => getFilters(params),
  })
  const scope = provider ? getScope(provider) : undefined
  const scopeId = scope ? getScopeId(scope) : undefined
  const activeScopeId = searchParams.get(POWER_ACTIVE_PROVIDER_PARAM)
  const query = useMemo(() => {
    if (!scope || !scopeId) return urlQuery

    const urlFiltersAreActive = activeScopeId === scopeId
      || (activeScopeId === null && hasUrlFilters(searchParams))
    const savedSnapshot = urlFiltersAreActive ? undefined : readProviderFilterSnapshot(scope)
    const filters = urlFiltersAreActive
      ? getFilters(searchParams)
      : savedSnapshot?.filters ?? getFilters(new URLSearchParams())

    return { ...urlQuery, ...filters }
  }, [activeScopeId, scope, scopeId, searchParams, urlQuery])
  useEffect(() => {
    if (!scope) return

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
  }, [query.operatingSystemType, query.partitionKind, query.partitionState, query.search, query.volumeState, scope])

  const updateFilters = (filters: Partial<PowerFilters>) => {
    updateQuery({ ...filters, [POWER_ACTIVE_PROVIDER_PARAM]: scopeId ?? '' }, true)
  }

  return { query, updateQuery, updateFilters, isInitialized: true }
}
