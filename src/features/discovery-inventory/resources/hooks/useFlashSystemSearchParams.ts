import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { readProviderFilterSnapshot, writeProviderFilterSnapshot, type ProviderFilterScope } from '../state/providerFilterSession'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { FlashSystemFilters } from '../model/sourceInventoryTypes'

type FlashSystemUrlFilters = Omit<FlashSystemFilters, 'search'>

export interface FlashSystemProviderScope {
  id: string
  role?: ProviderFilterScope['role']
}

const FLASH_SYSTEM_ACTIVE_PROVIDER_PARAM = 'flashSystemActiveProvider'
const FLASH_SYSTEM_FILTER_PARAMS = ['search', 'poolId', 'hostId', 'status']

function getFilters(searchParams: URLSearchParams): FlashSystemFilters {
  return {
    search: searchParams.get('search') ?? '',
    poolId: searchParams.get('poolId') ?? '',
    hostId: searchParams.get('hostId') ?? '',
    status: searchParams.get('status') ?? '',
  }
}

function hasUrlFilters(searchParams: URLSearchParams): boolean {
  return FLASH_SYSTEM_FILTER_PARAMS.some((key) => searchParams.has(key))
}

function getScope(provider: FlashSystemProviderScope): ProviderFilterScope {
  return { role: provider.role ?? 'source', resourceTab: 'flashsystem', providerId: provider.id }
}

function getScopeId(scope: ProviderFilterScope): string {
  return `${scope.role}:flashsystem:${encodeURIComponent(scope.providerId)}`
}

export function useFlashSystemSearchParams(provider?: FlashSystemProviderScope | null) {
  const [searchParams] = useSearchParams()
  const { query: urlQuery, updateQuery } = useResourceInventorySearchParams<FlashSystemUrlFilters>({
    parseFilters: (params) => getFilters(params),
  })
  const scope = provider ? getScope(provider) : undefined
  const scopeId = scope ? getScopeId(scope) : undefined
  const activeScopeId = searchParams.get(FLASH_SYSTEM_ACTIVE_PROVIDER_PARAM)
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
      resourceTab: 'flashsystem',
      initialized: true,
      filters: {
        search: query.search,
        poolId: query.poolId,
        hostId: query.hostId,
        status: query.status,
      },
    })
  }, [query.hostId, query.poolId, query.search, query.status, scope])

  const updateFilters = (filters: Partial<FlashSystemFilters>) => {
    updateQuery({ ...filters, [FLASH_SYSTEM_ACTIVE_PROVIDER_PARAM]: scopeId ?? '' }, true)
  }

  return { query, updateQuery, updateFilters, isInitialized: true }
}
