import { useEffect, useReducer } from 'react'
import { useSearchParams } from 'react-router'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import { VMWARE_DEFAULT_SEARCH_PARAM, VMWARE_DEFAULT_TAG_PARAM } from './vmwareSearchParamKeys'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

type VirtualMachineUrlFilters = Omit<VirtualMachineFilters, 'search'>

export interface VirtualMachineProviderScope {
  id: string
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

type VirtualMachineSearchParamChanges = Partial<VirtualMachineFilters> & Partial<Record<
  typeof VMWARE_DEFAULT_SEARCH_PARAM | typeof VMWARE_DEFAULT_TAG_PARAM,
  string
>>

function parseTags(value: string | null): string[] {
  if (!value) return []
  const firstTag = value.split(',').find(Boolean)
  return firstTag ? [firstTag] : []
}

function parseBoolean(value: string | null): boolean {
  return value === 'true'
}

function matchesAppliedDefault(searchParams: URLSearchParams, defaultParam: string, value: string | null | undefined) {
  const appliedDefault = searchParams.get(defaultParam)
  return appliedDefault !== null && value === appliedDefault
}

export function useVirtualMachineSearchParams(provider?: VirtualMachineProviderScope | null) {
  const [searchParams] = useSearchParams()
  const { query, updateQuery } = useResourceInventorySearchParams<VirtualMachineUrlFilters>({
    parseFilters: (searchParams) => {
    return {
      powerState: searchParams.get('powerState') ?? '',
      connectionState: searchParams.get('connectionState') ?? '',
      cluster: searchParams.get('cluster') ?? '',
      tags: parseTags(searchParams.get('tags')),
      untagged: parseBoolean(searchParams.get('untagged')),
    }
    },
  })
  const [initializedProviderId, markProviderInitialized] = useReducer(
    (_previous: string | undefined, providerId: string) => providerId,
    undefined,
  )

  const vmPrefix = provider?.vmPrefix?.trim()
  const vmTag = provider?.vmTags?.[0]?.trim()
  const currentSearch = searchParams.get('search')
  const currentTag = parseTags(searchParams.get('tags'))[0]
  const inheritedSearch = matchesAppliedDefault(searchParams, VMWARE_DEFAULT_SEARCH_PARAM, currentSearch)
  const inheritedTag = matchesAppliedDefault(searchParams, VMWARE_DEFAULT_TAG_PARAM, currentTag)
  const hasPendingInitialization = Boolean(provider) && (
    (!searchParams.has('search') && Boolean(vmPrefix))
    || (inheritedSearch && currentSearch !== vmPrefix)
    || (!searchParams.has('tags') && Boolean(vmTag))
    || (inheritedTag && currentTag !== vmTag)
  )
  const isInitialized = !provider || initializedProviderId === provider.id || !hasPendingInitialization

  useEffect(() => {
    if (!provider) return
    if (initializedProviderId === provider.id) return

    const changes: VirtualMachineSearchParamChanges = {}
    const inheritedSearch = matchesAppliedDefault(searchParams, VMWARE_DEFAULT_SEARCH_PARAM, currentSearch)
    const inheritedTag = matchesAppliedDefault(searchParams, VMWARE_DEFAULT_TAG_PARAM, currentTag)

    if (!searchParams.has('search') || inheritedSearch) {
      if (vmPrefix) {
        changes.search = vmPrefix
        changes[VMWARE_DEFAULT_SEARCH_PARAM] = vmPrefix
      } else if (inheritedSearch) {
        changes.search = ''
        changes[VMWARE_DEFAULT_SEARCH_PARAM] = ''
      }
    } else if (searchParams.has(VMWARE_DEFAULT_SEARCH_PARAM)) {
      changes[VMWARE_DEFAULT_SEARCH_PARAM] = ''
    }
    if (!searchParams.has('tags') || inheritedTag) {
      if (vmTag) {
        changes.tags = [vmTag]
        changes[VMWARE_DEFAULT_TAG_PARAM] = vmTag
      } else if (inheritedTag) {
        changes.tags = []
        changes[VMWARE_DEFAULT_TAG_PARAM] = ''
      }
    } else if (searchParams.has(VMWARE_DEFAULT_TAG_PARAM)) {
      changes[VMWARE_DEFAULT_TAG_PARAM] = ''
    }

    if (Object.keys(changes).length > 0) updateQuery(changes)
    markProviderInitialized(provider.id)
  }, [currentSearch, currentTag, initializedProviderId, markProviderInitialized, provider, searchParams, updateQuery, vmPrefix, vmTag])

  const updateFilters = (filters: VirtualMachineFilters) => {
    updateQuery({
      ...filters,
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
