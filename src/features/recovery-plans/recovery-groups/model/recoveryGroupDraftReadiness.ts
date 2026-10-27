import { isProgrammaticIdAvailable } from '@/shared/utils/programmaticId'
import { isCredentialOk } from '@/features/providers-connectors/providers/utils/credentialStatusChecks'
import { getRecoveryGroupResourceOption } from '../config/recoveryGroupResourceOptions'
import { calculateRecoveryGroupStepIndices } from '../utils/calculateRecoveryGroupStepIndices'
import type { DraftLifecycle, DraftObservation } from './recoveryGroupDraftLifecycle'
import { getDraftLocks, type DraftResolution } from './resolveRecoveryGroupDraft'
import { isRecoveryGroupEmailValid } from './recoveryGroupEmail'

export interface ReadinessContext extends DraftObservation {
  step: number
  existingIds?: string[]
  isInitialLoading?: boolean
}

export function getDraftReadiness(state: DraftLifecycle, resolution: DraftResolution, context: ReadinessContext) {
  const raw = state.draft
  const { draft, hasRelatedStorageStep, selectedVolumes, metroManaged, topologyValid } = resolution
  const locks = getDraftLocks(context.editAuthority)
  const allProviders = context.providers ?? []
  const providers = context.editAuthority ? allProviders : allProviders.filter(provider => provider.role === 'source')
  const detailsValid = Boolean(raw.id && isProgrammaticIdAvailable(raw.id, context.existingIds ?? [], context.editAuthority?.id)
    && raw.name.trim() && raw.description.trim() && isRecoveryGroupEmailValid(raw.notificationEmail))
  const typeValid = Boolean(raw.sourceCategory && raw.workloadType && raw.resourceType)
  const option = getRecoveryGroupResourceOption(raw.workloadType)
  const providerValid = Boolean(raw.providerId && option && (raw.resourceType === 'volume' ? allProviders : providers)
    .some(provider => provider.id === raw.providerId && provider.type === option.providerType && isCredentialOk(provider)))
  const storageValid = draft.topology !== 'metro_mirror' || (selectedVolumes.length > 0 && (metroManaged
    || (Boolean(draft.consistencyGroupId.trim()) && selectedVolumes.every(name => draft.auxiliaryNamesByVolume[name]?.trim()))))
  const related = context.related?.identity === resolution.discoveryIdentity ? context.related : undefined
  // Preserve navigation of an unfetched/disabled Discovery step; submit validation is separate.
  const discoveryValid = !hasRelatedStorageStep || (!related?.isLoading && !related?.error)
  const policySetValid = Boolean(raw.policySetId)
  const orchestrationValid = Boolean(draft.orchestrationProviderId && context.eligibleOrchestrationProviderIds?.includes(draft.orchestrationProviderId))
  const resourcesValid = draft.resources.length > 0 && (hasRelatedStorageStep || storageValid)
  const baseValid = detailsValid && topologyValid && typeValid && providerValid
  const downstreamValid = baseValid && resourcesValid && storageValid && discoveryValid
  const indices = calculateRecoveryGroupStepIndices(hasRelatedStorageStep)
  const step = context.step
  const canContinue = step === 1 ? detailsValid
    : step === 2 ? detailsValid && topologyValid
      : step === 3 ? detailsValid && topologyValid && typeValid
        : step === 4 ? baseValid
          : step === indices.resourcesStepIndex ? baseValid && resourcesValid
            : step === indices.policySetStepIndex ? downstreamValid && policySetValid
              : downstreamValid
  const canCreate = !locks.readOnly && downstreamValid && policySetValid && orchestrationValid
  const readyForPrefetch = Boolean(baseValid && context.providerStatus?.isSuccess && !locks.readOnly && !context.isInitialLoading)
  const storageProviderValid = allProviders.some(provider => provider.id === raw.relatedVolumeProviderId && provider.type === 'FLASHCOPY' && isCredentialOk(provider))
  return {
    detailsValid, topologyValid, typeValid, providerValid, resourcesValid, storageValid, discoveryValid, policySetValid, orchestrationValid,
    baseValid, downstreamValid, canContinue, canCreate, readyForPrefetch, storageProviderValid, ...locks,
  }
}
