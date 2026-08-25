import type { VirtualMachineFilters } from '../types/virtualMachineTypes'

export interface VmwareProviderFilter {
  isFixed: boolean
  prefix: string
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
  const tag = provider?.vmTags?.map(value => value.trim()).find(Boolean) ?? ''

  return {
    isFixed: Boolean(prefix || tag),
    prefix,
    tag,
    filters: {
      search: prefix,
      tags: tag ? [tag] : [],
    },
  }
}
