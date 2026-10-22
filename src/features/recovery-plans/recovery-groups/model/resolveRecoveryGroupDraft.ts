import { reconcileMetroMirrorPrefill } from '../utils/reconcileMetroMirrorPrefill'
import { getRecoveryGroupTopologyError } from '../utils/recoveryGroupTopology'
import type { RecoveryGroupDraft } from './recoveryGroupTypes'
import type { DraftAuthority, DraftLifecycle, DraftObservation } from './recoveryGroupDraftLifecycle'

export function getDraftLocks(authority?: DraftAuthority) {
  const pushedLock = authority?.pushToOrchestrator === true
  const managedProvisionedLock = !pushedLock && authority?.metroMirrorMode === 'managed'
    && (Boolean(authority.consistencyGroupId?.trim()) || Object.values(authority.auxiliaryNamesByVolume ?? {}).some(name => name.trim()))
  return { pushedLock, managedProvisionedLock, readOnly: pushedLock || managedProvisionedLock }
}

export function getDiscoveryIdentity(draft: RecoveryGroupDraft) {
  return JSON.stringify([draft.relatedVolumeProviderId, draft.providerId, [...draft.resources].sort()])
}

export function resolveEffectiveDraft(state: DraftLifecycle, observation: DraftObservation = {}) {
  const raw = state.draft
  const hasRelatedStorageStep = raw.resourceType === 'vm'
  const discoveryIdentity = getDiscoveryIdentity(raw)
  const exclusions = state.exclusions.key === discoveryIdentity ? state.exclusions : undefined
  const related = observation.related?.identity === discoveryIdentity ? observation.related : undefined
  const discovered = hasRelatedStorageStep && raw.relatedVolumeProviderId
    && related?.flashcopyProviderId === raw.relatedVolumeProviderId
    && !related.error && !related.isLoading && !exclusions?.all
    ? related.discoveredVolumeNames.filter(name => !exclusions?.removed.includes(name)) : []
  const eligibleIds = observation.eligibleOrchestrationProviderIds ?? []
  const selectionDraft = {
    ...raw,
    orchestrationProviderId: raw.orchestrationProviderId ?? (eligibleIds.length === 1 ? eligibleIds[0] ?? null : null),
    relatedVolumes: [...new Set([...(raw.relatedVolumes ?? []), ...discovered])],
  }
  const selectedVolumes = hasRelatedStorageStep ? selectionDraft.relatedVolumes : selectionDraft.resources
  const discoverySettled = !hasRelatedStorageStep || Boolean(related?.isResolved && !related.isLoading && !related.error)
  const initial = observation.editAuthority
  const allowLegacyLocal = initial?.resourceType === 'vm' && (initial.topology ?? 'local') === 'local'
    && !initial.relatedVolumeProviderId && initial.relatedVolumes.length === 0
    && !selectionDraft.relatedVolumeProviderId && selectionDraft.relatedVolumes.length === 0
  const status = observation.providerStatus
  const topologyValid = !status?.isLoading && !status?.isFetching && !status?.error
    && getRecoveryGroupTopologyError(selectionDraft, observation.providers ?? [], allowLegacyLocal) === null
  const metroExisting = raw.topology === 'metro_mirror' && raw.metroMirrorMode === 'existing'
  const metroManaged = raw.topology === 'metro_mirror' && raw.metroMirrorMode === 'managed'
  const prefill = reconcileMetroMirrorPrefill(selectedVolumes, raw.auxiliaryNamesByVolume ?? {},
    state.hasConsistencyOverride ? raw.consistencyGroupId ?? '' : undefined, observation.relationships)
  const draft = {
    ...selectionDraft,
    consistencyGroupId: metroExisting ? prefill.consistencyGroupId : metroManaged ? raw.consistencyGroupId ?? '' : '',
    auxiliaryNamesByVolume: metroExisting ? prefill.auxiliaryNamesByVolume : metroManaged ? raw.auxiliaryNamesByVolume ?? {} : {},
  }
  const selectionKey = JSON.stringify([...selectedVolumes].sort())
  return {
    selectionDraft, draft, selectedVolumes, discoveryIdentity, discoverySettled, allowLegacyLocal, topologyValid,
    hasRelatedStorageStep, metroExisting, metroManaged, prefill,
    relatedVolumeRequest: { computeProviderId: raw.providerId, vmNames: raw.resources, sourceId: raw.relatedVolumeProviderId ?? null },
    relationshipLookup: { sourceId: raw.relatedVolumeProviderId ?? null, names: selectedVolumes, enabled: metroExisting && topologyValid && discoverySettled },
    selectionObservation: discoverySettled && state.previousSelectionKey !== selectionKey
      ? { type: 'selectionObserved' as const, identity: discoveryIdentity } : undefined,
  }
}

export type DraftResolution = ReturnType<typeof resolveEffectiveDraft>
