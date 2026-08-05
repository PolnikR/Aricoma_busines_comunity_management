export interface RuntimeConfiguration {
  workDirectory: string
  workDirectoryDefault: string
  tempDirectory: string
  tempDirectoryDefault: string
  logDirectory: string
  logDirectoryDefault: string
  sessionTimeoutMinutes: number
  sessionTimeoutMinDefault: number
  sessionTimeoutMaxDefault: number
  sessionTimeoutDefault: number
}

export const DEFAULT_RUNTIME_CONFIGURATION: RuntimeConfiguration = {
  workDirectory: '/opt/recovery-defender/work',
  workDirectoryDefault: '/opt/recovery-defender/work',
  tempDirectory: '/tmp',
  tempDirectoryDefault: '/tmp',
  logDirectory: '/var/log/recovery-defender',
  logDirectoryDefault: '/var/log/recovery-defender',
  sessionTimeoutMinutes: 30,
  sessionTimeoutMinDefault: 5,
  sessionTimeoutMaxDefault: 480,
  sessionTimeoutDefault: 30,
}
