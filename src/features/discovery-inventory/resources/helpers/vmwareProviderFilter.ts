import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

export interface VmwareProviderFilter {
  isFixed: boolean
  prefix: string
  /** Compatibility alias for the first normalized tag; use filters.tags for the full scope. */
  tag: string
  filters: Pick<VirtualMachineFilters, 'search' | 'tags'>
}

interface VmwareProviderFilterSource {
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

export function resolveVmwareProviderFilter(
  provider: VmwareProviderFilterSource | null | undefined,
): VmwareProviderFilter {
  const prefix = provider?.vmPrefix?.trim() ?? ''
  const tags = [...new Set(provider?.vmTags?.map(value => value.trim()).filter(Boolean) ?? [])]
  const tag = tags[0] ?? ''

  return {
    isFixed: Boolean(prefix || tags.length),
    prefix,
    tag,
    filters: {
      search: prefix,
      tags,
    },
  }
}
