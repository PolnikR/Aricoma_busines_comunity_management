export const DISCOVERY_FREQUENCIES = [
  '15 minutes',
  '30 minutes',
  '1 hour',
  '6 hours',
  '12 hours',
  '1 day',
] as const

export type DiscoveryFrequency = (typeof DISCOVERY_FREQUENCIES)[number]

export interface DiscoveryScheduleSettings {
  scheduleEnabled: boolean
  frequency: DiscoveryFrequency
  timezone: string
}

export interface DiscoveryNotificationSettings {
  notificationsEnabled: boolean
  recipientId: string
}

export interface DiscoveryNotificationRecipient {
  id: string
  name: string
  email: string
  role: string
}
