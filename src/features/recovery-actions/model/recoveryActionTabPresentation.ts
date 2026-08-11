import type {
  RecoveryScheduleSettings,
  RecoveryTestRun,
  ValidationCheck,
} from './recoveryActionTypes'

export type RecoveryActionStatusTone = 'success' | 'warning' | 'info' | 'neutral'
export type RecoveryActionTranslationParams = Record<string, string | number>

export interface RecoveryActionTabPresentation {
  status: {
    tone: RecoveryActionStatusTone
    labelKey: string
    params: RecoveryActionTranslationParams
  }
  detail: {
    key: string
    params: RecoveryActionTranslationParams
  }
}

export interface RecoveryActionTabPresentationInput {
  latestAutomatedRun: RecoveryTestRun
  latestValidationChecks: ValidationCheck[]
  applicationGroupCount: number
  schedule: RecoveryScheduleSettings
  historyCount: number
  evidenceWindowDays: number
}

export function buildRecoveryActionTabPresentation({
  latestAutomatedRun,
  latestValidationChecks,
  applicationGroupCount,
  schedule,
  historyCount,
  evidenceWindowDays,
}: RecoveryActionTabPresentationInput): Record<'validate' | 'execute' | 'schedule' | 'history', RecoveryActionTabPresentation> {
  const issueCount = latestValidationChecks.filter((check) => check.status !== 'passed').length
  const scheduleStatus = schedule.enabled
    ? schedule.recurrence === 'weekly'
      ? { tone: 'info' as const, labelKey: 'pages.recoveryActions.tabStatus.weekly' }
      : { tone: 'info' as const, labelKey: 'pages.recoveryActions.tabStatus.monthly' }
    : { tone: 'neutral' as const, labelKey: 'pages.recoveryActions.tabStatus.disabled' }

  return {
    validate: {
      status: {
        tone: issueCount > 0 ? 'warning' : 'success',
        labelKey: issueCount === 1 ? 'pages.recoveryActions.tabStatus.issue' : issueCount > 1 ? 'pages.recoveryActions.tabStatus.issues' : 'pages.recoveryActions.tabStatus.ready',
        params: issueCount > 0 ? { count: issueCount } : {},
      },
      detail: {
        key: 'pages.recoveryActions.tabDetail.latestCheck',
        params: { date: latestAutomatedRun.startedAt },
      },
    },
    execute: {
      status: {
        tone: 'success',
        labelKey: 'pages.recoveryActions.tabStatus.ready',
        params: {},
      },
      detail: {
        key: 'pages.recoveryActions.tabDetail.availableGroups',
        params: { count: applicationGroupCount },
      },
    },
    schedule: {
      status: { ...scheduleStatus, params: {} },
      detail: {
        key: schedule.enabled ? 'pages.recoveryActions.tabDetail.schedule' : 'pages.recoveryActions.tabDetail.scheduleDisabled',
        params: schedule.enabled ? { day: schedule.day, time: schedule.time } : {},
      },
    },
    history: {
      status: {
        tone: 'info',
        labelKey: 'pages.recoveryActions.tabStatus.runs',
        params: { count: historyCount },
      },
      detail: {
        key: 'pages.recoveryActions.tabDetail.evidenceWindow',
        params: { days: evidenceWindowDays },
      },
    },
  }
}
