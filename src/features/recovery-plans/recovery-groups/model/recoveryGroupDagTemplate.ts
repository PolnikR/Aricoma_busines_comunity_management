import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroupDraft } from './recoveryGroupTypes'

export function resolveRecoveryGroupDagPlatform(
  draft: Pick<RecoveryGroupDraft, 'resourceType' | 'providerId' | 'relatedVolumeProviderId'>,
  providers: ProviderRecord[],
): 'flashcopy' | 'hitachi' | undefined {
  const providerId = draft.resourceType === 'vm' ? draft.relatedVolumeProviderId : draft.resourceType === 'volume' ? draft.providerId : null
  const type = providers.find(provider => provider.id === providerId)?.type
  return type === 'FLASHCOPY' ? 'flashcopy' : type === 'HITACHI' ? 'hitachi' : undefined
}
