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
  const initializedProviderId = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (initializedProviderId.current === (provider?.id ?? null)) return
    initializedProviderId.current = provider?.id ?? null

    const changes: Partial<VirtualMachineFilters> = {}
    const vmPrefix = provider?.vmPrefix?.trim()
    const vmTag = provider?.vmTags?.[0]?.trim()
    if (!searchParams.has('search') && vmPrefix) changes.search = vmPrefix
    if (!searchParams.has('tags') && vmTag) changes.tags = [vmTag]
    if (Object.keys(changes).length > 0) updateQuery(changes)
  }, [provider, searchParams, updateQuery])

  const updateFilters = (filters: VirtualMachineFilters) => { updateQuery(filters, true) }

  return { query, updateQuery, updateFilters }
}
