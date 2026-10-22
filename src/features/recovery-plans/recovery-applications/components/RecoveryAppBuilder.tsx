import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Select } from '@/shared/components/form/FormControls'
import { PolicySetPicker } from '@/shared/components/policy-set-picker/PolicySetPicker'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { selectPlatformProviders } from '@/features/platform-administration/platform-providers/model/selectPlatformProviders'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { useGetPolicySets } from '@/generated/query/policy-sets/policy-sets.gen'
import { selectPolicySets } from '@/features/recovery-plans/policy-sets/model/selectPolicySets'
import { useRecoveryGroups } from '../../recovery-groups/hooks/useRecoveryGroups'
import { isRecoveryGroupCompatible, isRecoveryGroupEligible } from '../utils/recoveryGroupPlatform'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { AppMetadataForm } from './AppMetadataForm'
import { TierCanvas } from './TierCanvas'
import { cloneTier } from '../utils/recoveryApplicationFormMapper'
import { getEligiblePlatformProviders, getEligibleSourceProviders, getEligibleTargetProviders } from '../utils/eligibleProviders'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from '../utils/recoveryApplicationFileName'
import { storedProvidersProblem, validateRecoveryApplication } from '../utils/validateRecoveryApplication'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  onCancel?: () => void
  onDirtyChange?: (isDirty: boolean) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
  disableFileName?: boolean
  isInitialLoading?: boolean
  // The app is deployed to Airflow: saving it without a push would make the
  // backend record pushed=false while its DAG stays deployed, so delete would
  // no longer roll it back. Keep the push on until the backend preserves it.
  lockPushToOrchestrator?: boolean
  // A saved application keeps its platform and providers (see LockedProviders).
  lockedProviders?: LockedProviders | null
}

const DEFAULT_TIERS: Record<string, DraftRecoveryTier> = {
  tier_id: { order: 1, description: 'tier_description' },
}

function createInitialFormState(initialData?: RecoveryApplicationFormState): RecoveryApplicationFormState {
  if (initialData) {
    return {
      ...initialData,
      tiers: new Map(
        Array.from(initialData.tiers, ([id, tier]): [string, DraftRecoveryTier] => [id, cloneTier(tier)]),
      ),
    }
  }

  return {
    fileName: '',
    policySetId: '',
    pushToOrchestrator: false,
    name: '',
    description: '',
    environment: 'dev',
    platform: '',
    orchestrationProviderId: '',
    targetProviderId: '',
    notificationEmail: null,
    tiers: new Map(
      Object.entries(DEFAULT_TIERS).map(
        ([id, tier]): [string, DraftRecoveryTier] => [id, cloneTier(tier)],
      ),
    ),
  }
}

