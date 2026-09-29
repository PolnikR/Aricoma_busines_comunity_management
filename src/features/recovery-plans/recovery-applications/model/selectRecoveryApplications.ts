import type {
  RecoveryAppInventoryResponse,
  RecoveryAppInventoryResponseOutput,
  RecoveryAppsResponse,
  RecoveryAppsResponseOutput,
} from '@/generated/query/zod'
import { mapRecoveryApplications } from '../helpers/mapRecoveryApplications'

// validatingMutator hands select the parsed Output shape; the generated hooks
// declare the Input shape.
export const selectRecoveryApplications = (response: RecoveryAppsResponse) =>
  mapRecoveryApplications(response as RecoveryAppsResponseOutput)

export const selectRecoveryApplicationInventory = (response: RecoveryAppInventoryResponse) =>
  response as RecoveryAppInventoryResponseOutput
