import { useCallback, useEffect, useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGetVolumes } from '@/generated/query/storage-volumes/storage-volumes.gen'
import { flashSystemInventoryQuery, powerInventoryQuery, vdisksByVmQuery, vmwareInventoryQuery } from '@/features/discovery-inventory/resources/model/inventoryQueries'
import { resolveVmwareProviderFilter } from '@/features/discovery-inventory/resources/helpers/vmwareProviderFilter'
import { Alert } from '@/shared/components/alert/Alert'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { TruncatedText } from '@/shared/components/truncated-text/TruncatedText'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { useTranslation } from '@/hooks/useTranslation'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'
import { useGetPolicySets } from '@/generated/query/policy-sets/policy-sets.gen'
import { selectPolicySets } from '@/features/recovery-plans/policy-sets/model/selectPolicySets'
import { useRecoveryGroupRelatedVolumes } from '../hooks/useRecoveryGroupRelatedVolumes'
import { useRecoveryGroupTargetPools } from '../hooks/useRecoveryGroupTargetPools'
import { missingAutomaticPools } from '../helpers/recoveryGroupTargetPools'
import type { RecoveryGroup, RecoveryGroupDraft, RecoveryGroupVmMetadata } from '../model/recoveryGroupTypes'
import { calculateRecoveryGroupStepIndices } from '../utils/calculateRecoveryGroupStepIndices'
import { filterByPlatformProviderCredentialStatus } from '@/features/providers-connectors/providers/utils/credentialStatusChecks'
import { RecoveryGroupDetailsStep } from './RecoveryGroupDetailsStep'
import { RecoveryGroupOrchestrationStep } from './RecoveryGroupOrchestrationStep'
import { RecoveryGroupPolicySetStep } from './RecoveryGroupPolicySetStep'
import { RecoveryGroupProviderStep } from './RecoveryGroupProviderStep'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'
import { RecoveryGroupTypeStep } from './RecoveryGroupTypeStep'
import { RecoveryGroupTopologyStep } from './RecoveryGroupTopologyStep'
import { RecoveryGroupMetroMirrorFields } from './RecoveryGroupMetroMirrorFields'
import { useRecoveryGroupMetroMirrorRelationships } from '../hooks/useRecoveryGroupMetroMirrorRelationships'
import { initializeDraft, transitionDraft, resolveEffectiveDraft, getDraftReadiness, type DraftEvent } from '../model/recoveryGroupDraftLifecycle'

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
  const queryClient = useQueryClient()
  const auxiliaryHintId = useId()
  const providerQuery = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const allProviders = providerQuery.data ?? []
  const providers = initialData
    ? allProviders
    : allProviders.filter(provider => provider.role === 'source')
  const [step, setStep] = useState(1)
  const [lifecycle, setLifecycle] = useState(() => initializeDraft(initialData))
  const handleMetadataAvailable = useCallback((metadata: Record<string, RecoveryGroupVmMetadata>) => {
    setLifecycle(current => transitionDraft(current, { type: 'metadataAvailable', metadata }).state)
  }, [])
  const policySetQuery = useGetPolicySets({ query: { select: selectPolicySets } })
  const policySets = policySetQuery.data ?? []
  const platformProvidersQuery = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const eligiblePlatformProviders = filterByPlatformProviderCredentialStatus(platformProvidersQuery.data ?? [])
    .filter(provider => provider.type === 'AIRFLOW')
  const baseObservation = {
    editAuthority: initialData, providers: allProviders, providerStatus: providerQuery,
    eligibleOrchestrationProviderIds: eligiblePlatformProviders.map(provider => provider.id),
  }
  const request = resolveEffectiveDraft(lifecycle, baseObservation)
  // Until the provider list resolves the scope is unknown, so VM inventory waits for it.
  const selectedProvider = providers.find(provider => provider.id === request.draft.providerId)
  const selectedProviderScope = selectedProvider
    ? { vmPrefix: selectedProvider.vmPrefix ?? null, vmTags: selectedProvider.vmTags ?? [] }
    : undefined
  const hasRelatedStorageStep = request.hasRelatedStorageStep
  const { resourcesStepIndex, relatedStorageStepIndex, policySetStepIndex, orchestrationStepIndex, lastStep } = calculateRecoveryGroupStepIndices(hasRelatedStorageStep)
  const relatedVolumesDiscovery = useRecoveryGroupRelatedVolumes(
    request.relatedVolumeRequest.computeProviderId,
    request.relatedVolumeRequest.vmNames,
    request.relatedVolumeRequest.sourceId,
    hasRelatedStorageStep && step === relatedStorageStepIndex,
  )
  const discoveryDetail = extractBackendErrorDetail(relatedVolumesDiscovery.error)
  const discoveryReason = discoveryDetail && !/^[{[]/.test(discoveryDetail) ? discoveryDetail : undefined
  const relatedObservation = { ...baseObservation, related: { ...relatedVolumesDiscovery, identity: request.discoveryIdentity } }
  const selection = resolveEffectiveDraft(lifecycle, relatedObservation)
  const relationships = useRecoveryGroupMetroMirrorRelationships(
    selection.relationshipLookup.sourceId, selection.relationshipLookup.names, selection.relationshipLookup.enabled,
  )
  const observation = { ...relatedObservation, relationships: relationships.data }
  const resolution = resolveEffectiveDraft(lifecycle, observation)
  const { draft, selectedVolumes, metroExisting, metroManaged, prefill, allowLegacyLocal } = resolution
  const observationEvent = resolution.selectionObservation
  const poolSource = allProviders.find(provider => provider.id === draft.relatedVolumeProviderId)
  const targetPools = useRecoveryGroupTargetPools(poolSource?.partnerProviderId ?? undefined,
    step === 2 && metroManaged && resolution.topologyValid && !isInitialLoading)
  // Observe existing source inventory only; the advisory default check never fetches it.
  const sourceInventory = useGetVolumes(poolSource ? { provider_id: poolSource.id } : undefined, { query: { enabled: false } })
  useEffect(() => {
    if (!observationEvent) return
    let cancelled = false
    // Observe committed Discovery asynchronously; cancelled renders cannot publish cleanup.
    queueMicrotask(() => {
      if (!cancelled) setLifecycle(current => transitionDraft(current, observationEvent, {
        related: { ...relatedVolumesDiscovery, identity: observationEvent.identity },
      }).state)
    })
    return () => { cancelled = true }
  }, [observationEvent, relatedVolumesDiscovery])
  const readiness = getDraftReadiness(lifecycle, resolution, { ...observation, step, existingIds, isInitialLoading })
  const { detailsValid, topologyValid, typeValid, resourcesValid, storageValid, policySetValid,
    baseValid, downstreamValid, canContinue, canCreate, readyForPrefetch, storageProviderValid, pushedLock, readOnly } = readiness
  const { providerId: inventoryProviderId, workloadType, resources: selectedResourceNames, relatedVolumeProviderId } = request.selectionDraft
  const { prefix: inventoryPrefix, tag: inventoryTag } = resolveVmwareProviderFilter(selectedProviderScope)
  const inventoryScopeKnown = selectedProvider !== undefined

  useEffect(() => {
    if (step !== 4 || !readyForPrefetch || !inventoryProviderId) return
    switch (workloadType) {
      case 'vmware_virtual_machines':
        if (inventoryScopeKnown) {
          void queryClient.prefetchQuery(vmwareInventoryQuery({
            providerId: inventoryProviderId,
            ...(inventoryPrefix ? { namePrefix: inventoryPrefix } : {}),
            ...(inventoryTag ? { tag: inventoryTag } : {}),
          }))
        }
        break
      case 'ibm_power_virtual_machines':
        if (inventoryScopeKnown) void queryClient.prefetchQuery(powerInventoryQuery(inventoryProviderId))
        break
      case 'ibm_flashsystem':
        void queryClient.prefetchQuery(flashSystemInventoryQuery(inventoryProviderId))
        break
    }
  }, [queryClient, step, readyForPrefetch, inventoryProviderId, workloadType, inventoryScopeKnown, inventoryPrefix, inventoryTag])

  useEffect(() => {
    if (step !== resourcesStepIndex || !readyForPrefetch || !hasRelatedStorageStep
      || !inventoryProviderId || !relatedVolumeProviderId || !storageProviderValid || selectedResourceNames.length === 0) return
    void queryClient.prefetchQuery(flashSystemInventoryQuery(relatedVolumeProviderId))
    for (const name of new Set(selectedResourceNames)) {
      void queryClient.prefetchQuery(vdisksByVmQuery(name, inventoryProviderId))
    }
  }, [queryClient, step, resourcesStepIndex, readyForPrefetch, hasRelatedStorageStep, inventoryProviderId, relatedVolumeProviderId, storageProviderValid, selectedResourceNames])

  const send = (event: DraftEvent) => {
    const context = observation
    if (transitionDraft(lifecycle, event, context).notifyDirty) onDirtyChange?.(true)
    setLifecycle(current => transitionDraft(current, event, context).state)
  }
  const showAuxiliaryHint = hasRelatedStorageStep && step === relatedStorageStepIndex && metroExisting && !storageValid
  const managedAuxiliaryNames = metroManaged ? draft.auxiliaryNamesByVolume : {}
  const renderVolumeContent = metroManaged ? (Object.keys(managedAuxiliaryNames).length > 0 ? (name: string) => (
    <div className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] items-center gap-3">
      <TruncatedText text={name} />
      <span className="min-w-0 text-xs text-text-muted" aria-label={t('pages.recoveryGroupBuilder.topology.auxiliary') + ': ' + name}>
        <TruncatedText text={managedAuxiliaryNames[name] ?? ''} />
      </span>
    </div>
  ) : undefined) : metroExisting ? (name: string) => (
    <div className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] items-center gap-3">
      <TruncatedText text={name} />
      <Input size="sm" aria-label={t('pages.recoveryGroupBuilder.topology.auxiliary') + ': ' + name}
        aria-describedby={showAuxiliaryHint ? auxiliaryHintId : undefined}
        placeholder={t('pages.recoveryGroupBuilder.topology.auxiliary')}
        value={draft.auxiliaryNamesByVolume[name] ?? ''}
        invalid={!draft.auxiliaryNamesByVolume[name]?.trim()}
        onChange={event => { send({ type: 'auxiliaryChanged', name, value: event.target.value }) }} />
    </div>
  ) : undefined

  const managedInfo = metroManaged && draft.consistencyGroupId.trim() ? (
    <p className="shrink-0 text-xs text-text-muted">
      {t('pages.recoveryGroupBuilder.topology.consistencyGroup')}: {draft.consistencyGroupId}
    </p>
  ) : null
  const metroFields = metroExisting ? <RecoveryGroupMetroMirrorFields
    missingNamesCount={selectedVolumes.filter(name => !draft.auxiliaryNamesByVolume[name]?.trim()).length}
    providerName={allProviders.find(provider => provider.id === draft.relatedVolumeProviderId)?.name}
    value={draft.consistencyGroupId}
    onChange={value => { send({ type: 'consistencyGroupChanged', value }) }}
    loading={relationships.isLoading} error={relationships.error instanceof Error ? relationships.error : null}
    onRetry={() => { void relationships.refetch() }} warning={relationships.data?.warning ?? ''}
    unresolvedCount={prefill.unresolvedVolumes.length}
    missingGroup={Boolean(relationships.data && !relationships.data.consistency_group_id?.trim())}
    mismatch={prefill.hasMismatch} /> : managedInfo

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
            {readOnly ? <Alert variant="warning" className="mb-4"
              title={t(pushedLock ? 'pages.recoveryGroupBuilder.lifecycleLock.pushed' : 'pages.recoveryGroupBuilder.lifecycleLock.managedProvisioned')} /> : null}
            <fieldset className="contents" disabled={readOnly}>
            {step === 1 ? (
              <RecoveryGroupDetailsStep
                id={draft.id}
                name={draft.name}
                description={draft.description}
                notificationEmail={draft.notificationEmail ?? ''}
                existingIds={existingIds}
                {...(initialData ? { currentId: initialData.id, disableId: true } : {})}
                onChange={values => { send({ type: 'detailsChanged', values }) }}
              />
            ) : null}
            {step === 2 ? <RecoveryGroupTopologyStep draft={draft} providers={allProviders} targetPools={targetPools}
              automaticMissingPools={!targetPools.isFetching && !targetPools.error ? missingAutomaticPools(sourceInventory.data, selectedVolumes, targetPools.data) : []}
              isLoading={providerQuery.isLoading || providerQuery.isFetching} error={providerQuery.error instanceof Error ? providerQuery.error : null}
              onRetry={() => { void providerQuery.refetch() }} onChange={send} allowLegacyLocal={allowLegacyLocal} isEditing={Boolean(initialData)} /> : null}
            {step === 3 ? (
              <RecoveryGroupTypeStep
                sourceCategory={draft.sourceCategory}
                selected={draft.workloadType}
                providers={providers}
                isLoadingProviders={providerQuery.isLoading}
                providerError={providerQuery.error instanceof Error ? providerQuery.error : null}
                onRetryProviders={() => { void providerQuery.refetch() }}
                readOnly={Boolean(initialData)}
                onCategoryChange={category => { send({ type: 'categoryChanged', category }) }}
                onSelect={(category, workload, resourceType) => { send({ type: 'workloadSelected', category, workload, resourceType }) }}
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
                  onSelect={providerId => { send({ type: 'providerSelected', providerId }) }}
                />
              ) : null
            ) : null}
            {step === resourcesStepIndex ? (
              <div className="flex min-h-80 min-w-0 flex-col gap-3 lg:h-full">
                {draft.resourceType === 'volume' ? metroFields : null}
                <div className="min-h-64 min-w-0 flex-1">
                  <RecoveryGroupResourcesStep
                    workloadType={draft.workloadType}
                    computeProviderType={selectedProvider?.type ?? null}
                    providerId={draft.providerId}
                    {...(selectedProviderScope ? { providerScope: selectedProviderScope } : {})}
                    resources={draft.resources}
                    renderItemContent={draft.resourceType === 'volume' ? renderVolumeContent : undefined}
                    onAdd={name => { send({ type: 'resourceAdded', name }) }}
                    onRemove={name => { send({ type: 'resourceRemoved', name }) }}
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
                {relatedVolumesDiscovery.error ? (
                  <FetchErrorAlert
                    title={t('pages.recoveryGroupBuilder.topology.discoveryError')}
                    description={[
                      t('pages.recoveryGroupBuilder.topology.discoveryErrorDescription'),
                      discoveryReason ? `${t('pages.recoveryGroupBuilder.topology.discoveryErrorReason')}: ${discoveryReason}` : null,
                    ].filter(Boolean).join('\n\n')}
                    className="shrink-0 [&_p]:whitespace-pre-line"
                    isRetrying={relatedVolumesDiscovery.isFetching ?? false}
                    onRetry={() => { relatedVolumesDiscovery.refetch?.() }}
                    retryLabel={t('pages.recoveryGroupBuilder.topology.discoveryRetry')}
                  />
                ) : null}
                {relatedVolumesDiscovery.isLoading ? <ListSkeleton rowCount={1} ariaLabel={t('pages.recoveryGroupBuilder.resources.volumes.loading')} /> : null}
                {metroFields}
                {draft.relatedVolumeProviderId ? (
                  <div className="flex min-h-64 min-w-0 flex-1 flex-col">
                    <RecoveryGroupResourcesStep
                      compact
                      onClear={() => { send({ type: 'relatedSelectionCleared' }) }}
                      workloadType="ibm_flashsystem"
                      providerId={draft.relatedVolumeProviderId}
                      resources={draft.relatedVolumes}
                      selectionHint={showAuxiliaryHint ? <p id={auxiliaryHintId} role="status" className="mt-1 text-xs text-text-secondary">{t('pages.recoveryGroupBuilder.topology.auxiliaryRequired')}</p> : undefined}
                      renderItemContent={renderVolumeContent}
                      onAdd={name => { send({ type: 'relatedVolumeAdded', name }) }}
                      onRemove={name => { send({ type: 'relatedVolumeRemoved', name }) }}
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
                onSelect={(policySetId) => { send({ type: 'policySelected', policySetId }) }}
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
                onPushToOrchestratorChange={value => { send({ type: 'pushChanged', value }) }}
                onProviderSelect={providerId => { send({ type: 'orchestrationProviderSelected', providerId }) }}
              />
            ) : null}
            </fieldset>
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
