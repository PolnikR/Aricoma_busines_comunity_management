import type { CleanRoomPolicyRecordOutput } from '@/generated/api/zod.gen'

export type CleanRoomPolicy = Omit<CleanRoomPolicyRecordOutput, 'description'> & {
  description: string
}

export type CleanRoomPolicySubmitData = CleanRoomPolicy
