import type { ProviderRecord, ProviderType } from '../model/providerTypes'

export function filterByType(providers: ProviderRecord[], type: ProviderType): ProviderRecord[] {
  return providers.filter(provider => provider.type === type)
}

export function filterByTypes(providers: ProviderRecord[], types: ProviderType[]): ProviderRecord[] {
  return providers.filter(provider => types.includes(provider.type))
}

export function isProviderType(provider: ProviderRecord, type: ProviderType): boolean {
  return provider.type === type
}

export function isVmwareProvider(provider: ProviderRecord): boolean {
  return provider.type === 'VMWARE'
}

export function isPowerProvider(provider: ProviderRecord): boolean {
  return provider.type === 'IBM_POWER'
}

export function isFlashcopyProvider(provider: ProviderRecord): boolean {
  return provider.type === 'FLASHCOPY'
}

export function getEligibleSourceProviders(providers: ProviderRecord[]): ProviderRecord[] {
  return filterByTypes(providers, ['VMWARE', 'IBM_POWER'])
    .filter(provider => provider.role !== 'target')
}
