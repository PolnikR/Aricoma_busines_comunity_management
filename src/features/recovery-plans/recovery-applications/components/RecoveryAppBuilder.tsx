import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Select } from '@/shared/components/form/FormControls'
import { PolicySetPicker } from '@/shared/components/policy-set-picker/PolicySetPicker'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { usePolicySets } from '@/features/recovery-plans/policy-sets/hooks/usePolicySets'
import { useRecoveryGroups } from '../../recovery-groups/hooks/useRecoveryGroups'
import { AppMetadataForm } from './AppMetadataForm'
import { TierCanvas } from './TierCanvas'
import { cloneTier } from '../utils/recoveryApplicationFormMapper'
import { getEligiblePlatformProviders, getEligibleSourceProviders } from '../utils/eligibleProviders'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from '../utils/recoveryApplicationFileName'
import { validateRecoveryApplication } from '../utils/validateRecoveryApplication'
import type { DraftRecoveryTier, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  onCancel?: () => void
  onDirtyChange?: (isDirty: boolean) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
  disableFileName?: boolean
  isInitialLoading?: boolean
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
    sourceConnection: 'vcenter_default',
    targetConnection: 'vcenter_default_destination',
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
  isSaving,
  initialData,
  disableFileName = false,
  isInitialLoading = false,
}: RecoveryAppBuilderProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => createInitialFormState(initialData),
  )

  const providersQuery = useProviders()
  const platformProvidersQuery = usePlatformProviders()
  const policySetsQuery = usePolicySets()
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
  const availableGroups = useMemo(
    () => groups.filter(group => group.sourceCategory === 'backup_system_workload'),
    [groups],
  )
  const groupLabels = useMemo(
    () => Object.fromEntries(availableGroups.map(group => [group.id, group.name])),
    [availableGroups],
  )
  const recoveryGroupVmOptions = useMemo(
    () => Object.fromEntries(availableGroups.map(group => [group.id, group.resources])),
    [availableGroups],
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
    setFormState(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleMetadataChange = useCallback((metadata: Partial<RecoveryApplicationFormState>) => {
    updateFormState(metadata)
  }, [updateFormState])

  const handleRecoveryGroupAdded = useCallback((tierId: string, groupId: string) => {
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
  }, [availableGroups, onDirtyChange])

  const handleRecoveryGroupRemoved = useCallback((tierId: string) => {
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, { order: tier.order, description: tier.description })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleRecoveryVmSelectionChange = useCallback((tierId: string, vmName: string, selected: boolean) => {
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const alreadySelected = tier.recovery_group.vms.some(vm => vm.name === vmName)
      if (alreadySelected === selected) return prev

      const selectedGroup = availableGroups.find(group => group.id === tier.recovery_group?.id)
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
  }, [availableGroups, onDirtyChange])

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: { tierDescription: string }) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const oldTier = newTiers.get(tierId)
      if (!oldTier) return prev
      if (newTierId !== tierId) newTiers.delete(tierId)
      newTiers.set(newTierId, { ...oldTier, description: updates.tierDescription })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierAdd = useCallback((tierId: string, tier: DraftRecoveryTier) => {
    setFormState(prev => ({ ...prev, tiers: new Map(prev.tiers).set(tierId, tier) }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierDelete = useCallback((tierId: string) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.delete(tierId)
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierReorder = useCallback((reorderedTiers: Record<string, DraftRecoveryTier>) => {
    setFormState(prev => ({ ...prev, tiers: new Map(Object.entries(reorderedTiers)) }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const detailsValid = Boolean(
    isValidRecoveryApplicationFileName(formState.fileName)
    && isValidRecoveryApplicationName(formState.name)
    && formState.description.trim()
    && eligibleSourceProviders.some(provider => provider.id === formState.platform),
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
  const canSave = detailsValid && tiersValid && policySetValid && orchestrationValid

  const handleSave = () => {
    const validationError = validateRecoveryApplication(
      formState,
      providersQuery.data ?? [],
      eligiblePlatformProviders,
    )
    if (validationError) {
      alert(t(validationError.messageKey))
      return
    }
    onSave?.(formState)
  }

  return (
    <fieldset className="contents" disabled={isInitialLoading} aria-busy={isInitialLoading}>
    <div className="flex min-h-0 flex-1 p-4">
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
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
                  }}
                  providers={providersQuery.data ?? []}
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
                  <div className="custom-scrollbar overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
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
                  <div className="custom-scrollbar overflow-y-auto p-4">
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
                  />
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t('recovery.application.orchestration.toggleLabel')}</p>
                    <p className="mt-1 text-xs text-text-muted">
                      {t(formState.pushToOrchestrator
                        ? 'recovery.application.orchestration.enabled'
                        : 'recovery.application.orchestration.disabled')}
                    </p>
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
    </fieldset>
  )
}
