import type { RecoveryAppPoliciesResponse, RecoveryAppPolicyRecord } from '@/generated/query/zod'

export const selectRecoveryAppPolicies = (response: RecoveryAppPoliciesResponse): RecoveryAppPolicyRecord[] => response.recovery_app_policies
