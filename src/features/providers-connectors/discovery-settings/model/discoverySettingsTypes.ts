export const DISCOVERY_FREQUENCIES = [
  '15 minutes',
  '30 minutes',
  '1 hour',
  '6 hours',
  '12 hours',
  '1 day',
] as const

export type DiscoveryFrequency = (typeof DISCOVERY_FREQUENCIES)[number]

export const DISCOVERY_RETENTION_OPTIONS = [
  '7 days',
  '30 days',
  '90 days',
  '180 days',
  '1 year',
  'custom',
] as const

export type DiscoveryRetention = (typeof DISCOVERY_RETENTION_OPTIONS)[number]

export interface DiscoverySettings {
  scheduleEnabled: boolean
  frequency: DiscoveryFrequency
  timezone: string
  retention: DiscoveryRetention
  customRetentionDays: number
  notificationsEnabled: boolean
  recipientId: string
}

export interface DiscoveryNotificationRecipient {
  id: string
  name: string
  email: string
  role: string
}
