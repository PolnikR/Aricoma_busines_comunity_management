import { useCallback, useId, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TruncatedText } from '@/shared/components/truncated-text/TruncatedText'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { isProgrammaticIdAvailable } from '@/shared/utils/programmaticId'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'
import { useGetPolicySets } from '@/generated/query/policy-sets/policy-sets.gen'
import { selectPolicySets } from '@/features/recovery-plans/policy-sets/model/selectPolicySets'
import { getRecoveryGroupResourceOption } from '../config/recoveryGroupResourceOptions'
import { useRecoveryGroupRelatedVolumes } from '../hooks/useRecoveryGroupRelatedVolumes'
import type { RecoveryGroup, RecoveryGroupDraft, RecoveryGroupVmMetadata } from '../model/recoveryGroupTypes'
import { calculateRecoveryGroupStepIndices } from '../utils/calculateRecoveryGroupStepIndices'
import { isCredentialOk, filterByPlatformProviderCredentialStatus } from '@/features/providers-connectors/providers/utils/credentialStatusChecks'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'
import { RecoveryGroupOrchestrationStep } from './RecoveryGroupOrchestrationStep'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'
import { RecoveryGroupProviderStep } from './RecoveryGroupProviderStep'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'
import { RecoveryGroupTopologyStep } from './RecoveryGroupTopologyStep'
import { RecoveryGroupMetroMirrorFields } from './RecoveryGroupMetroMirrorFields'
import { useRecoveryGroupMetroMirrorRelationships } from '../hooks/useRecoveryGroupMetroMirrorRelationships'
import { reconcileMetroMirrorPrefill } from '../utils/reconcileMetroMirrorPrefill'
import { getRecoveryGroupTopologyError } from '../utils/recoveryGroupTopology'

interface RecoveryGroupBuilderProps {
  onCreate: (draft: RecoveryGroupDraft) => void
  onCancel: () => void
  onDirtyChange?: (isDirty: boolean) => void
  initialData?: RecoveryGroup
  submitLabel?: string
  existingIds?: string[]
  isSaving?: boolean
  isInitialLoading?: boolean
}

const INITIAL_DRAFT: RecoveryGroupDraft = {
  id: '',
  name: '',
  description: '',
  sourceCategory: null,
  workloadType: null,
  resourceType: null,
  providerId: null,
  policySetId: null,
  resources: [],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  orchestrationProviderId: null,
  pushToOrchestrator: false,
  topology: null,
  metroMirrorMode: null,
  consistencyGroupId: '',
  auxiliaryNamesByVolume: {},
}

