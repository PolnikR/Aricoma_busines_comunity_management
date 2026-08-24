import type {
  DiscoveryNotificationRecipient,
  DiscoverySettings,
} from '../model/discoverySettingsTypes'

export const DEFAULT_DISCOVERY_SETTINGS: DiscoverySettings = {
  scheduleEnabled: true,
  frequency: '1 hour',
  timezone: 'Europe/Bratislava (UTC+02:00)',
  retention: '30 days',
  customRetentionDays: 45,
  notificationsEnabled: true,
  recipientId: 'nina',
}

export const DISCOVERY_TIMEZONES = [
  'Europe/Bratislava (UTC+02:00)',
  'UTC',
  'Europe/Prague (UTC+02:00)',
]

export const DISCOVERY_NOTIFICATION_RECIPIENTS: DiscoveryNotificationRecipient[] = [
  {
    id: 'nina',
    name: 'Nina Kováčová',
    email: 'nina.kovacova@example.com',
    role: 'Platform administrator',
  },
  {
    id: 'martin',
    name: 'Martin Horváth',
    email: 'martin.horvath@example.com',
    role: 'Infrastructure owner',
  },
  {
    id: 'jana',
    name: 'Jana Nováková',
    email: 'jana.novakova@example.com',
    role: 'Operations lead',
  },
]
