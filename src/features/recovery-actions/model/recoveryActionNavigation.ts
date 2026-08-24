import { routes } from '@/app/routes'
import type { RecoveryActionTab } from './recoveryActionTypes'

export const recoveryActionTabs = [
  { value: 'validate', path: routes.recoveryActionValidate, labelKey: 'pages.recoveryActions.tabs.validate' },
  { value: 'execute', path: routes.recoveryActionExecute, labelKey: 'pages.recoveryActions.tabs.execute' },
  { value: 'schedule', path: routes.recoveryActionSchedule, labelKey: 'pages.recoveryActions.tabs.schedule' },
  { value: 'history', path: routes.recoveryActionHistory, labelKey: 'pages.recoveryActions.tabs.history' },
] as const satisfies readonly { value: RecoveryActionTab; path: string; labelKey: string }[]

export function getRecoveryActionTab(pathname: string): RecoveryActionTab {
  return recoveryActionTabs.find((tab) => pathname === tab.path || pathname.startsWith(`${tab.path}/`))?.value ?? 'validate'
}

export function getRecoveryActionPath(tab: RecoveryActionTab): string {
  return recoveryActionTabs.find((item) => item.value === tab)?.path ?? routes.recoveryActionValidate
}
