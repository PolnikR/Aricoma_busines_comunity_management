export const PROVIDER_CONNECTION_STEP_IDS = [
  'configuration',
  'credentials',
  'connection',
  'metadata',
] as const

export type ProviderConnectionStepId = (typeof PROVIDER_CONNECTION_STEP_IDS)[number]
export type ProviderConnectionTestStatus = 'success' | 'failed'
export type ProviderConnectionStepStatus = 'success' | 'running' | 'failed' | 'skipped'

export interface ProviderConnectionTestStep {
  id: ProviderConnectionStepId
  status: ProviderConnectionStepStatus
  detail?: string
}

export interface ProviderConnectionInfo {
  name: string
  hostname: string
  version: string
  ipAddress: string
  providerType?: string
}

export interface ProviderConnectionTestResult {
  status: ProviderConnectionTestStatus
  source: 'mock' | 'api'
  steps: ProviderConnectionTestStep[]
  providerInfo?: ProviderConnectionInfo
  message?: string
}
