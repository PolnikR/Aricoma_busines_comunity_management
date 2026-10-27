import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Select } from '@/shared/components/form/FormControls'
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
import { isRecoveryGroupSourceCompatible, isRecoveryGroupSourceEligible } from '../utils/recoveryGroupPlatform'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { AppMetadataForm } from './AppMetadataForm'
import { TierCanvas } from './TierCanvas'
import { DagTemplateVersionSelect } from './DagTemplateVersionSelect'
import { useGetDagTemplateVersions } from '@/generated/query/recovery-apps/recovery-apps.gen'
import { addApplicationTier, applyApplicationTierOrder, applyConfirmedSourceChange, assignRecoveryGroup, createApplicationDraft, deleteApplicationTier, editApplicationTier, planApplicationMetadataChange, removeRecoveryGroup, selectRecoveryVm } from '../model/recoveryApplicationDraft'
import type { ApplicationMetadataPatch, SourceChangeProposal } from '../model/recoveryApplicationDraft'
import { getEligiblePlatformProviders } from '../utils/eligibleProviders'
import { getRecoveryApplicationDraftReadiness } from '../model/recoveryApplicationDraftReadiness'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { recoveryApplicationHelpKey, recoveryApplicationTierOrderHelpKey } from '../helpers/recoveryApplicationFieldHelp'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  onCancel?: () => void
  onDirtyChange?: (isDirty: boolean) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
  disableFileName?: boolean
  isInitialLoading?: boolean
  readOnly?: boolean
  // The app is deployed to Airflow: saving it without a push would make the
  // backend record pushed=false while its DAG stays deployed, so delete would
  // no longer roll it back. Keep the push on until the backend preserves it.
  lockPushToOrchestrator?: boolean
  // A saved application keeps its platform and providers (see LockedProviders).
  lockedProviders?: LockedProviders | null
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
  readOnly = false,
}: RecoveryAppBuilderProps) {
  const { t } = useTranslation()
  const isFormDisabled = isInitialLoading || isSaving || readOnly
  const [step, setStep] = useState(1)
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => ({
      ...createApplicationDraft(initialData),
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

  const eligiblePlatformProviders = useMemo(
    () => getEligiblePlatformProviders(platformProvidersQuery.data ?? []),
    [platformProvidersQuery.data],
  )
  // The platform is the selected source provider's type (or the stored one of a
  // saved application, whose provider may be gone); without one no group fits.
  const platform = lockedProviders?.platform
    ?? providersQuery.data?.find(provider => provider.id === formState.platform)?.type
  const sourceProviderId = lockedProviders ? lockedProviders.sourceProviderId : formState.platform
  const normalizedPlatform = platform?.toUpperCase()
  const templatePlatform = normalizedPlatform === 'VMWARE' ? 'vmware' : normalizedPlatform === 'IBM_POWER' ? 'ibm_power' : undefined
  const templatesQuery = useGetDagTemplateVersions(
    templatePlatform ? { platform: templatePlatform } : undefined,
    { query: { enabled: Boolean(templatePlatform), placeholderData: () => undefined } },
  )
  const templates = (templatesQuery.data?.templates ?? []).filter(template => template.platform.toLowerCase() === templatePlatform)
  const templateCatalog = { templates, verified: Boolean(templatePlatform && templatesQuery.data && !templatesQuery.error) }
  const compatibleGroups = useMemo(
    () => groups.filter(group => isRecoveryGroupSourceCompatible(group, platform, sourceProviderId)),
    [groups, platform, sourceProviderId],
  )
  const availableGroups = useMemo(
    () => compatibleGroups.filter(group => isRecoveryGroupSourceEligible(group, platform, sourceProviderId)),
    [compatibleGroups, platform, sourceProviderId],
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

  const updateFormState = useCallback((update: Partial<Pick<RecoveryApplicationFormState, 'policySetId' | 'orchestrationProviderId' | 'pushToOrchestrator' | 'dagTemplateVersion'>>) => {
    if (isFormDisabled) return
    setFormState(current => ({ ...current, ...update }))
    onDirtyChange?.(true)
  }, [isFormDisabled, onDirtyChange])

  // Assigned groups belong to the current source platform, so a source change
  // asks first and then detaches them from every tier (the tiers stay).
  const [pendingSourceChange, setPendingSourceChange] = useState<SourceChangeProposal | null>(null)
  const handleMetadataChange = useCallback((update: ApplicationMetadataPatch) => {
    if (isFormDisabled) return
    const decision = planApplicationMetadataChange(formState, update, {
      providers: providersQuery.data ?? [], lockedProviders,
    })
    if (decision.kind === 'confirmationRequired') {
      setPendingSourceChange(decision.proposal)
      return
    }
    // The planned patch preserves explicit unchanged keys and derived resets;
    // merge it into the latest draft so queued unrelated edits survive.
    setFormState(current => ({ ...current, ...decision.metadata }))
    const notifyDirty = decision.kind === 'applied' ? decision.transition.notifyDirty : decision.notifyDirty
    if (notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, lockedProviders, onDirtyChange, providersQuery.data, setPendingSourceChange])
  const confirmSourceChange = () => {
    if (isFormDisabled || !pendingSourceChange) return
    const result = applyConfirmedSourceChange(formState, pendingSourceChange, lockedProviders)
    setFormState(current => applyConfirmedSourceChange(current, pendingSourceChange, lockedProviders).draft)
    setPendingSourceChange(null)
    if (result.notifyDirty) onDirtyChange?.(true)
  }

  const handleRecoveryGroupAdded = useCallback((tierId: string, groupId: string) => {
    if (isFormDisabled) return
    const context = { providers: providersQuery.data ?? [], groups, lockedProviders }
    const result = assignRecoveryGroup(formState, tierId, groupId, context)
    if (!result.notifyDirty) return
    setFormState(current => assignRecoveryGroup(current, tierId, groupId, context).draft)
    onDirtyChange?.(true)
  }, [formState, groups, isFormDisabled, lockedProviders, onDirtyChange, providersQuery.data])

  const handleRecoveryGroupRemoved = useCallback((tierId: string) => {
    if (isFormDisabled) return
    const result = removeRecoveryGroup(formState, tierId)
    setFormState(current => removeRecoveryGroup(current, tierId).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, onDirtyChange])

  const handleRecoveryVmSelectionChange = useCallback((tierId: string, vmName: string, selected: boolean) => {
    if (isFormDisabled) return
    const context = { providers: providersQuery.data ?? [], groups, lockedProviders }
    const result = selectRecoveryVm(formState, tierId, vmName, selected, context)
    setFormState(current => selectRecoveryVm(current, tierId, vmName, selected, context).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, groups, isFormDisabled, lockedProviders, onDirtyChange, providersQuery.data])

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: { tierDescription: string }) => {
    if (isFormDisabled) return
    const result = editApplicationTier(formState, tierId, newTierId, updates)
    setFormState(current => editApplicationTier(current, tierId, newTierId, updates).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, onDirtyChange])

  const handleTierAdd = useCallback((tierId: string, tier: DraftRecoveryTier) => {
    if (isFormDisabled) return
    const result = addApplicationTier(formState, tierId, tier)
    setFormState(current => addApplicationTier(current, tierId, tier).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, onDirtyChange])

  const handleTierDelete = useCallback((tierId: string) => {
    if (isFormDisabled) return
    const result = deleteApplicationTier(formState, tierId)
    setFormState(current => deleteApplicationTier(current, tierId).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, onDirtyChange])

  const handleTierReorder = useCallback((reorderedTiers: Record<string, DraftRecoveryTier>) => {
    if (isFormDisabled) return
    const result = applyApplicationTierOrder(formState, reorderedTiers)
    setFormState(current => applyApplicationTierOrder(current, reorderedTiers).draft)
    if (result.notifyDirty) onDirtyChange?.(true)
  }, [formState, isFormDisabled, onDirtyChange])

  const { detailsValid, tiersValid, policySetValid, canContinue, canSave, lockedProvidersError, tiersError, validationError } = getRecoveryApplicationDraftReadiness(formState, {
    step: step === 1 || step === 2 || step === 3 ? step : 4,
    providers: providersQuery.data,
    providersError: providersQuery.error,
    platformProviders: platformProvidersQuery.data ?? [],
    areGroupsLoading,
    groups,
    groupsError,
    lockedProviders,
    templateCatalog,
  })

  const hasDuplicateWorkloads = tiersError?.messageKey.startsWith('recovery.application.validation.duplicateWorkload') ?? false
  const steps = [
    { id: 'details', label: t('pages.recoveryBuilder.steps.details') },
    {
      id: 'tiers',
      label: t('pages.recoveryBuilder.steps.tiers'),
      disabled: !readOnly && !detailsValid,
    },
    {
      id: 'policy-set',
      label: t('pages.recoveryBuilder.steps.policySet'),
      disabled: !readOnly && (!detailsValid || !tiersValid),
    },
    {
      id: 'orchestration',
      label: t('pages.recoveryBuilder.steps.orchestration'),
      // A v2 duplicate can be repaired by selecting v1/null in Orchestration.
      disabled: !readOnly && (!detailsValid || (!hasDuplicateWorkloads && (!tiersValid || !policySetValid))),
    },
  ]

  const helpPlatform = lockedProviders ? lockedProviders.platform : providersQuery.isLoading || providersQuery.error ? undefined : platform
  const workloadsHelpKey = recoveryApplicationHelpKey('workloads', helpPlatform)
  const tierOrderHelpKey = recoveryApplicationTierOrderHelpKey(helpPlatform, formState.dagTemplateVersion, {
    templates, verified: templateCatalog.verified && !templatesQuery.isPending,
  })
  const policyHelpKey = recoveryApplicationHelpKey('policySet', helpPlatform)

  const handleSave = () => {
    if (isFormDisabled || !canSave) return
    onSave?.(formState)
  }

  return (
    <fieldset className="contents" disabled={isInitialLoading || isSaving} aria-busy={isInitialLoading || isSaving}>
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
            <div className="contents"
              onDragStartCapture={event => { if (isFormDisabled) { event.preventDefault(); event.stopPropagation() } }}
              onDropCapture={event => { if (isFormDisabled) { event.preventDefault(); event.stopPropagation() } }}>
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
                  readOnly={readOnly}
                  helpPlatform={helpPlatform}
                  onMetadataChange={handleMetadataChange}
                  disableFileName={disableFileName}
                  initialValues={{
                    fileName: formState.fileName,
                    name: formState.name,
                    description: formState.description,
                    environment: formState.environment,
                    platform: formState.platform,
                    targetProviderId: formState.targetProviderId,
                    notificationEmail: formState.notificationEmail,
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
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.tiers.title')}</h2>
                    <KeyedHelpPopover key={tierOrderHelpKey} helpKey={tierOrderHelpKey} sections={['effect', 'limitations']} />
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.tiers.description')}</p>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-text-primary">{t('pages.recoveryBuilder.tiers.workloadSelection')}</h3>
                  <KeyedHelpPopover key={workloadsHelpKey} helpKey={workloadsHelpKey} sections={['effect', 'limitations']} />
                </div>
                {tiersError && !groupsError ? <Alert variant="warning" title={t(tiersError.messageKey, tiersError.params)} /> : null}
                <fieldset className="contents" disabled={readOnly}>
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
                </fieldset>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryBuilder.policySet.title')}</h2>
                  <KeyedHelpPopover key={policyHelpKey} helpKey={policyHelpKey} sections={['effect', 'limitations']} />
                </div>
                <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryBuilder.policySet.description')}</p>
                {readOnly && formState.policySetId ? <p className="mt-2 text-sm text-text-secondary">{formState.policySetId}</p> : null}
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
                    <fieldset className="mt-5 min-h-0 flex-1" disabled={readOnly}>
                      <PolicySetPicker
                        policySets={policySetsQuery.data}
                        selectedPolicySetId={formState.policySetId}
                        onSelect={(policySetId) => { updateFormState({ policySetId }) }}
                      />
                    </fieldset>
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
                <DagTemplateVersionSelect
                  platform={templatePlatform}
                  value={formState.dagTemplateVersion ?? null}
                  templates={templates}
                  isLoading={Boolean(templatePlatform && templatesQuery.isPending)}
                  error={templatesQuery.error}
                  disabled={isFormDisabled}
                  onChange={dagTemplateVersion => { updateFormState({ dagTemplateVersion }) }}
                  onRetry={() => { void templatesQuery.refetch() }}
                />
                <div className="mt-5 flex max-w-4xl items-start gap-3 rounded-lg border border-border bg-surface p-4">
                  <Toggle
                    checked={formState.pushToOrchestrator}
                    onChange={checked => { updateFormState({ pushToOrchestrator: checked }) }}
                    label={t('recovery.application.orchestration.toggleLabel')}
                    disabled={readOnly || lockPushToOrchestrator}
                  />
                  <div>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="text-sm font-semibold text-text-primary">{t('recovery.application.orchestration.toggleLabel')}</p>
                      <KeyedHelpPopover helpKey="recoveryApplications.fieldHelp.push" sections={['effect', 'limitations']} />
                    </div>
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
                {formState.pushToOrchestrator ? (
                  <div className="mt-5 flex min-w-0 items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
                    {platformProvidersQuery.error || (!platformProvidersQuery.isLoading && eligiblePlatformProviders.length === 0)
                      ? <span className="text-xs font-medium text-text-secondary">{t('pages.recoveryBuilder.orchestration.providerLabel')}</span>
                      : <label htmlFor="recovery-application-orchestration-provider" className="text-xs font-medium text-text-secondary">{t('pages.recoveryBuilder.orchestration.providerLabel')}</label>}
                    <KeyedHelpPopover helpKey="recoveryApplications.fieldHelp.airflow" sections={['effect', 'limitations']} />
                  </div>
                ) : null}
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
                      <Select
                        id="recovery-application-orchestration-provider"
                        value={formState.orchestrationProviderId}
                        onChange={event => { updateFormState({ orchestrationProviderId: event.target.value }) }}
                        disabled={readOnly || platformProvidersQuery.isLoading}
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
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          </div>
          {validationError && !(formState.pushToOrchestrator && platformProvidersQuery.error) && (step === 4 || (step === 1 && validationError.field === 'notificationEmail')) ? <Alert className="mx-4 mb-3" variant="warning" title={t(validationError.messageKey, validationError.params)} /> : null}
          <div className="flex flex-col-reverse gap-3 border-t border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={onCancel}>{t('buttons.cancel')}</Button>
            <div className="flex gap-3">
              <Button variant="outline" disabled={step === 1} onClick={() => { setStep(current => Math.max(1, current - 1)) }}>
                {t('buttons.back')}
              </Button>
              {step < 4 ? (
                <Button disabled={!readOnly && !canContinue} onClick={() => { setStep(current => Math.min(4, current + 1)) }}>
                  {t('buttons.next')}
                </Button>
              ) : (
                <Button
                  disabled={!canSave || isFormDisabled}
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
      onCancel={() => { if (!isFormDisabled) setPendingSourceChange(null) }}
    />
    </fieldset>
  )
}
