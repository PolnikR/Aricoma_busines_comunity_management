import type { ProviderType } from '../model/providerTypes'

const providerTypeLabels: Record<ProviderType, string> = {
  VMWARE: 'VMware',
  FLASHCOPY: 'FlashCopy',
  IBM_POWER: 'IBM Power',
}

export function providerTypeLabel(type: string): string {
  return type in providerTypeLabels ? providerTypeLabels[type as ProviderType] : type
}
