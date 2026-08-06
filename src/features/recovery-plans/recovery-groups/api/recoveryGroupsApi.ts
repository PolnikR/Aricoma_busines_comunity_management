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
import { recoveryGroupsResponseSchema } from './schemas/recoveryGroupsSchema'
import type { RecoveryGroupApiRecord } from './schemas/recoveryGroupsSchema'
import { validateRecoveryGroupDraft } from './recoveryGroupsValidation'

export const toRecoveryGroupId = toProgrammaticId

function requireOk(response: Response, operation: string): void {
  if (!response.ok) {
    throw new Error(`${operation} request failed with status ${String(response.status)}`)
  }
}

function hasResolvableProvider(
  record: RecoveryGroupApiRecord,
  providers: ProviderRecord[],
): boolean {
  const vmProviderId = record.provider_id_vm.trim()
  if (vmProviderId) {
    return providers.some(
      (provider) => provider.id === vmProviderId
        && (provider.type === 'VMWARE' || provider.type === 'IBM_POWER'),
    )
  }

  const volumeProviderId = record.provider_id_volume.trim()
  return !!volumeProviderId && providers.some(
    (provider) => provider.id === volumeProviderId && provider.type === 'FLASHCOPY',
  )
}

export async function fetchRecoveryGroups(providers: ProviderRecord[]): Promise<RecoveryGroup[]> {
  const response = await apiFetch(API_ENDPOINTS.recoveryGroups.list)
  requireOk(response, 'Get recovery groups')
  const payload: unknown = await response.json()
  return recoveryGroupsResponseSchema.parse(payload).recovery_groups
    .filter(record => hasResolvableProvider(record, providers))
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
  return toRecoveryGroup(validated, id)
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

export async function deleteRecoveryGroup(id: string): Promise<void> {
  const query = new URLSearchParams({ recovery_group_id: id })
  const response = await apiFetch(`${API_ENDPOINTS.recoveryGroups.delete}?${query.toString()}`, {
    method: 'DELETE',
  })
  requireOk(response, 'Delete recovery group')
  const payload: unknown = await response.json()
  recoveryGroupsResponseSchema.parse(payload)
}
