export type PlatformProviderConnectionStatus = 'connected' | 'not-configured'

export interface PlatformProviderConfig {
  id: string
  name: string
  connectionStatus: PlatformProviderConnectionStatus
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
  autoRenewOnActivity: boolean
}

export const PLATFORM_PROVIDER_CONFIG_MOCKS: PlatformProviderConfig[] = [
  {
    id: 'recovery-defender',
    name: 'Recovery Defender',
    connectionStatus: 'connected',
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
    autoRenewOnActivity: true,
  },
  {
    id: 'vmware-vcenter',
    name: 'VMware vCenter',
    connectionStatus: 'connected',
    workDirectory: '/opt/vcenter-agent/work',
    workDirectoryDefault: '/opt/vcenter-agent/work',
    tempDirectory: '/tmp',
    tempDirectoryDefault: '/tmp',
    logDirectory: '/var/log/vcenter-agent',
    logDirectoryDefault: '/var/log/vcenter-agent',
    sessionTimeoutMinutes: 60,
    sessionTimeoutMinDefault: 5,
    sessionTimeoutMaxDefault: 480,
    sessionTimeoutDefault: 30,
    autoRenewOnActivity: false,
  },
  {
    id: 'ibm-power',
    name: 'IBM Power',
    connectionStatus: 'not-configured',
    workDirectory: '/opt/ibm-power-agent/work',
    workDirectoryDefault: '/opt/ibm-power-agent/work',
    tempDirectory: '/tmp',
    tempDirectoryDefault: '/tmp',
    logDirectory: '/var/log/ibm-power-agent',
    logDirectoryDefault: '/var/log/ibm-power-agent',
    sessionTimeoutMinutes: 30,
    sessionTimeoutMinDefault: 5,
    sessionTimeoutMaxDefault: 480,
    sessionTimeoutDefault: 30,
    autoRenewOnActivity: true,
  },
  {
    id: 'flashsystem',
    name: 'FlashSystem',
    connectionStatus: 'not-configured',
    workDirectory: '/opt/flashsystem-agent/work',
    workDirectoryDefault: '/opt/flashsystem-agent/work',
    tempDirectory: '/tmp',
    tempDirectoryDefault: '/tmp',
    logDirectory: '/var/log/flashsystem-agent',
    logDirectoryDefault: '/var/log/flashsystem-agent',
    sessionTimeoutMinutes: 30,
    sessionTimeoutMinDefault: 5,
    sessionTimeoutMaxDefault: 480,
    sessionTimeoutDefault: 30,
    autoRenewOnActivity: true,
  },
]
