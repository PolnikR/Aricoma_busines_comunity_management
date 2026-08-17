import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'

export function getRecoveryGroupsErrorKey(error: unknown): string {
  if (!(error instanceof RecoveryGroupsError)) return 'pages.recoveryGroups.errors.unknown'

  return `pages.recoveryGroups.errors.${error.code}`
}
