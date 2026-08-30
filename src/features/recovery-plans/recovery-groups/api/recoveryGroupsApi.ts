import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import {
  deleteRecoveryGroupRouteDeleteRecoveryGroupDelete,
  getRecoveryGroupsGetRecoveryGroupsGet,
  rollbackGroupFromOrchestratorRollbackGroupFromOrchestratorPost,
  submitRecoveryGroupSubmitRecoveryGroupPost,
} from '@/generated/api/client.gen'
import {
  RecoveryGroupsResponse,
  type RecoveryGroupRecordOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { toOrvalRequestError } from '@/shared/api/orvalMutator'
import { toProgrammaticId } from '@/shared/utils/programmaticId'
import {
  mapRecoveryGroupApiRecord,
  toRecoveryGroup,
  toRecoveryGroupSubmitPayload,
} from '../helpers/mapRecoveryGroups'
import type {
  RecoveryGroup,
  RecoveryGroupDraft,
  RecoveryGroupReadRecord,
} from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'
import { rollbackReportSchema } from './schemas/recoveryGroupsSchema'
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

function toRecoveryGroupReadRecord(record: RecoveryGroupRecordOutput): RecoveryGroupReadRecord {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? '',
    provider_id_vm: record.provider_id_vm ?? '',
    provider_id_volume: record.provider_id_volume ?? '',
    policy_set_id: record.policy_set_id ?? '',
    vms: record.vms,
    volumes: record.volumes,
    ...(record.airflow_run_id !== undefined ? { airflow_run_id: record.airflow_run_id } : {}),
    ...(record.push_to_orchestrator != null
      ? { push_to_orchestrator: record.push_to_orchestrator }
      : {}),
    ...(record.orchestration_provider_id != null
      ? { orchestration_provider_id: record.orchestration_provider_id }
      : {}),
  }
}

function parseRecoveryGroups(payload: unknown, operation: string) {
  return parseGeneratedResponse(RecoveryGroupsResponse, payload, operation)
}

function parseRollbackReport(payload: unknown, operation: string): RollbackReport {
  const parsed = parseRecoveryGroups(payload, operation)
  if (!parsed.rollback) throw new Error(`${operation} response is missing rollback details`)
  if (!payload || typeof payload !== 'object') {
    throw new Error(`${operation} response is missing rollback details`)
  }
  return rollbackReportSchema.parse((payload as Record<string, unknown>)['rollback'])
}

export async function fetchRecoveryGroups(providers: ProviderRecord[]): Promise<RecoveryGroup[]> {
  try {
    const payload = await getRecoveryGroupsGetRecoveryGroupsGet()
    return parseRecoveryGroups(payload, 'GET /get_recovery_groups').recovery_groups
      .map(record => mapRecoveryGroupApiRecord(toRecoveryGroupReadRecord(record), providers))
  } catch (error) {
    throw toOrvalRequestError(error, 'Get recovery groups')
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
    throw toOrvalRequestError(error, 'Submit recovery group')
  }
}

function extractAirflowRunId(payload: unknown, requestedId: string): string | null {
  const parsed = parseRecoveryGroups(payload, 'POST /submit_recovery_group')
  const matchingRecord = parsed.recovery_groups.find(record => record.id === requestedId)
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
      return parseRollbackReport(payload, 'DELETE /delete_recovery_group')
    }
    const payload = await deleteRecoveryGroupRouteDeleteRecoveryGroupDelete({
      recovery_group_id: request.recoveryGroupId,
      rollback_from_orchestrator: false,
    })
    parseRecoveryGroups(payload, 'DELETE /delete_recovery_group')
    return null
  } catch (error) {
    throw toOrvalRequestError(error, 'Delete recovery group')
  }
}

export async function rollbackRecoveryGroupOrchestration(
  groupId: string,
  providerId: string,
): Promise<RollbackReport> {
  try {
    const payload = await rollbackGroupFromOrchestratorRollbackGroupFromOrchestratorPost({
      recovery_group_id: groupId,
      provider_id: providerId,
    })
    return parseRollbackReport(payload, 'POST /rollback_group_from_orchestrator')
  } catch (error) {
    throw toOrvalRequestError(error, 'Rollback recovery group orchestration')
  }
}
