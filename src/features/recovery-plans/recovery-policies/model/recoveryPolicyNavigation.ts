import { routes } from '@/app/routes'

export const RECOVERY_POLICY_TABS = [
  { value: 'snapshot', pathSegment: 'snapshot' },
  { value: 'application-recovery', pathSegment: 'application-recovery' },
  { value: 'clean-room', pathSegment: 'clean-room' },
] as const

export type RecoveryPolicyTab = (typeof RECOVERY_POLICY_TABS)[number]['value']

export function getRecoveryPolicyTab(pathSegment: string | undefined): RecoveryPolicyTab {
  return RECOVERY_POLICY_TABS.find(tab => tab.pathSegment === pathSegment)?.value ?? 'snapshot'
}

export function getRecoveryPolicyPath(tab: RecoveryPolicyTab): string {
  const pathSegment = RECOVERY_POLICY_TABS.find(item => item.value === tab)?.pathSegment ?? 'snapshot'
  return `${routes.recoveryPolicies}/${pathSegment}`
}
