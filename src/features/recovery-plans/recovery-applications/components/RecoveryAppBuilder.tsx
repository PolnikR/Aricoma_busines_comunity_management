import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { Field, Select } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { usePlatformProviders } from '@/features/platform-administration/platform-providers/hooks/usePlatformProviders'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useRecoveryGroups } from '../../recovery-groups/hooks/useRecoveryGroups'
import { AppMetadataForm } from './AppMetadataForm'
import { TierCanvas } from './TierCanvas'
import { cloneTier } from '../utils/recoveryApplicationFormMapper'
import { getEligiblePlatformProviders } from '../utils/eligibleProviders'
import { validateRecoveryApplication } from '../utils/validateRecoveryApplication'
import type { RecoveryTier, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface RecoveryAppBuilderProps {
  onSave?: (appState: RecoveryApplicationFormState) => void
  onDirtyChange?: (isDirty: boolean) => void
  isSaving?: boolean
  initialData?: RecoveryApplicationFormState
  disableFileName?: boolean
}

const DEFAULT_TIERS: Record<string, RecoveryTier> = {
  database: {
    order: 1,
    description: 'Database server group',
  },
  db_cluster: {
    order: 2,
    description: 'DB Cluster Master Node',
  },
  application: {
    order: 3,
    description: 'Application server group',
  },
  web: {
    order: 4,
    description: 'Web server group',
  },
}

function createInitialFormState(
  initialData?: RecoveryApplicationFormState,
): RecoveryApplicationFormState {
  if (initialData) {
    return {
      ...initialData,
      tiers: new Map(
        Array.from(
          initialData.tiers,
          ([id, tier]): [string, RecoveryTier] => [id, cloneTier(tier)],
        ),
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
        ([id, tier]): [string, RecoveryTier] => [id, cloneTier(tier)],
      ),
    ),
  }
}

export function RecoveryAppBuilder({
  onSave,
  onDirtyChange,
  isSaving,
  initialData,
  disableFileName = false,
}: RecoveryAppBuilderProps) {
  const { t } = useTranslation()
  const platformProvidersQuery = usePlatformProviders()
  const providersQuery = useProviders()
  const recoveryAppPoliciesQuery = useRecoveryAppPolicies()
  const eligiblePlatformProviders = useMemo(
    () => getEligiblePlatformProviders(platformProvidersQuery.data ?? []),
    [platformProvidersQuery.data],
  )
  const {
    groups,
    isLoading: areGroupsLoading,
    isFetching: areGroupsFetching,
    error: groupsError,
    refresh: refreshGroups,
  } = useRecoveryGroups()
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
  const [formState, setFormState] = useState<RecoveryApplicationFormState>(
    () => createInitialFormState(initialData),
  )

  const handleMetadataChange = useCallback((metadata: Partial<RecoveryApplicationFormState>) => {
    setFormState(prev => ({ ...prev, ...metadata }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleRecoveryGroupAdded = useCallback((tierId: string, groupId: string) => {
    const selectedGroup = availableGroups.find(group => group.id === groupId)
    if (!selectedGroup) return

    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const tier = newTiers.get(tierId)
      if (tier) {
        newTiers.set(tierId, {
          ...tier,
          recovery_group: {
            name: selectedGroup.id,
            description: selectedGroup.description,
            vms: selectedGroup.resources.map((name, index) => ({
              name,
              order: index + 1,
              ...selectedGroup.vmMetadataByName?.[name],
            })),
          },
        })
      }
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [availableGroups, onDirtyChange])

  const handleRecoveryGroupRemoved = useCallback((tierId: string) => {
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, {
        order: tier.order,
        description: tier.description,
      })
      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleRecoveryVmSelectionChange = useCallback((
    tierId: string,
    vmName: string,
    selected: boolean,
  ) => {
    setFormState(prev => {
      const tier = prev.tiers.get(tierId)
      if (!tier?.recovery_group) return prev

      const alreadySelected = tier.recovery_group.vms.some(vm => vm.name === vmName)
      if (alreadySelected === selected) return prev

      const selectedGroup = availableGroups.find(group => group.id === tier.recovery_group?.name)
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

  const handleTierEdit = useCallback((tierId: string, newTierId: string, updates: {
    tierDescription: string
  }) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      const oldTier = newTiers.get(tierId)

      if (!oldTier) return prev

      // If ID changed, delete old and create new
      if (newTierId !== tierId) {
        newTiers.delete(tierId)
      }

      const updatedTier: RecoveryTier = {
        ...oldTier,
        description: updates.tierDescription,
      }

      newTiers.set(newTierId, updatedTier)

      return { ...prev, tiers: newTiers }
    })
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const handleTierAdd = useCallback((tierId: string, tier: RecoveryTier) => {
    setFormState(prev => {
      const newTiers = new Map(prev.tiers)
      newTiers.set(tierId, tier)
      return { ...prev, tiers: newTiers }
    })
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

  const handleTierReorder = useCallback((reorderedTiers: Record<string, RecoveryTier>) => {
    setFormState(prev => ({
      ...prev,
      tiers: new Map(Object.entries(reorderedTiers)),
    }))
    onDirtyChange?.(true)
  }, [onDirtyChange])

  const sidebarItems = useMemo(
    () => availableGroups.map(group => group.id),
    [availableGroups],
  )
  const tierCanvasTiers = useMemo(
    () => Object.fromEntries(formState.tiers),
    [formState.tiers],
  )

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
    <div className="flex flex-col gap-4 lg:min-h-0 flex-1 p-4">
      {/* Metadata Form Card */}
      <div className="bg-surface border border-border rounded-lg p-4 shadow-sm">
        <h2 className="text-base font-semibold text-text-primary mb-4">{t('pages.recovery.applicationDetails')}</h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <AppMetadataForm
              onMetadataChange={handleMetadataChange}
              disableFileName={disableFileName}
              initialValues={{
                fileName: formState.fileName,
                policySetId: formState.policySetId,
                name: formState.name,
                description: formState.description,
                environment: formState.environment,
                platform: formState.platform,
              }}
              providers={providersQuery.data ?? []}
              providersLoading={providersQuery.isLoading}
              providersError={providersQuery.error instanceof Error ? providersQuery.error : null}
              onRetryProviders={() => { void providersQuery.refetch() }}
              recoveryAppPolicies={recoveryAppPoliciesQuery.data ?? []}
              recoveryAppPoliciesLoading={recoveryAppPoliciesQuery.isLoading}
              recoveryAppPoliciesError={recoveryAppPoliciesQuery.error instanceof Error ? recoveryAppPoliciesQuery.error : null}
              onRetryRecoveryAppPolicies={() => { void recoveryAppPoliciesQuery.refetch() }}
            />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-64">
            <div className="flex min-h-10 items-center gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2">
              <Toggle
                checked={formState.pushToOrchestrator}
                onChange={(checked) => {
                  setFormState(prev => ({ ...prev, pushToOrchestrator: checked }))
                  onDirtyChange?.(true)
                }}
                label={t('recovery.application.orchestration.toggleLabel')}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {t('recovery.application.orchestration.toggleLabel')}
                </p>
                <p className="text-xs text-text-muted">
                  {t(formState.pushToOrchestrator
                    ? 'recovery.application.orchestration.enabled'
                    : 'recovery.application.orchestration.disabled')}
                </p>
              </div>
            </div>
            {formState.pushToOrchestrator ? (
              <Field
                label={t('pages.recoveryGroupBuilder.orchestration.providerLabel')}
                htmlFor="recovery-application-orchestration-provider"
              >
                <Select
                  id="recovery-application-orchestration-provider"
                  value={formState.orchestrationProviderId}
                  onChange={(event) => {
                    setFormState(prev => ({ ...prev, orchestrationProviderId: event.target.value }))
                    onDirtyChange?.(true)
                  }}
                  disabled={platformProvidersQuery.isLoading || platformProvidersQuery.error !== null}
                  required
                >
                  <option value="">
                    {platformProvidersQuery.isLoading
                      ? t('platformProviders.loading')
                      : t('pages.recoveryGroupBuilder.orchestration.providerPlaceholder')}
                  </option>
                  {eligiblePlatformProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.type}
                    </option>
                  ))}
                </Select>
                {platformProvidersQuery.error ? (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {t('platformProviders.loadFailed')}{' '}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => { void platformProvidersQuery.refetch() }}
                    >
                      {t('buttons.retry')}
                    </button>
                  </p>
                ) : null}
              </Field>
            ) : null}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <Spinner /> : undefined}
            size="sm"
            className="whitespace-nowrap"
          >
            {isSaving ? t('messages.saving') : t('buttons.saveApplication')}
          </Button>
        </div>
      </div>

      {/* Builder Card */}
      <div className="flex-1 bg-surface border border-border rounded-lg overflow-hidden shadow-sm lg:min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0 h-full lg:min-h-0">
          {/* Recovery Group Sidebar */}
          <div className="border-b lg:border-b-0 lg:border-r border-border overflow-y-auto custom-scrollbar">
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
              error={groupsError}
              errorTitle={t('recovery.sidebar.groupsError')}
              staleErrorTitle={t('recovery.sidebar.groupsError')}
              staleErrorDescription={t('recovery.sidebar.groupsError')}
              retryLabel={t('buttons.retry')}
              onRetry={() => { void refreshGroups() }}
            />
          </div>

          {/* Tier Canvas */}
          <div className="overflow-y-auto custom-scrollbar p-4">
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
    </div>
  )
}
