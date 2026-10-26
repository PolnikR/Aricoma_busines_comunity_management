import { isComputeProviderType, isPartnerProviderType } from './providerCategory'
import type { ProviderSubmitData } from './providerTypes'

export type ProviderSpecificField = keyof Pick<ProviderSubmitData,
  'vmPrefix' | 'vmTags' | 'backingStorageProviderIds' | 'partnerProviderId' | 'managedSystem'>

export function getProviderFieldConfig(type: string): Record<ProviderSpecificField, boolean> {
  return {
    vmPrefix: type === 'VMWARE',
    vmTags: type === 'VMWARE',
    backingStorageProviderIds: isComputeProviderType(type),
    partnerProviderId: isPartnerProviderType(type),
    managedSystem: type === 'IBM_POWER',
  }
}
