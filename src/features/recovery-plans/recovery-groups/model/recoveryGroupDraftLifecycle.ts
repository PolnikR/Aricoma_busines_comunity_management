import type {
  RecoveryGroup,
  RecoveryGroupDraft,
  RecoveryGroupMetroMirrorMode,
  RecoveryGroupSourceCategory,
  RecoveryGroupTopology,
  RecoveryGroupVmMetadata,
  RecoveryGroupWorkloadType,
  RecoveryGroupResourceType,
} from './recoveryGroupTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { MetroMirrorRelationshipsResponseOutput } from '@/generated/query/zod/metroMirrorRelationshipsResponse.gen'
import { getDiscoveryIdentity, getDraftLocks, resolveEffectiveDraft } from './resolveRecoveryGroupDraft'

export { resolveEffectiveDraft } from './resolveRecoveryGroupDraft'
export { getDraftReadiness } from './recoveryGroupDraftReadiness'

export type DraftAuthority = Pick<RecoveryGroup, 'id' | 'pushToOrchestrator' | 'metroMirrorMode' | 'consistencyGroupId' | 'auxiliaryNamesByVolume' | 'resourceType' | 'topology' | 'relatedVolumeProviderId' | 'relatedVolumes'>

export interface DraftLifecycle {
  readonly draft: RecoveryGroupDraft
  readonly hasConsistencyOverride: boolean
  readonly exclusions: { key: string; removed: string[]; all: boolean }
  readonly previousSelectionKey: string | null
}

export type DraftEvent =
  | { type: 'detailsChanged'; values: Partial<Pick<RecoveryGroupDraft, 'id' | 'name' | 'description'>> }
  | { type: 'sourceChanged'; sourceId: string | null }
  | { type: 'topologyChanged'; topology: RecoveryGroupTopology }
  | { type: 'metroModeChanged'; mode: RecoveryGroupMetroMirrorMode }
  | { type: 'categoryChanged'; category: RecoveryGroupSourceCategory }
  | { type: 'workloadSelected'; category: RecoveryGroupSourceCategory; workload: RecoveryGroupWorkloadType; resourceType: RecoveryGroupResourceType }
  | { type: 'providerSelected'; providerId: string }
  | { type: 'resourceAdded' | 'resourceRemoved' | 'relatedVolumeAdded' | 'relatedVolumeRemoved'; name: string }
  | { type: 'relatedSelectionCleared' }
  | { type: 'auxiliaryChanged'; name: string; value: string }
  | { type: 'consistencyGroupChanged'; value: string }
  | { type: 'policySelected'; policySetId: string }
  | { type: 'orchestrationProviderSelected'; providerId: string }
  | { type: 'pushChanged'; value: boolean }
  | { type: 'metadataAvailable'; metadata: Record<string, RecoveryGroupVmMetadata> }
  | { type: 'selectionObserved'; identity: string }

export interface DraftObservation {
  editAuthority?: DraftAuthority | undefined
  providers?: ProviderRecord[] | undefined
  providerStatus?: { isLoading?: boolean; isFetching?: boolean; isSuccess?: boolean; error?: unknown } | undefined
  eligibleOrchestrationProviderIds?: string[] | undefined
  related?: { identity: string; flashcopyProviderId: string | null; discoveredVolumeNames: string[]; isLoading: boolean; isResolved: boolean; error?: unknown } | undefined
  relationships?: MetroMirrorRelationshipsResponseOutput | undefined
}

export function initializeDraft(initialData?: RecoveryGroup): DraftLifecycle {
  const draft: RecoveryGroupDraft = initialData ? {
    id: initialData.id, name: initialData.name, description: initialData.description,
    sourceCategory: initialData.sourceCategory, workloadType: initialData.workloadType, resourceType: initialData.resourceType,
    providerId: initialData.providerId, policySetId: initialData.policySetId, resources: [...initialData.resources],
    relatedVolumeProviderId: initialData.resourceType === 'volume' ? initialData.providerId : initialData.relatedVolumeProviderId ?? null,
    relatedVolumes: [...initialData.relatedVolumes],
    vmMetadataByName: initialData.vmMetadataByName ? Object.fromEntries(Object.entries(initialData.vmMetadataByName).map(([name, metadata]) => [name, { ...metadata }])) : undefined,
    orchestrationProviderId: initialData.orchestrationProviderId ?? null, pushToOrchestrator: initialData.pushToOrchestrator ?? false,
    topology: initialData.topology ?? 'local', metroMirrorMode: initialData.metroMirrorMode ?? null,
    consistencyGroupId: initialData.consistencyGroupId ?? '', auxiliaryNamesByVolume: { ...initialData.auxiliaryNamesByVolume },
  } : {
    id: '', name: '', description: '', sourceCategory: null, workloadType: null, resourceType: null,
    providerId: null, policySetId: null, resources: [], relatedVolumeProviderId: null, relatedVolumes: [],
    orchestrationProviderId: null, pushToOrchestrator: false, topology: null, metroMirrorMode: null,
    consistencyGroupId: '', auxiliaryNamesByVolume: {},
  }
  return { draft, hasConsistencyOverride: Boolean(initialData?.consistencyGroupId?.trim()), exclusions: { key: '', removed: [], all: false }, previousSelectionKey: null }
}

