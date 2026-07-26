export const PROVIDER_TYPES = ['VMWARE', 'FLASHCOPY', 'IBM_POWER'] as const

export type ProviderType = (typeof PROVIDER_TYPES)[number]

export interface ProviderRecord {
  id: string
  name: string
  description: string
  type: string
  ipAddress: string
}
