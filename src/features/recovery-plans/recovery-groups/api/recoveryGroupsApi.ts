import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  deleteRecoveryGroupRouteDeleteRecoveryGroupDelete,
  getRecoveryGroupsGetRecoveryGroupsGet,
  rollbackFromOrchestratorRollbackFromOrchestratorPost,
  submitRecoveryGroupSubmitRecoveryGroupPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { toProgrammaticId } from '@/shared/utils/programmaticId'
import {
  mapRecoveryGroupApiRecord,
  toRecoveryGroup,
  toRecoveryGroupSubmitPayload,
} from '../helpers/mapRecoveryGroups'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'
import { recoveryGroupsResponseSchema, rollbackResponseSchema } from './schemas/recoveryGroupsSchema'
import type { RollbackReport } from './schemas/recoveryGroupsSchema'
import { validateRecoveryGroupDraft } from './recoveryGroupsValidation'

export const toRecoveryGroupId = toProgrammaticId

export type DeleteRecoveryGroupRequest =
  | {
      recoveryGroupId: string
      rollbackFromOrchestrator: false
    }
  | {
      recoveryGroupId: string
      rollbackFromOrchestrator: true
      providerId: string
    }

function requestError(error: unknown, operation: string): Error {
  if (error instanceof OrvalApiError) {
    return new Error(`${operation} request failed with status ${String(error.status)}`, { cause: error })
  }
  return error instanceof Error ? error : new Error(`${operation} request failed`)
}

export async function fetchRecoveryGroups(providers: ProviderRecord[]): Promise<RecoveryGroup[]> {
  try {
    const payload = await getRecoveryGroupsGetRecoveryGroupsGet()
    return recoveryGroupsResponseSchema.parse(payload).recovery_groups
      .map(record => mapRecoveryGroupApiRecord(record, providers))
  } catch (error) {
    throw requestError(error, 'Get recovery groups')
  }
}

async function submitRecoveryGroup(
  draft: RecoveryGroupDraft,
  requestedId?: string,
): Promise<RecoveryGroup> {
  const validated = validateRecoveryGroupDraft(draft)
  const id = toRecoveryGroupId(requestedId ?? validated.id)
  if (!id) throw new RecoveryGroupsError('invalid_draft', 'Recovery group ID is required')

  try {
    const payload = await submitRecoveryGroupSubmitRecoveryGroupPost(
      toRecoveryGroupSubmitPayload(validated, id),
      {
        provider_id: validated.orchestrationProviderId,
        push_to_orchestrator: validated.pushToOrchestrator,
      },
    )
    const airflowRunId = extractAirflowRunId(payload, id)
    return { ...toRecoveryGroup(validated, id), airflowRunId }
  } catch (error) {
    throw requestError(error, 'Submit recovery group')
  }
}

function extractAirflowRunId(payload: unknown, requestedId: string): string | null {
  const parsed = recoveryGroupsResponseSchema.safeParse(payload)
  if (!parsed.success) return null
  const matchingRecord = parsed.data.recovery_groups.find(record => record.id === requestedId)
  return matchingRecord?.airflow_run_id ?? null
}

export async function createRecoveryGroup(draft: RecoveryGroupDraft): Promise<RecoveryGroup> {
  return submitRecoveryGroup(draft)
}

export async function updateRecoveryGroup(
  id: string,
  draft: RecoveryGroupDraft,
): Promise<RecoveryGroup> {
  return submitRecoveryGroup(draft, id)
}

export async function deleteRecoveryGroup(
  request: DeleteRecoveryGroupRequest,
): Promise<RollbackReport | null> {
  try {
    if (request.rollbackFromOrchestrator) {
    const providerId = request.providerId.trim()
    if (!providerId) {
      throw new RecoveryGroupsError(
        'missing_orchestration_provider',
        'An orchestration provider is required to roll back this recovery group',
      )
    }
      const payload = await deleteRecoveryGroupRouteDeleteRecoveryGroupDelete({
        recovery_group_id: request.recoveryGroupId,
        rollback_from_orchestrator: true,
        provider_id: providerId,
      })
      return rollbackResponseSchema.parse(payload).rollback
    }
    const payload = await deleteRecoveryGroupRouteDeleteRecoveryGroupDelete({
      recovery_group_id: request.recoveryGroupId,
      rollback_from_orchestrator: false,
    })
    recoveryGroupsResponseSchema.parse(payload)
    return null
  } catch (error) {
    throw requestError(error, 'Delete recovery group')
  }
}

export async function rollbackRecoveryGroupOrchestration(
  groupId: string,
  providerId: string,
): Promise<RollbackReport> {
  try {
    const payload = await rollbackFromOrchestratorRollbackFromOrchestratorPost({
      recovery_group_id: groupId,
      provider_id: providerId,
    })
    return rollbackResponseSchema.parse(payload).rollback
  } catch (error) {
    throw requestError(error, 'Rollback recovery group orchestration')
  }
}