export function RecoveryAppBuilder({
  onSave,
  onCancel,
  onDirtyChange,
  isSaving = false,
  initialData,
  disableFileName = false,
  isInitialLoading = false,
  lockPushToOrchestrator = false,
  lockedProviders = null,
}: RecoveryAppBuilderProps) {
  const { t } = useTranslation()
  const isFormDisabled = isInitialLoading || isSaving
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => ({
      ...createInitialFormState(initialData),
      ...(lockPushToOrchestrator ? { pushToOrchestrator: true } : {}),
    }),
  )

  const providersQuery = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const platformProvidersQuery = useGetPlatformProviders({ type: 'all' }, { query: { select: selectPlatformProviders } })
  const policySetsQuery = useGetPolicySets({ query: { select: selectPolicySets } })
  const {
    groups,
    isLoading: areGroupsLoading,
    isFetching: areGroupsFetching,
    error: groupsError,
    refresh: refreshGroups,
  } = useRecoveryGroups()

  const eligibleSourceProviders = useMemo(
    () => getEligibleSourceProviders(providersQuery.data ?? []),
    [providersQuery.data],
  )
  const eligiblePlatformProviders = useMemo(
    () => getEligiblePlatformProviders(platformProvidersQuery.data ?? []),
    [platformProvidersQuery.data],
  )
  // The platform is the selected source provider's type (or the stored one of a
  // saved application, whose provider may be gone); without one no group fits.
  const platform = lockedProviders?.platform
    ?? providersQuery.data?.find(provider => provider.id === formState.platform)?.type
  const compatibleGroups = useMemo(
    () => groups.filter(group => isRecoveryGroupCompatible(group, platform)),
    [groups, platform],
  )
  const availableGroups = useMemo(
    () => compatibleGroups.filter(group => isRecoveryGroupEligible(group, platform)),
    [compatibleGroups, platform],
  )
  const groupLabels = useMemo(
    () => Object.fromEntries(availableGroups.map(group => [group.id, group.name])),
    [availableGroups],
  )
  const recoveryGroupVmOptions = useMemo(
    () => Object.fromEntries(compatibleGroups.map(group => [group.id, group.resources])),
    [compatibleGroups],
  )
  const groupsErrorDescription = resolveUserFacingErrorMessage(groupsError, '')
  const displayedGroupsError = groupsError ? new Error(groupsErrorDescription) : null
  const policySetsErrorDescription = resolveUserFacingErrorMessage(policySetsQuery.error, '')
  const platformProvidersErrorDescription = resolveUserFacingErrorMessage(platformProvidersQuery.error, '')
  const tierCanvasTiers = useMemo(
    () => Object.fromEntries(formState.tiers),
    [formState.tiers],
  )
  const sidebarItems = useMemo(
    () => availableGroups.map(group => group.id),
    [availableGroups],
  )

  const updateFormState = useCallback((update: Partial<RecoveryApplicationFormState>) => {
    if (isFormDisabled) return
    setFormState(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  // Assigned groups belong to the current source platform, so a source change
  // asks first and then detaches them from every tier (the tiers stay).
  const [pendingSourceChange, setPendingSourceChange] = useState<Partial<RecoveryApplicationFormState> | null>(null)
  const handleMetadataChange = useCallback((update: Partial<RecoveryApplicationFormState>) => {
    if (isFormDisabled) return
    // Locked providers ignore any change, not only through the disabled selects.
    const metadata = lockedProviders
      ? Object.fromEntries(Object.entries(update).filter(([key]) => key !== 'platform' && key !== 'targetProviderId'))
      : update
    const changesSource = metadata.platform !== undefined && metadata.platform !== formState.platform
    const hasAssignedGroups = Array.from(formState.tiers.values()).some(tier => Boolean(tier.recovery_group))
    if (changesSource && hasAssignedGroups) {
      setPendingSourceChange(metadata)
      return
    }
    updateFormState(metadata)
  }, [formState.platform, formState.tiers, isFormDisabled, lockedProviders, updateFormState])
  const confirmSourceChange = () => {
    if (isFormDisabled || !pendingSourceChange) return
    setFormState(prev => ({
      ...prev,
      ...pendingSourceChange,
      tiers: new Map(Array.from(prev.tiers, ([id, tier]): [string, DraftRecoveryTier] => [id, { order: tier.order, description: tier.description }])),
    }))
    setPendingSourceChange(null)
    onDirtyChange?.(true)
  }

  const handleRecoveryGroupAdded = useCallback((tierId: string, groupId: string) => {
    if (isFormDisabled) return
    const selectedGroup = availableGroups.find(group => group.id === groupId)
    if (!selectedGroup) return

    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (!tier) return prev

      newTiers.set(tierId, {
        ...tier,
        recovery_group: {
          id: selectedGroup.id,
          name: selectedGroup.name,
          description: selectedGroup.description,
          vms: selectedGroup.resources.map((name, index) => ({
            name,
            order: index + 1,
            ...selectedGroup.vmMetadataByName?.[name],
          })),
        },
      })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [availableGroups, isFormDisabled, onDirtyChange])

  const handleRecoveryGroupRemoved = useCallback((tierId: string) => {
    if (isFormDisabled) return
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, { order: tier.order, description: tier.description })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  const handleRecoveryVmSelectionChange = useCallback((tierId: string, vmName: string, selected: boolean) => {
    if (isFormDisabled) return
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const alreadySelected = tier.recovery_group.vms.some(vm => vm.name === vmName)
      if (alreadySelected === selected) return prev

      const selectedGroup = compatibleGroups.find(group => group.id === tier.recovery_group?.id)
      const nextVms = selected
        ? [...tier.recovery_group.vms, { name: vmName, ...selectedGroup?.vmMetadataByName?.[vmName] }]
        : tier.recovery_group.vms.filter(vm => vm.name !== vmName)

      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, {
        ...tier,
        recovery_group: {
          ...tier.recovery_group,
          vms: nextVms.map((vm, index) => ({ ...vm, order: index + 1 })),
        },
      })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [compatibleGroups, isFormDisabled, onDirtyChange])

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: { tierDescription: string }) => {
    if (isFormDisabled) return
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const oldTier = newTiers.get(tierId)
      if (!oldTier) return prev
      if (newTierId !== tierId) newTiers.delete(tierId)
      newTiers.set(newTierId, { ...oldTier, description: updates.tierDescription })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  const handleTierAdd = useCallback((tierId: string, tier: DraftRecoveryTier) => {
    if (isFormDisabled) return
    setFormState(prev => ({ ...prev, tiers: new Map(prev.tiers).set(tierId, tier) }))
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  const handleTierDelete = useCallback((tierId: string) => {
    if (isFormDisabled) return
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.delete(tierId)
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  const handleTierReorder = useCallback((reorderedTiers: Record<string, DraftRecoveryTier>) => {
    if (isFormDisabled) return
    setFormState(prev => ({ ...prev, tiers: new Map(Object.entries(reorderedTiers)) }))
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  const sourceProvider = eligibleSourceProviders.find(provider => provider.id === formState.platform)
  const detailsValid = Boolean(
    isValidRecoveryApplicationFileName(formState.fileName)
    && isValidRecoveryApplicationName(formState.name)
    && formState.description.trim()
    && (lockedProviders !== null || (sourceProvider
      && getEligibleTargetProviders(providersQuery.data ?? [], sourceProvider.type)
        .some(provider => provider.id === formState.targetProviderId))),
  )
  const tiersValid = formState.tiers.size > 0
    && Array.from(formState.tiers.values()).every(tier => Boolean(tier.recovery_group))
  const policySetValid = Boolean(formState.policySetId.trim())
  const orchestrationValid = !formState.pushToOrchestrator
    || eligiblePlatformProviders.some(provider => provider.id === formState.orchestrationProviderId)

  const steps = [
    { id: 'details', label: t('pages.recoveryBuilder.steps.details') },
    {
      id: 'tiers',
      label: t('pages.recoveryBuilder.steps.tiers'),
      disabled: !detailsValid,
    },
    {
      id: 'policy-set',
      label: t('pages.recoveryBuilder.steps.policySet'),
      disabled: !detailsValid || !tiersValid,
    },
    {
      id: 'orchestration',
      label: t('pages.recoveryBuilder.steps.orchestration'),
      disabled: !detailsValid || !tiersValid || !policySetValid,
    },
  ]

  const canContinue = step === 1 ? detailsValid : step === 2 ? tiersValid : policySetValid
  // A saved application whose stored providers cannot be submitted stays
  // viewable, but Save is blocked and the reason shown on every step. Until the
  // providers load (or after a failed fetch) there is no verdict yet.
  const providersLoaded = Boolean(providersQuery.data) && !providersQuery.error
  const lockedProvidersError = lockedProviders && providersLoaded
    ? storedProvidersProblem(lockedProviders, providersQuery.data ?? [])
    : null
  // Stored groups are checked against the current list, so wait for it.
  const canSave = detailsValid && tiersValid && policySetValid && orchestrationValid && !areGroupsLoading
    && (!lockedProviders || (providersLoaded && !lockedProvidersError))

  const handleSave = () => {
    if (isFormDisabled) return
    const validationError = validateRecoveryApplication(
      formState,
      providersQuery.data ?? [],
      eligiblePlatformProviders,
      { lockedProviders, groups },
    )
    if (validationError) {
      alert(t(validationError.messageKey, validationError.params))
      return
    }
    onSave?.(formState)
  }

  return (
    <fieldset className="contents" disabled={isFormDisabled} aria-busy={isFormDisabled}>
    <div className="flex min-h-0 flex-1 p-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="custom-scrollbar min-h-0 overflow-x-hidden overflow-y-auto border-b border-border bg-surface-subtle lg:border-b-0 lg:border-r">
          <WizardSteps
            items={steps}
            currentStep={step}
            ariaLabel={t('pages.recoveryBuilder.steps.ariaLabel')}
            onStepChange={setStep}
          />
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className={`custom-scrollbar min-h-0 flex-1 p-5 sm:p-6 ${step === 2 || step === 3 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            {lockedProviders && providersQuery.error ? (
              <FetchErrorAlert
                className="mb-4 max-w-5xl"
                title={t('platformProviders.loadFailed')}
                retryLabel={t('buttons.retry')}
                isRetrying={providersQuery.isFetching}
                onRetry={() => { void providersQuery.refetch() }}
              />
            ) : lockedProvidersError ? (
              <Alert className="mb-4 max-w-5xl" variant="warning" title={t(lockedProvidersError.messageKey, lockedProvidersError.params)} />
            ) : null}
            {step === 1 ? (
              <div className="grid max-w-5xl gap-5">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.details.title')}</h2>
                  <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.details.description')}</p>
                </div>
                <AppMetadataForm
                  onMetadataChange={handleMetadataChange}
                  disableFileName={disableFileName}
                  initialValues={{
                    fileName: formState.fileName,
                    name: formState.name,
                    description: formState.description,
                    environment: formState.environment,
                    platform: formState.platform,
                    targetProviderId: formState.targetProviderId,
                  }}
                  providers={providersQuery.data ?? []}
                  lockProviders={lockedProviders !== null}
                  providersLoading={providersQuery.isLoading}
                  providersError={providersQuery.error instanceof Error ? providersQuery.error : null}
                  onRetryProviders={() => { void providersQuery.refetch() }}
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex h-full min-h-[480px] flex-col gap-4">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.tiers.title')}</h2>
                  <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.tiers.description')}</p>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-lg border border-border lg:grid-cols-[280px_minmax(0,1fr)]">
                  {/* Bounded on small screens too, so the virtualized group list keeps its own scroll. */}
                  <div className="custom-scrollbar h-72 min-h-0 overflow-y-auto border-b border-border lg:h-auto lg:border-b-0 lg:border-r">
                    <ResourceSidebar
                      items={sidebarItems}
                      itemLabels={groupLabels}
                      title={t('recovery.sidebar.availableGroups')}
                      searchPlaceholder={t('recovery.sidebar.searchGroupsPlaceholder')}
                      loadingLabel={t('recovery.sidebar.loadingGroups')}
                      noItemsLabel={t('recovery.sidebar.noGroupsAvailable')}
                      noMatchesLabel={t('recovery.sidebar.noMatchingGroups')}
                      dragDataKey="recovery-group-id"
                      isLoading={areGroupsLoading}
                      isRetrying={areGroupsFetching}
                      error={displayedGroupsError}
                      errorTitle={t('recovery.sidebar.groupsError')}
                      staleErrorTitle={t('recovery.sidebar.groupsError')}
                      staleErrorDescription={groupsErrorDescription || t('recovery.sidebar.groupsError')}
                      retryLabel={t('buttons.retry')}
                      onRetry={() => { void refreshGroups() }}
                    />
                  </div>
                  <div className="custom-scrollbar min-h-0 overflow-y-auto p-4">
                    <TierCanvas
                      tiers={tierCanvasTiers}
                      recoveryGroupVmOptions={recoveryGroupVmOptions}
                      onRecoveryGroupAdded={handleRecoveryGroupAdded}
                      onRecoveryGroupRemoved={handleRecoveryGroupRemoved}
                      onRecoveryVmSelectionChange={handleRecoveryVmSelectionChange}
                      onTierEdit={handleTierEdit}
                      onTierAdd={handleTierAdd}
                      onTierDelete={handleTierDelete}
                      onTierReorder={handleTierReorder}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex h-full min-h-0 flex-col">
                <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.policySet.title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.policySet.description')}</p>
                {policySetsQuery.isLoading ? (
                  <p className="mt-5 text-sm text-text-muted" role="status">{t('pages.recoveryBuilder.policySet.loading')}</p>
                ) : policySetsQuery.error ? (
                  <div className="mt-5 max-w-4xl">
                    <FetchErrorAlert
                      title={t('policySets.loadFailed')}
                      {...(policySetsErrorDescription ? { description: policySetsErrorDescription } : {})}
                      retryLabel={t('buttons.retry')}
                      onRetry={() => { void policySetsQuery.refetch() }}
                      variant="full"
                    />
                  </div>
                ) : policySetsQuery.data?.length ? (
                  <>
                    {formState.policySetId && !policySetsQuery.data.some(policySet => policySet.id === formState.policySetId) ? (
                      <p className="mt-5 text-sm text-warning-700 dark:text-warning-400" role="alert">
                        {t('pages.recoveryBuilder.policySet.unavailable')}
                      </p>
                    ) : null}
                    <div className="mt-5 min-h-0 flex-1">
                      <PolicySetPicker
                        policySets={policySetsQuery.data}
                        selectedPolicySetId={formState.policySetId}
                        onSelect={(policySetId) => { updateFormState({ policySetId }) }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="mt-5 max-w-4xl">
                    <EmptyState
                      title={t('pages.recoveryBuilder.policySet.empty.title')}
                      description={t('pages.recoveryBuilder.policySet.empty.description')}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.orchestration.title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.orchestration.description')}</p>
                <div className="mt-5 flex max-w-4xl items-start gap-3 rounded-lg border border-border bg-surface p-4">
                  <Toggle
                    checked={formState.pushToOrchestrator}
                    onChange={checked => { updateFormState({ pushToOrchestrator: checked }) }}
                    label={t('recovery.application.orchestration.toggleLabel')}
                    disabled={lockPushToOrchestrator}
                  />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t('recovery.application.orchestration.toggleLabel')}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {t(formState.pushToOrchestrator
                        ? 'recovery.application.orchestration.enabled'
                        : 'recovery.application.orchestration.disabled')}
                    </p>
                    {lockPushToOrchestrator ? (
                      <p className="mt-1 text-xs text-text-muted">{t('recovery.application.orchestration.locked')}</p>
                    ) : null}
                  </div>
                </div>
                {formState.pushToOrchestrator && platformProvidersQuery.error ? (
                  <div className="mt-5 max-w-4xl">
                    <FetchErrorAlert
                      title={t('platformProviders.loadFailed')}
                      {...(platformProvidersErrorDescription ? { description: platformProvidersErrorDescription } : {})}
                      retryLabel={t('buttons.retry')}
                      onRetry={() => { void platformProvidersQuery.refetch() }}
                      variant="full"
                    />
                  </div>
                ) : formState.pushToOrchestrator && !platformProvidersQuery.isLoading && eligiblePlatformProviders.length === 0 ? (
                  <div className="mt-5 max-w-4xl">
                    <EmptyState
                      title={t('pages.recoveryBuilder.orchestration.empty.title')}
                      description={t('pages.recoveryBuilder.orchestration.empty.description')}
                    />
                  </div>
                ) : formState.pushToOrchestrator ? (
                  <div className="mt-5 max-w-4xl">
                    <Field label={t('pages.recoveryBuilder.orchestration.providerLabel')} htmlFor="recovery-application-orchestration-provider">
                      <Select
                        id="recovery-application-orchestration-provider"
                        value={formState.orchestrationProviderId}
                        onChange={event => { updateFormState({ orchestrationProviderId: event.target.value }) }}
                        disabled={platformProvidersQuery.isLoading}
                        required={formState.pushToOrchestrator}
                      >
                        <option value="">
                          {platformProvidersQuery.isLoading
                            ? t('platformProviders.loading')
                            : t('pages.recoveryBuilder.orchestration.providerPlaceholder')}
                        </option>
                        {eligiblePlatformProviders.map(provider => (
                          <option key={provider.id} value={provider.id}>{provider.name} - {provider.type}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onCancel}>{t('buttons.cancel')}</Button>
            <div className="flex gap-3">
              <Button variant="outline" disabled={step === 1} onClick={() => { setStep(current => Math.max(1, current - 1)) }}>
                {t('buttons.back')}
              </Button>
              {step < 4 ? (
                <Button disabled={!canContinue} onClick={() => { setStep(current => Math.min(4, current + 1)) }}>
                  {t('buttons.next')}
                </Button>
              ) : (
                <Button
                  disabled={!canSave || isSaving}
                  startIcon={isSaving ? <Spinner /> : undefined}
                  onClick={handleSave}
                >
                  {isSaving ? t('messages.saving') : t('buttons.saveApplication')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={pendingSourceChange !== null}
      isLoading={isFormDisabled}
      title={t('recovery.application.sourceChange.title')}
      message={t('recovery.application.sourceChange.message')}
      confirmLabel={t('recovery.application.sourceChange.confirm')}
      cancelLabel={t('buttons.cancel')}
      tone="danger"
      onConfirm={confirmSourceChange}
      onCancel={() => { setPendingSourceChange(null) }}
    />
    </fieldset>
  )
}