export function transitionDraft(current: DraftLifecycle, event: DraftEvent, context: DraftObservation = {}): { state: DraftLifecycle; notifyDirty: boolean } {
  if (event.type === 'selectionObserved') {
    if (event.identity !== getDiscoveryIdentity(current.draft)) return { state: current, notifyDirty: false }
    const resolution = resolveEffectiveDraft(current, context)
    const key = JSON.stringify([...resolution.selectedVolumes].sort())
    if (!resolution.discoverySettled || current.previousSelectionKey === key) return { state: current, notifyDirty: false }
    const active = new Set(resolution.selectedVolumes)
    const overrides = current.draft.auxiliaryNamesByVolume ?? {}
    const draft = Object.keys(overrides).some(name => !active.has(name))
      ? { ...current.draft, auxiliaryNamesByVolume: Object.fromEntries(Object.entries(overrides).filter(([name]) => active.has(name))) }
      : current.draft
    return { state: { ...current, draft, previousSelectionKey: key }, notifyDirty: false }
  }
  if (event.type === 'metadataAvailable') {
    return { state: { ...current, draft: { ...current.draft, vmMetadataByName: { ...current.draft.vmMetadataByName, ...event.metadata } } }, notifyDirty: false }
  }
  if (getDraftLocks(context.editAuthority).readOnly) return { state: current, notifyDirty: false }
  const raw = current.draft
  const selection = resolveEffectiveDraft(current, context).selectionDraft
  let patch: Partial<RecoveryGroupDraft>
  let hasConsistencyOverride = current.hasConsistencyOverride
  let exclusions = current.exclusions
  const withoutAuxiliary = (name: string) => Object.fromEntries(Object.entries(raw.auxiliaryNamesByVolume ?? {}).filter(([key]) => key !== name))
  switch (event.type) {
    case 'detailsChanged': patch = event.values; break
    case 'sourceChanged':
      patch = { relatedVolumeProviderId: event.sourceId }
      if (event.sourceId !== raw.relatedVolumeProviderId) {
        hasConsistencyOverride = false
        exclusions = { key: '', removed: [], all: false }
        patch = { ...patch, relatedVolumes: [], auxiliaryNamesByVolume: {}, consistencyGroupId: '',
          ...(raw.resourceType === 'volume' ? { providerId: event.sourceId, resources: [] } : {}) }
      }
      break
    case 'topologyChanged': {
      const mode = event.topology === 'metro_mirror' ? 'existing' : null
      if (event.topology !== raw.topology || mode !== raw.metroMirrorMode) hasConsistencyOverride = false
      patch = { topology: event.topology, metroMirrorMode: mode, consistencyGroupId: '', auxiliaryNamesByVolume: {} }
      break
    }
    case 'metroModeChanged':
      if (event.mode !== raw.metroMirrorMode) hasConsistencyOverride = false
      patch = { metroMirrorMode: event.mode, consistencyGroupId: '', auxiliaryNamesByVolume: {} }
      break
    case 'categoryChanged':
      patch = { sourceCategory: event.category, workloadType: null, resourceType: null, providerId: null, resources: [], vmMetadataByName: {}, auxiliaryNamesByVolume: {}, relatedVolumes: [] }
      break
    case 'workloadSelected': {
      const same = raw.workloadType === event.workload
      patch = { sourceCategory: event.category, workloadType: event.workload, resourceType: event.resourceType,
        providerId: event.resourceType === 'volume' ? raw.relatedVolumeProviderId ?? null : same ? raw.providerId : null,
        resources: same ? selection.resources : [], vmMetadataByName: same ? raw.vmMetadataByName : {},
        auxiliaryNamesByVolume: same ? raw.auxiliaryNamesByVolume : {}, relatedVolumes: same ? selection.relatedVolumes : [] }
      break
    }
    case 'providerSelected': {
      const same = raw.providerId === event.providerId
      patch = { providerId: event.providerId, resources: same ? selection.resources : [], vmMetadataByName: same ? raw.vmMetadataByName : {},
        relatedVolumes: same ? selection.relatedVolumes : [], auxiliaryNamesByVolume: same ? raw.auxiliaryNamesByVolume : {} }
      break
    }
    case 'resourceAdded':
      if (raw.resources.includes(event.name)) return { state: current, notifyDirty: false }
      patch = { resources: [...raw.resources, event.name] }; break
    case 'resourceRemoved':
      patch = { resources: raw.resources.filter(name => name !== event.name), ...(raw.resourceType === 'volume' ? { auxiliaryNamesByVolume: withoutAuxiliary(event.name) } : {}) }; break
    case 'relatedVolumeAdded':
      if (selection.relatedVolumes.includes(event.name)) return { state: current, notifyDirty: false }
      patch = { relatedVolumes: [...raw.relatedVolumes ?? [], event.name] }; break
    case 'relatedVolumeRemoved': {
      const key = getDiscoveryIdentity(raw)
      exclusions = { key, all: exclusions.key === key && exclusions.all, removed: [...(exclusions.key === key ? exclusions.removed : []), event.name] }
      patch = { relatedVolumes: (raw.relatedVolumes ?? []).filter(name => name !== event.name), auxiliaryNamesByVolume: withoutAuxiliary(event.name) }; break
    }
    case 'relatedSelectionCleared':
      exclusions = { key: getDiscoveryIdentity(raw), removed: [], all: true }
      patch = { relatedVolumes: [], auxiliaryNamesByVolume: {} }; break
    case 'auxiliaryChanged': patch = { auxiliaryNamesByVolume: { ...raw.auxiliaryNamesByVolume, [event.name]: event.value } }; break
    case 'consistencyGroupChanged': patch = { consistencyGroupId: event.value }; hasConsistencyOverride = true; break
    case 'policySelected': patch = { policySetId: event.policySetId }; break
    case 'orchestrationProviderSelected': patch = { orchestrationProviderId: event.providerId }; break
    case 'pushChanged': patch = { pushToOrchestrator: event.value }; break
  }
  return { state: { ...current, draft: { ...raw, ...patch }, hasConsistencyOverride, exclusions }, notifyDirty: true }
}
