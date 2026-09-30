import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

type TopologyDraft = Pick<RecoveryGroupDraft, 'topology' | 'relatedVolumeProviderId' | 'metroMirrorMode' | 'consistencyGroupId'>

export function getRecoveryGroupTopologyError(
  draft: TopologyDraft,
  providers: ProviderRecord[],
  allowLegacyLocal = false,
) {
  if (!draft.topology) return 'required'
  if (draft.metroMirrorMode === 'managed') return 'managed'
  if (!draft.relatedVolumeProviderId) {
    return allowLegacyLocal && draft.topology === 'local' ? null : 'sourceRequired'
  }
  const source = providers.find(provider => provider.id === draft.relatedVolumeProviderId)
  if (source?.type !== 'FLASHCOPY' || source.credentialStatus !== 'ok') return 'sourceInvalid'
  if (draft.topology === 'local') return null
  if (!source.partnerProviderId) return 'partnerMissing'
  if (source.partnerProviderId === source.id) return 'partnerSame'
  const target = providers.find(provider => provider.id === source.partnerProviderId)
  if (!target) return 'partnerMissing'
  if (target.type !== 'FLASHCOPY' || target.credentialStatus !== 'ok') return 'partnerInvalid'
  if (draft.metroMirrorMode !== 'existing') return 'modeRequired'
  return null
}
