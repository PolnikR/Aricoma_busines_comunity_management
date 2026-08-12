export type RecoveryActionTab = 'validate' | 'execute' | 'schedule' | 'history'
export type RecoveryTestStatus = 'passed' | 'failed' | 'running'
export type RecoveryTestMode = 'automated' | 'manual'

export interface RecoveryApplicationGroup {
  id: string
  name: string
  environment: string
  applicationCount: number
  resourceCount: number
}

export interface RecoveryPoint {
  id: string
  capturedAt: string
  configurationAt: string
  snapshotAt: string
  sourceProvider: string
}

export interface ValidationCheck {
  id: string
  label: string
  detail: string
  status: 'passed' | 'warning' | 'failed'
}

export interface RecoveryTestRun {
  id: string
  mode: RecoveryTestMode
  applicationGroup: string
  environment: string
  startedAt: string
  duration: string
  status: RecoveryTestStatus
  checksPassed: number
  checksTotal: number
  summary: string
  recoveryPoint?: RecoveryPoint
}

export interface RecoveryScheduleSettings {
  enabled: boolean
  recurrence: 'weekly' | 'monthly'
  day: string
  time: string
  timezone: string
  applicationGroupId: string
  recipientId: string
}

export interface RecoveryNotificationRecipient {
  id: string
  name: string
  email: string
}
