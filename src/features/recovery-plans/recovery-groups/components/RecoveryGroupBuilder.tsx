import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { isProgrammaticIdAvailable } from '@/shared/utils/programmaticId'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
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

interface RecoveryGroupBuilderProps {
  onCreate: (draft: RecoveryGroupDraft) => void
  onCancel: () => void
  onDirtyChange?: (isDirty: boolean) => void
  initialData?: RecoveryGroup
  submitLabel?: string
  existingIds?: string[]
  isSaving?: boolean
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
}

export function RecoveryGroupBuilder({
  onCreate,
  onCancel,
  onDirtyChange,
  initialData,
  submitLabel,
  existingIds = [],
  isSaving = false,
}: RecoveryGroupBuilderProps) {
  const { t } = useTranslation()
  const providerQuery = useProviders()
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
        relatedVolumeProviderId: initialData.relatedVolumeProviderId ?? null,
        relatedVolumes: [...initialData.relatedVolumes],
        vmMetadataByName: initialData.vmMetadataByName,
        orchestrationProviderId: initialData.orchestrationProviderId ?? null,
        pushToOrchestrator: initialData.pushToOrchestrator ?? false,
      }
    : INITIAL_DRAFT)
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
    && providers.some(provider => (
      provider.id === draftState.providerId
      && provider.type === selectedOption.providerType
      && isCredentialOk(provider)
    )),
  )
  const policySetQuery = usePolicySets()
  const policySets = policySetQuery.data ?? []
  const policySetValid = Boolean(draftState.policySetId)
  const platformProvidersQuery = usePlatformProviders()
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
    providers,
    hasRelatedStorageStep && step === relatedStorageStepIndex,
  )

  const discoveryKey = hasRelatedStorageStep
    && relatedVolumesDiscovery.flashcopyProviderId
    ? `${relatedVolumesDiscovery.flashcopyProviderId}|${relatedVolumesDiscovery.discoveredVolumeNames.join(',')}`
    : null
  const [hiddenDiscoveryKey, setHiddenDiscoveryKey] = useState<string | null>(null)
  const draft = useMemo(() => {
    const orchestrationProviderId = draftState.orchestrationProviderId ?? soleEligibleProviderId
    const shouldApplyDiscovery = Boolean(discoveryKey && discoveryKey !== hiddenDiscoveryKey)
    if (!shouldApplyDiscovery || !relatedVolumesDiscovery.flashcopyProviderId) {
      return orchestrationProviderId === draftState.orchestrationProviderId
        ? draftState
        : { ...draftState, orchestrationProviderId }
    }

    const currentVolumes = draftState.relatedVolumes ?? []
    const relatedVolumes = relatedVolumesDiscovery.discoveredVolumeNames.reduce<string[]>(
      (volumes, name) => (volumes.includes(name) ? volumes : [...volumes, name]),
      currentVolumes,
    )

    return {
      ...draftState,
      orchestrationProviderId,
      relatedVolumeProviderId: relatedVolumesDiscovery.flashcopyProviderId,
      relatedVolumes,
    }
  }, [discoveryKey, draftState, hiddenDiscoveryKey, relatedVolumesDiscovery.discoveredVolumeNames, relatedVolumesDiscovery.flashcopyProviderId, soleEligibleProviderId])

  const steps = [
    { id: 'details', label: t('pages.recoveryGroupBuilder.steps.details') },
    { id: 'type', label: t('pages.recoveryGroupBuilder.steps.type'), disabled: !detailsValid },
    {
      id: 'provider',
      label: t('pages.recoveryGroupBuilder.steps.provider'),
      disabled: !detailsValid || !typeValid,
    },
    {
      id: 'resources',
      label: t('pages.recoveryGroupBuilder.steps.resources'),
      disabled: !detailsValid || !typeValid || !providerValid,
    },
    ...(hasRelatedStorageStep ? [{
      id: 'related-storage',
      label: t('pages.recoveryGroupBuilder.steps.relatedStorage'),
      disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0,
    }] : []),
    {
      id: 'policy-set',
      label: t('pages.recoveryGroupBuilder.steps.policySet'),
      disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0,
    },
    {
      id: 'orchestration',
      label: t('pages.recoveryGroupBuilder.steps.orchestration'),
      disabled: !detailsValid || !typeValid || !providerValid || draft.resources.length === 0 || !policySetValid,
    },
  ]

  const canContinue = step === 1
    ? detailsValid
    : step === 2
      ? typeValid
      : step === 3
        ? providerValid
        : step === policySetStepIndex
          ? policySetValid
          : draft.resources.length > 0
  const canCreate = Boolean(
    draft.name.trim()
    && draft.id
    && idAvailable
    && draft.description.trim()
    && draft.sourceCategory
    && draft.workloadType
    && draft.resourceType
    && providerValid
    && draft.resources.length > 0
    && policySetValid
    && orchestrationValid,
  )

  return (
    <div className="flex min-h-0 flex-1 p-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="custom-scrollbar min-h-0 overflow-y-auto border-b border-border bg-surface-subtle lg:border-b-0 lg:border-r">
          <WizardSteps
            items={steps}
            currentStep={step}
            ariaLabel={t('pages.recoveryGroupBuilder.steps.ariaLabel')}
            onStepChange={setStep}
          />
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className={`custom-scrollbar min-h-0 flex-1 p-5 sm:p-6 ${
            step === resourcesStepIndex || step === relatedStorageStepIndex || step === policySetStepIndex ? 'overflow-hidden' : 'overflow-y-auto'
          }`}>
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
            {step === 2 ? (
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
                    relatedVolumeProviderId: null,
                    relatedVolumes: [],
                  })
                }}
                onSelect={(sourceCategory, workloadType, resourceType) => {
                  updateDraft({
                    sourceCategory,
                    workloadType,
                    resourceType,
                    providerId: draft.workloadType === workloadType ? draft.providerId : null,
                    resources: draft.workloadType === workloadType ? draft.resources : [],
                    vmMetadataByName: draft.workloadType === workloadType
                      ? draft.vmMetadataByName
                      : {},
                    relatedVolumeProviderId: draft.workloadType === workloadType
                      ? (draft.relatedVolumeProviderId ?? null)
                      : null,
                    relatedVolumes: draft.workloadType === workloadType
                      ? (draft.relatedVolumes ?? [])
                      : [],
                  })
                }}
              />
            ) : null}
            {step === 3 ? (
              draft.workloadType ? (
                <RecoveryGroupProviderStep
                  workloadType={draft.workloadType}
                  providers={providers}
                  selectedProviderId={draft.providerId}
                  onSelect={(providerId) => {
                    updateDraft({
                      providerId,
                      resources: draft.providerId === providerId ? draft.resources : [],
                      vmMetadataByName: draft.providerId === providerId ? draft.vmMetadataByName : {},
                    })
                  }}
                />
              ) : null
            ) : null}
            {step === resourcesStepIndex ? (
              <RecoveryGroupResourcesStep
                workloadType={draft.workloadType}
                providerId={draft.providerId}
                resources={draft.resources}
                onAdd={resource => {
                  if (!draft.resources.includes(resource)) {
                    updateDraft({ resources: [...draft.resources, resource] })
                  }
                }}
                onRemove={resource => {
                  updateDraft({ resources: draft.resources.filter(item => item !== resource) })
                }}
                onMetadataAvailable={handleMetadataAvailable}
              />
            ) : null}
            {step === relatedStorageStepIndex && hasRelatedStorageStep ? (
              <div className="flex h-full min-h-0 flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">
                      {t('pages.recoveryGroupBuilder.relatedStorage.title')}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      {t('pages.recoveryGroupBuilder.relatedStorage.description')}
                    </p>
                  </div>
                  {(draft.relatedVolumes ?? []).length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateDraft({ relatedVolumeProviderId: null, relatedVolumes: [] })
                        setHiddenDiscoveryKey(discoveryKey)
                      }}
                    >
                      {t('pages.recoveryGroupBuilder.relatedStorage.clear')}
                    </Button>
                  ) : null}
                </div>
                {relatedVolumesDiscovery.flashcopyProviderId ? (
                  <div className="min-h-0 flex-1">
                    <RecoveryGroupResourcesStep
                      workloadType="ibm_flashsystem"
                      providerId={relatedVolumesDiscovery.flashcopyProviderId}
                      resources={draft.relatedVolumes ?? []}
                      onAdd={resource => {
                        const relatedVolumes = draft.relatedVolumes ?? []
                        if (!relatedVolumes.includes(resource)) {
                          updateDraft({ relatedVolumes: [...relatedVolumes, resource] })
                        }
                      }}
                      onRemove={resource => {
                        updateDraft({
                          relatedVolumes: (draft.relatedVolumes ?? []).filter(item => item !== resource),
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
          <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onCancel}>{t('buttons.cancel')}</Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={step === 1}
                onClick={() => { setStep(current => Math.max(1, current - 1)) }}
              >
                {t('buttons.back')}
              </Button>
              {step < lastStep ? (
                <Button
                  disabled={!canContinue}
                  onClick={() => { setStep(current => Math.min(lastStep, current + 1)) }}
                >
                  {t('buttons.next')}
                </Button>
              ) : (
                <Button
                  disabled={!canCreate || isSaving}
                  startIcon={isSaving ? <Spinner /> : undefined}
                  onClick={() => { onCreate(draft) }}
                >
                  {isSaving ? t('messages.saving') : (submitLabel ?? t('pages.recoveryGroupBuilder.createButton'))}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