export function RecoveryGroupBuilder({
  onCreate,
  onCancel,
  onDirtyChange,
  initialData,
  submitLabel,
  existingIds = [],
  isSaving = false,
  isInitialLoading = false,
}: RecoveryGroupBuilderProps) {
  const { t } = useTranslation()
  const auxiliaryHintId = useId()
  const providerQuery = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const allProviders = providerQuery.data ?? []
  const providers = initialData
    ? allProviders
    : allProviders.filter(provider => provider.role === 'source')
  const [step, setStep] = useState(1)
  const [draftState, setDraft] = useState<RecoveryGroupDraft>(() => initialData
    ? {
        id: initialData.id,
        name: initialData.name,
        description: initialData.description,
        sourceCategory: initialData.sourceCategory,
        workloadType: initialData.workloadType,
        resourceType: initialData.resourceType,
        providerId: initialData.providerId,
        policySetId: initialData.policySetId,
        resources: [...initialData.resources],
        relatedVolumeProviderId: initialData.resourceType === 'volume' ? initialData.providerId : initialData.relatedVolumeProviderId ?? null,
        relatedVolumes: [...initialData.relatedVolumes],
        vmMetadataByName: initialData.vmMetadataByName,
        orchestrationProviderId: initialData.orchestrationProviderId ?? null,
        pushToOrchestrator: initialData.pushToOrchestrator ?? false,
        topology: initialData.topology ?? 'local',
        metroMirrorMode: initialData.metroMirrorMode ?? null,
        consistencyGroupId: initialData.consistencyGroupId ?? '',
        auxiliaryNamesByVolume: { ...initialData.auxiliaryNamesByVolume },
      }
    : INITIAL_DRAFT)
  const [hasConsistencyOverride, setHasConsistencyOverride] = useState(Boolean(initialData?.consistencyGroupId?.trim()))
  const updateDraft = (update: Partial<RecoveryGroupDraft>) => {
    setDraft(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }
  const handleMetadataAvailable = useCallback((metadata: Record<string, RecoveryGroupVmMetadata>) => {
    setDraft(current => ({
      ...current,
      vmMetadataByName: { ...current.vmMetadataByName, ...metadata },
    }))
  }, [])
  const idAvailable = isProgrammaticIdAvailable(
    draftState.id,
    existingIds,
    initialData?.id,
  )
  const detailsValid = Boolean(
    draftState.id
    && idAvailable
    && draftState.name.trim()
    && draftState.description.trim(),
  )
  const typeValid = Boolean(draftState.sourceCategory && draftState.workloadType && draftState.resourceType)
  const selectedOption = getRecoveryGroupResourceOption(draftState.workloadType)
  const providerValid = Boolean(
    draftState.providerId
    && selectedOption
    && (draftState.resourceType === 'volume' ? allProviders : providers).some(provider => (
      provider.id === draftState.providerId
      && provider.type === selectedOption.providerType
      && isCredentialOk(provider)
    )),
  )
  const policySetQuery = useGetPolicySets({ query: { select: selectPolicySets } })
  const policySets = policySetQuery.data ?? []
  const policySetValid = Boolean(draftState.policySetId)
  const platformProvidersQuery = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const eligiblePlatformProviders = filterByPlatformProviderCredentialStatus(platformProvidersQuery.data ?? [])
  const soleEligibleProviderId = eligiblePlatformProviders.length === 1
    ? (eligiblePlatformProviders[0]?.id ?? null)
    : null
  const orchestrationValid = Boolean(
    (draftState.orchestrationProviderId ?? soleEligibleProviderId)
    && eligiblePlatformProviders.some(provider => provider.id === (draftState.orchestrationProviderId ?? soleEligibleProviderId)),
  )
  const hasRelatedStorageStep = draftState.resourceType === 'vm'
  const {
    resourcesStepIndex,
    relatedStorageStepIndex,
    policySetStepIndex,
    orchestrationStepIndex,
    lastStep,
  } = calculateRecoveryGroupStepIndices(hasRelatedStorageStep)
  const relatedVolumesDiscovery = useRecoveryGroupRelatedVolumes(
    draftState.providerId,
    draftState.resources,
    draftState.relatedVolumeProviderId ?? null,
    hasRelatedStorageStep && step === relatedStorageStepIndex,
  )

  const discoveryKey = JSON.stringify([draftState.relatedVolumeProviderId, draftState.providerId, [...draftState.resources].sort()])
  const [discoveryExclusions, setDiscoveryExclusions] = useState<{ key: string; removed: string[]; all: boolean }>({ key: '', removed: [], all: false })
  const selectionDraft = useMemo(() => {
    const orchestrationProviderId = draftState.orchestrationProviderId ?? soleEligibleProviderId
    const exclusions = discoveryExclusions.key === discoveryKey ? discoveryExclusions : null
    const discovered = hasRelatedStorageStep
      && draftState.relatedVolumeProviderId
      && relatedVolumesDiscovery.flashcopyProviderId === draftState.relatedVolumeProviderId
      && !relatedVolumesDiscovery.error && !relatedVolumesDiscovery.isLoading && !exclusions?.all
      ? relatedVolumesDiscovery.discoveredVolumeNames.filter(name => !exclusions?.removed.includes(name)) : []
    return {
      ...draftState,
      orchestrationProviderId,
      relatedVolumes: [...new Set([...(draftState.relatedVolumes ?? []), ...discovered])],
    }
  }, [draftState, soleEligibleProviderId, discoveryKey, discoveryExclusions, hasRelatedStorageStep, relatedVolumesDiscovery])

  const selectedVolumes = selectionDraft.resourceType === 'volume' ? selectionDraft.resources : selectionDraft.relatedVolumes
  // Prune only after discovery settles, so temporary loading never deletes saved corrections.
  const selectionKey = JSON.stringify([...selectedVolumes].sort())
  const [previousSelectionKey, setPreviousSelectionKey] = useState<string | null>(null)
  const discoverySettled = !hasRelatedStorageStep || (relatedVolumesDiscovery.isResolved && !relatedVolumesDiscovery.isLoading && !relatedVolumesDiscovery.error)
  if (discoverySettled && previousSelectionKey !== selectionKey) {
    setPreviousSelectionKey(selectionKey)
    const activeNames = new Set(selectedVolumes)
    const overrides = draftState.auxiliaryNamesByVolume ?? {}
    if (Object.keys(overrides).some(name => !activeNames.has(name))) {
      setDraft({ ...draftState, auxiliaryNamesByVolume: Object.fromEntries(Object.entries(overrides).filter(([name]) => activeNames.has(name))) })
    }
  }

  const allowLegacyLocal = (initialData?.resourceType === 'vm'
    && (initialData.topology ?? 'local') === 'local'
    && !initialData.relatedVolumeProviderId && initialData.relatedVolumes.length === 0
    && !selectionDraft.relatedVolumeProviderId && selectionDraft.relatedVolumes.length === 0)
  const topologyValid = !providerQuery.isLoading && !providerQuery.isFetching && !providerQuery.error
    && initialData?.metroMirrorMode !== 'managed'
    && getRecoveryGroupTopologyError(selectionDraft, allProviders, allowLegacyLocal) === null
  const metroExisting = draftState.topology === 'metro_mirror' && draftState.metroMirrorMode === 'existing'
  const relationships = useRecoveryGroupMetroMirrorRelationships(
    draftState.relatedVolumeProviderId ?? null, selectedVolumes, metroExisting && topologyValid && discoverySettled,
  )
  const prefill = reconcileMetroMirrorPrefill(selectedVolumes, draftState.auxiliaryNamesByVolume ?? {},
    hasConsistencyOverride ? draftState.consistencyGroupId ?? '' : undefined, relationships.data)
  const draft = {
    ...selectionDraft,
    consistencyGroupId: metroExisting ? prefill.consistencyGroupId : '',
    auxiliaryNamesByVolume: metroExisting ? prefill.auxiliaryNamesByVolume : {},
  }
  const storageValid = draft.topology !== 'metro_mirror' || (selectedVolumes.length > 0 && Boolean(draft.consistencyGroupId.trim())
    && selectedVolumes.every(name => draft.auxiliaryNamesByVolume[name]?.trim()))
  const discoveryValid = !hasRelatedStorageStep || (!relatedVolumesDiscovery.isLoading && !relatedVolumesDiscovery.error)
  const baseValid = detailsValid && topologyValid && typeValid && providerValid
  const resourcesValid = draft.resources.length > 0 && (hasRelatedStorageStep || storageValid)
  const downstreamValid = baseValid && resourcesValid && storageValid && discoveryValid
  const changeSource = (update: Partial<RecoveryGroupDraft>) => {
    if (('topology' in update && update.topology !== draftState.topology)
      || ('relatedVolumeProviderId' in update && update.relatedVolumeProviderId !== draftState.relatedVolumeProviderId)) {
      setHasConsistencyOverride(false)
    }
    if ('relatedVolumeProviderId' in update && update.relatedVolumeProviderId !== draft.relatedVolumeProviderId) {
      setDiscoveryExclusions({ key: '', removed: [], all: false })
      updateDraft({ ...update, relatedVolumes: [], auxiliaryNamesByVolume: {}, consistencyGroupId: '',
        ...(draft.resourceType === 'volume' ? { providerId: update.relatedVolumeProviderId ?? null, resources: [] } : {}) })
    } else updateDraft(update)
  }
  const removeAuxiliary = (name: string) => Object.fromEntries(Object.entries(draftState.auxiliaryNamesByVolume ?? {}).filter(([key]) => key !== name))
  const showAuxiliaryHint = hasRelatedStorageStep && step === relatedStorageStepIndex && draft.topology === 'metro_mirror' && !storageValid
  const renderVolumeContent = draft.topology === 'metro_mirror' ? (name: string) => (
    <div className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] items-center gap-3">
      <TruncatedText text={name} />
      <Input size="sm" aria-label={t('pages.recoveryGroupBuilder.topology.auxiliary') + ': ' + name}
        aria-describedby={showAuxiliaryHint ? auxiliaryHintId : undefined}
        placeholder={t('pages.recoveryGroupBuilder.topology.auxiliary')}
        value={draft.auxiliaryNamesByVolume[name] ?? ''}
        invalid={!draft.auxiliaryNamesByVolume[name]?.trim()}
        onChange={event => { updateDraft({ auxiliaryNamesByVolume: { ...draftState.auxiliaryNamesByVolume, [name]: event.target.value } }) }} />
    </div>
  ) : undefined

  const metroFields = metroExisting ? <RecoveryGroupMetroMirrorFields
    missingNamesCount={selectedVolumes.filter(name => !draft.auxiliaryNamesByVolume[name]?.trim()).length}
    providerName={allProviders.find(provider => provider.id === draft.relatedVolumeProviderId)?.name}
    value={draft.consistencyGroupId}
    onChange={value => { setHasConsistencyOverride(true); updateDraft({ consistencyGroupId: value }) }}
    loading={relationships.isLoading} error={relationships.error instanceof Error ? relationships.error : null}
    onRetry={() => { void relationships.refetch() }} warning={relationships.data?.warning ?? ''}
    unresolvedCount={prefill.unresolvedVolumes.length}
    missingGroup={Boolean(relationships.data && !relationships.data.consistency_group_id?.trim())}
    mismatch={prefill.hasMismatch} /> : null

  const steps = [
    { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
    { id: 'topology', label: t('pages.recoveryGroupBuilder.steps.topology'), disabled: !detailsValid },
    { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type'), disabled: !detailsValid || !topologyValid },
    { id: 'provider', label: t('pages.recoveryGroupBuilder.steps.provider'), disabled: !detailsValid || !topologyValid || !typeValid },
    { id: 'resources', label: t('pages.recoveryGroupBuilder.steps.resources'), disabled: !baseValid },
    ...(hasRelatedStorageStep ? [{ id: 'related-storage', label: t('pages.recoveryGroupBuilder.steps.relatedStorage'), disabled: !baseValid || !resourcesValid }] : []),
    { id: 'policy-set', label: t('pages.recoveryGroupBuilder.steps.policySet'), disabled: !downstreamValid },
    { id: 'orchestration', label: t('pages.recoveryGroupBuilder.steps.orchestration'), disabled: !downstreamValid || !policySetValid },
  ]
  const canContinue = step === 1 ? detailsValid
    : step === 2 ? detailsValid && topologyValid
      : step === 3 ? detailsValid && topologyValid && typeValid
        : step === 4 ? baseValid
          : step === resourcesStepIndex ? baseValid && resourcesValid
            : step === policySetStepIndex ? downstreamValid && policySetValid
              : downstreamValid
  const canCreate = downstreamValid && policySetValid && orchestrationValid

  return (
    <fieldset className="contents" disabled={isInitialLoading} aria-busy={isInitialLoading}>
    <div className="flex min-h-0 min-w-0 flex-1 p-2 sm:p-4">
      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="custom-scrollbar min-h-0 min-w-0 overflow-y-auto border-b border-border bg-surface-subtle lg:border-b-0 lg:border-r">
          <WizardSteps
            items={steps}
            currentStep={step}
            ariaLabel={t('pages.recoveryGroupBuilder.steps.ariaLabel')}
            onStepChange={setStep}
          />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-5">
            {step === 1 ? (
              <RecoveryGroupDetailsStep
                id={draft.id}
                name={draft.name}
                description={draft.description}
                existingIds={existingIds}
                {...(initialData ? { currentId: initialData.id, disableId: true } : {})}
                onChange={updateDraft}
              />
            ) : null}
            {step === 2 ? <RecoveryGroupTopologyStep draft={draft} providers={allProviders}
              isLoading={providerQuery.isLoading || providerQuery.isFetching} error={providerQuery.error instanceof Error ? providerQuery.error : null}
              onRetry={() => { void providerQuery.refetch() }} onChange={changeSource} allowLegacyLocal={allowLegacyLocal} /> : null}
            {step === 3 ? (
              <RecoveryGroupTypeStep
                sourceCategory={draft.sourceCategory}
                selected={draft.workloadType}
                providers={providers}
                isLoadingProviders={providerQuery.isLoading}
                providerError={providerQuery.error instanceof Error ? providerQuery.error : null}
                onRetryProviders={() => { void providerQuery.refetch() }}
                readOnly={Boolean(initialData)}
                onCategoryChange={(sourceCategory) => {
                  updateDraft({
                    sourceCategory,
                    workloadType: null,
                    resourceType: null,
                    providerId: null,
                    resources: [],
                    vmMetadataByName: {},
                    auxiliaryNamesByVolume: {},
                    relatedVolumes: [],
                  })
                }}
                onSelect={(sourceCategory, workloadType, resourceType) => {
                  updateDraft({
                    sourceCategory,
                    workloadType,
                    resourceType,
                    providerId: resourceType === 'volume' ? draft.relatedVolumeProviderId ?? null : draft.workloadType === workloadType ? draft.providerId : null,
                    resources: draft.workloadType === workloadType ? draft.resources : [],
                    vmMetadataByName: draft.workloadType === workloadType
                      ? draft.vmMetadataByName
                      : {},
                    auxiliaryNamesByVolume: draft.workloadType === workloadType ? draftState.auxiliaryNamesByVolume : {},
                    relatedVolumes: draft.workloadType === workloadType
                      ? draft.relatedVolumes
                      : [],
                  })
                }}
              />
            ) : null}
            {step === 4 ? (
              draft.resourceType === 'volume' ? (
                <Field label={t('pages.recoveryGroupBuilder.topology.source')} htmlFor="volume-source-readonly">
                  <Input id="volume-source-readonly" readOnly value={allProviders.find(provider => provider.id === draft.relatedVolumeProviderId)?.name ?? ''} />
                </Field>
              ) : draft.workloadType ? (
                <RecoveryGroupProviderStep
                  workloadType={draft.workloadType}
                  providers={providers}
                  selectedProviderId={draft.providerId}
                  onSelect={(providerId) => {
                    updateDraft({
                      providerId,
                      resources: draft.providerId === providerId ? draft.resources : [],
                      vmMetadataByName: draft.providerId === providerId ? draft.vmMetadataByName : {},
                      relatedVolumes: draft.providerId === providerId ? draft.relatedVolumes : [],
                      auxiliaryNamesByVolume: draft.providerId === providerId ? draftState.auxiliaryNamesByVolume : {},
                    })
                  }}
                />
              ) : null
            ) : null}
            {step === resourcesStepIndex ? (
              <div className="flex min-h-80 min-w-0 flex-col gap-3 lg:h-full">
                {draft.resourceType === 'volume' ? metroFields : null}
                <div className="min-h-64 min-w-0 flex-1">
                  <RecoveryGroupResourcesStep
                    workloadType={draft.workloadType}
                    providerId={draft.providerId}
                    resources={draft.resources}
                    renderItemContent={draft.resourceType === 'volume' ? renderVolumeContent : undefined}
                    onAdd={resource => {
                      if (!draft.resources.includes(resource)) {
                        updateDraft({ resources: [...draft.resources, resource] })
                      }
                    }}
                    onRemove={resource => {
                      updateDraft({
                        resources: draft.resources.filter(item => item !== resource),
                        ...(draft.resourceType === 'volume' ? { auxiliaryNamesByVolume: removeAuxiliary(resource) } : {}),
                      })
                    }}
                    onMetadataAvailable={handleMetadataAvailable}
                  />
                </div>
              </div>
            ) : null}
            {step === relatedStorageStepIndex && hasRelatedStorageStep ? (
              <div className="flex min-h-80 min-w-0 flex-col gap-3 lg:h-full">
                <div className="shrink-0">
                  <h2 className="min-w-0 text-base font-semibold text-text-primary">
                    {t('pages.recoveryGroupBuilder.relatedStorage.title')}
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">
                    {t('pages.recoveryGroupBuilder.relatedStorage.description')}
                  </p>
                </div>
                {relatedVolumesDiscovery.error ? <FetchErrorAlert title={t('pages.recoveryGroupBuilder.topology.discoveryError')}
                  onRetry={() => { relatedVolumesDiscovery.refetch?.() }} retryLabel={t('buttons.retry')} /> : null}
                {relatedVolumesDiscovery.isLoading ? <ListSkeleton rowCount={1} ariaLabel={t('pages.recoveryGroupBuilder.resources.volumes.loading')} /> : null}
                {metroFields}
                {draft.relatedVolumeProviderId ? (
                  <div className="flex min-h-64 min-w-0 flex-1 flex-col">
                    <RecoveryGroupResourcesStep
                      compact
                      onClear={() => {
                        updateDraft({ relatedVolumes: [], auxiliaryNamesByVolume: {} })
                        setDiscoveryExclusions({ key: discoveryKey, removed: [], all: true })
                      }}
                      workloadType="ibm_flashsystem"
                      providerId={draft.relatedVolumeProviderId}
                      resources={draft.relatedVolumes}
                      selectionHint={showAuxiliaryHint ? <p id={auxiliaryHintId} role="status" className="mt-1 text-xs text-text-secondary">{t('pages.recoveryGroupBuilder.topology.auxiliaryRequired')}</p> : undefined}
                      renderItemContent={renderVolumeContent}
                      onAdd={resource => {
                        const relatedVolumes = draft.relatedVolumes
                        if (!relatedVolumes.includes(resource)) {
                          updateDraft({ relatedVolumes: [...(draftState.relatedVolumes ?? []), resource] })
                        }
                      }}
                      onRemove={resource => {
                        setDiscoveryExclusions(current => ({ key: discoveryKey, all: current.key === discoveryKey && current.all,
                          removed: [...(current.key === discoveryKey ? current.removed : []), resource] }))
                        updateDraft({
                          relatedVolumes: (draftState.relatedVolumes ?? []).filter(item => item !== resource),
                          auxiliaryNamesByVolume: removeAuxiliary(resource),
                        })
                      }}
                    />
                  </div>
                ) : (
                  <EmptyState
                    title={t('pages.recoveryGroupBuilder.relatedStorage.noProvider.title')}
                    description={t('pages.recoveryGroupBuilder.relatedStorage.noProvider.description')}
                  />
                )}
              </div>
            ) : null}
            {step === policySetStepIndex ? (
              <RecoveryGroupPolicySetStep
                policySets={policySets}
                isLoading={policySetQuery.isLoading}
                selectedPolicySetId={draft.policySetId}
                onSelect={(policySetId) => { updateDraft({ policySetId }) }}
              />
            ) : null}
            {step === orchestrationStepIndex ? (
              <RecoveryGroupOrchestrationStep
                platformProviders={eligiblePlatformProviders}
                isLoading={platformProvidersQuery.isLoading}
                error={platformProvidersQuery.error instanceof Error ? platformProvidersQuery.error : null}
                onRetry={() => { void platformProvidersQuery.refetch() }}
                pushToOrchestrator={draft.pushToOrchestrator}
                selectedProviderId={draft.orchestrationProviderId}
                onPushToOrchestratorChange={value => { updateDraft({ pushToOrchestrator: value }) }}
                onProviderSelect={providerId => { updateDraft({ orchestrationProviderId: providerId }) }}
              />
            ) : null}
          </div>
          <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-subtle px-3 py-2 sm:px-4 lg:static">
            <Button size="sm" variant="ghost" onClick={onCancel}>{t('buttons.cancel')}</Button>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={step === 1}
                onClick={() => { setStep(current => Math.max(1, current - 1)) }}
              >
                {t('buttons.back')}
              </Button>
              {step < lastStep ? (
                <Button
                  size="sm"
                  disabled={!canContinue}
                  onClick={() => { setStep(current => Math.min(lastStep, current + 1)) }}
                >
                  {t('buttons.next')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={!canCreate || isSaving}
                  startIcon={isSaving ? <Spinner /> : undefined}
                  onClick={() => { if (canCreate) onCreate(draft) }}
                >
                  {isSaving ? t('messages.saving') : (submitLabel ?? t('pages.recoveryGroupBuilder.createButton'))}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </fieldset>
  )
}
