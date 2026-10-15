import type { ProviderFilterScope, ProviderFilterSnapshot } from '../state/providerFilterSession'
import type { VirtualMachineFilters } from '../types/virtualMachineTypes'
import { VMWARE_ACTIVE_PROVIDER_PARAM } from '../hooks/vmwareSearchParamKeys'
import { resolveVmwareProviderFilter } from './vmwareProviderFilter'

export interface VirtualMachineProviderScope {
  id: string
  role?: ProviderFilterScope['role']
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

export function hasVmwareUrlFilters(params: URLSearchParams): boolean {
  return ['search', 'powerState', 'connectionState', 'cluster', 'tags', 'untagged'].some(key => params.has(key))
}

export function getVmwareUrlFilters(params: URLSearchParams): VirtualMachineFilters {
  const tag = params.get('tags')?.split(',').find(Boolean)
  return {
    search: params.get('search') ?? '',
    powerState: params.get('powerState') ?? '',
    connectionState: params.get('connectionState') ?? '',
    cluster: params.get('cluster') ?? '',
    tags: tag ? [tag] : [],
    untagged: params.get('untagged') === 'true',
  }
}

export function resolveVmwareInitialFilters(
  provider: VirtualMachineProviderScope,
  params: URLSearchParams,
  snapshot?: ProviderFilterSnapshot,
): VirtualMachineFilters {
  const fixed = resolveVmwareProviderFilter(provider)
  const defaults: VirtualMachineFilters = {
    search: provider.vmPrefix?.trim() ?? '',
    powerState: '', connectionState: '', cluster: '',
    tags: provider.vmTags?.[0]?.trim() ? [provider.vmTags[0].trim()] : [],
    untagged: false,
  }
  if (fixed.isFixed) return { ...defaults, search: fixed.prefix, tags: fixed.filters.tags }

  const activeScopeId = params.get(VMWARE_ACTIVE_PROVIDER_PARAM)
  const scopeId = `${provider.role ?? 'source'}:${encodeURIComponent(provider.id)}`
  if (activeScopeId === scopeId || (activeScopeId === null && hasVmwareUrlFilters(params))) {
    return getVmwareUrlFilters(params)
  }
  return snapshot?.resourceTab === 'vmware' ? snapshot.filters : defaults
}
