import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { apiFetch } from '@/shared/api/apiClient'
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

function requireOk(response: Response, operation: string): void {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
}

export async function fetchRecoveryGroups(providers: ProviderRecord[]): Promise<RecoveryGroup[]> {
  const response = await apiFetch(API_ENDPOINTS.recoveryGroups.list)
  requireOk(response, 'Get recovery groups')
  const payload: unknown = await response.json()
  return recoveryGroupsResponseSchema.parse(payload).recovery_groups
    .map(record => mapRecoveryGroupApiRecord(record, providers))
}

async function submitRecoveryGroup(
  draft: RecoveryGroupDraft,
  requestedId?: string,
): Promise<RecoveryGroup> {
  const validated = validateRecoveryGroupDraft(draft)
  const id = toRecoveryGroupId(requestedId ?? validated.id)
  if (!id) throw new RecoveryGroupsError('invalid_draft', 'Recovery group ID is required')

  const params = new URLSearchParams({
    provider_id: validated.orchestrationProviderId,
    push_to_orchestrator: String(validated.pushToOrchestrator),
  })
  const response = await apiFetch(`${API_ENDPOINTS.recoveryGroups.submit}?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toRecoveryGroupSubmitPayload(validated, id)),
  })
  requireOk(response, 'Submit recovery group')
  const airflowRunId = await extractAirflowRunId(response, id)
  return { ...toRecoveryGroup(validated, id), airflowRunId }
}

async function extractAirflowRunId(response: Response, requestedId: string): Promise<string | null> {
  const payload: unknown = await response.json().catch(() => null)
  const parsed = payload ? recoveryGroupsResponseSchema.safeParse(payload) : null
  if (!parsed?.success) return null
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
  const query = new URLSearchParams({
    recovery_group_id: request.recoveryGroupId,
    rollback_from_orchestrator: String(request.rollbackFromOrchestrator),
  })
  if (request.rollbackFromOrchestrator) {
    const providerId = request.providerId.trim()
    if (!providerId) {
      throw new RecoveryGroupsError(
        'missing_orchestration_provider',
        'An orchestration provider is required to roll back this recovery group',
      )
    }
    query.set('provider_id', providerId)
  }
  const response = await apiFetch(`${API_ENDPOINTS.recoveryGroups.delete}?${query.toString()}`, {
    method: 'DELETE',
  })
  requireOk(response, 'Delete recovery group')
  const payload: unknown = await response.json()
  if (request.rollbackFromOrchestrator) {
    return rollbackResponseSchema.parse(payload).rollback
  }
  recoveryGroupsResponseSchema.parse(payload)
  return null
}

export async function rollbackRecoveryGroupOrchestration(
  groupId: string,
  providerId: string,
): Promise<RollbackReport> {
  const query = new URLSearchParams({
    recovery_group_id: groupId,
    provider_id: providerId,
  })
  const response = await apiFetch(`${API_ENDPOINTS.recoveryGroups.rollback}?${query.toString()}`, {
    method: 'POST',
  })
  requireOk(response, 'Rollback recovery group orchestration')
  const payload: unknown = await response.json()
  return rollbackResponseSchema.parse(payload).rollback
}
