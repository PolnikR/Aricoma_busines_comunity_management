import type { PolicySetRecord, PolicySetsResponse } from '@/generated/query/zod'

export const selectPolicySets = (response: PolicySetsResponse): PolicySetRecord[] => response.policy_sets
