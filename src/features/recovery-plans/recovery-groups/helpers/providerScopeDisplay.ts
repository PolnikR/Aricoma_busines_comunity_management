import { resolveVmwareProviderFilter } from '@/features/discovery-inventory/resources/helpers/vmwareProviderFilter'
import type { ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'

export interface ProviderScopeDisplay {
  prefix: string
  tag: string
  additionalTagCount: number
}

interface ProviderScopeSource {
  type: ProviderType
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

/** Scope shown on a provider card; null when nothing would be displayed. */
export function getProviderScopeDisplay(provider: ProviderScopeSource): ProviderScopeDisplay | null {
  const filter = resolveVmwareProviderFilter(provider)
  // IBM Power inventory has no tags, so only the name prefix is enforced there.
  const showTag = provider.type === 'VMWARE' && Boolean(filter.tag)
  const configuredTagCount = provider.vmTags?.filter(tag => tag.trim()).length ?? 0
  const display = {
    prefix: filter.prefix,
    tag: showTag ? filter.tag : '',
    additionalTagCount: showTag ? configuredTagCount - 1 : 0,
  }
  return display.prefix || display.tag ? display : null
}
