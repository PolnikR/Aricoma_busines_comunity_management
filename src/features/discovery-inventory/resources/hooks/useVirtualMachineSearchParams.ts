import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useResourceInventorySearchParams } from './useResourceInventorySearchParams'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

type VirtualMachineUrlFilters = Omit<VirtualMachineFilters, 'search'>

export interface VirtualMachineProviderScope {
  id: string
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

interface AppliedProviderDefaults {
  search?: string
  tag?: string
}

function parseTags(value: string | null): string[] {
  if (!value) return []
  const firstTag = value.split(',').find(Boolean)
  return firstTag ? [firstTag] : []
}

function parseBoolean(value: string | null): boolean {
  return value === 'true'
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
  const initializedProviderId = useRef<string | undefined>(undefined)
  const appliedDefaults = useRef<AppliedProviderDefaults>({})

  useEffect(() => {
    if (!provider || initializedProviderId.current === provider.id) return

    const changes: Partial<VirtualMachineFilters> = {}
    const nextDefaults: AppliedProviderDefaults = {}
    const vmPrefix = provider.vmPrefix?.trim()
    const vmTag = provider.vmTags?.[0]?.trim()
    const inheritedSearch = appliedDefaults.current.search !== undefined
      && searchParams.get('search') === appliedDefaults.current.search
    const inheritedTag = appliedDefaults.current.tag !== undefined
      && parseTags(searchParams.get('tags'))[0] === appliedDefaults.current.tag

    if (!searchParams.has('search') || inheritedSearch) {
      if (vmPrefix) {
        changes.search = vmPrefix
        nextDefaults.search = vmPrefix
      } else if (inheritedSearch) {
        changes.search = ''
      }
    }
    if (!searchParams.has('tags') || inheritedTag) {
      if (vmTag) {
        changes.tags = [vmTag]
        nextDefaults.tag = vmTag
      } else if (inheritedTag) {
        changes.tags = []
      }
    }

    initializedProviderId.current = provider.id
    appliedDefaults.current = nextDefaults
    if (Object.keys(changes).length > 0) updateQuery(changes)
  }, [provider, searchParams, updateQuery])

  const updateFilters = (filters: VirtualMachineFilters) => { updateQuery(filters, true) }

  return { query, updateQuery, updateFilters }
}
