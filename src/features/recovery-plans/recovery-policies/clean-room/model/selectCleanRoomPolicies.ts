import type { CleanRoomPoliciesResponse, CleanRoomPolicyRecord } from '@/generated/query/zod'

export const selectCleanRoomPolicies = (response: CleanRoomPoliciesResponse): CleanRoomPolicyRecord[] => response.clean_room_policies
