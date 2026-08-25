import { useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { FlashSystemResourcesPage } from '@/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '@/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '@/features/discovery-inventory/resources/components/SourceResourcesPageProps'
import { buildResourceTargetTabs } from '@/features/discovery-inventory/resources/helpers/buildResourceSourceTabs'
import { VmwareResourcesPage } from '@/features/discovery-inventory/resources/components/vmware/VmwareResourcesPage'
import { useResourceTabSearchParam } from '@/features/discovery-inventory/resources/hooks/useResourceTabSearchParam'

export function ResourcesIsePage() {
  const { t } = useTranslation()
  const { resourceTab, providerId, setResourceSource } = useResourceTabSearchParam()
  const {
    data: providers = [],
    error: providersError,
    isLoading: providersLoading,
    isSuccess: providersSuccess,
    isFetching: providersFetching,
    refetch: refetchProviders,
  } = useProviders()
  const resourceTabLabels = useMemo(() => ({
    vmware: t('pages.virtualMachines.tabs.vmware'),
    flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
    'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
  }), [t])
  const roleTabs = useMemo(
    () => buildResourceTargetTabs(providers, resourceTabLabels),
    [providers, resourceTabLabels],
  )
  const activeRoleTab = roleTabs.find(
    tab => tab.resourceTab === resourceTab && tab.providerId === providerId,
  ) ?? roleTabs.find(tab => tab.resourceTab === resourceTab) ?? roleTabs[0]
  const visibleRoleTabs = providersSuccess ? roleTabs.filter(tab => tab.providerId !== null) : roleTabs
  const effectiveActiveTab = providersSuccess && activeRoleTab?.providerId === null && visibleRoleTabs.length > 0
    ? visibleRoleTabs[0]
    : activeRoleTab

  if (providersSuccess && visibleRoleTabs.length === 0) {
    return (
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
        <TableToolbar
          eyebrow={t('pages.resourcesIse.eyebrow')}
          title={t('pages.virtualMachines.title')}
          description={t('pages.virtualMachines.description')}
          isFetching={providersFetching}
          onRefresh={() => { void refetchProviders() }}
        />
        <EmptyState
          title={t('resources.common.noProviderTitle')}
          description={t('resources.common.noProviderDescription')}
        />
      </div>
    )
  }

  const tabs = (
    <Tabs
      items={visibleRoleTabs.map((tab) => ({
        ...tab,
        accessibleLabel: tab.label,
        label: (
          <span className="inline-flex items-center gap-2">
            <span>{resourceTabLabels[tab.resourceTab]}</span>
            {tab.providerId ? <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-text-muted">{tab.providerId}</span> : null}
          </span>
        ),
      }))}
      value={effectiveActiveTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = visibleRoleTabs.find(tab => tab.value === value)
        if (nextTab) {
          setResourceSource({ resourceTab: nextTab.resourceTab, providerId: nextTab.providerId })
        }
      }}
      ariaLabel={t('pages.virtualMachines.tabs.label')}
      indicator="inset"
      compact
      scrollControls={{
        previousLabel: t('pages.virtualMachines.tabs.previous'),
        nextLabel: t('pages.virtualMachines.tabs.next'),
      }}
      className="w-full shrink-0 border-b-0 bg-surface px-0 sm:w-auto"
    />
  )
  const rolePageProps: SourceResourcesPageProps = {
    providers,
    providersPending: providersLoading || (!providersSuccess && providersError === null),
    providersSuccess,
    providersFetching,
    providersError: providersError instanceof Error ? providersError : null,
    onRefetchProviders: () => { void refetchProviders() },
    providerId: effectiveActiveTab?.providerId ?? null,
    tabs,
    t,
    role: 'target',
  }

  switch (effectiveActiveTab?.resourceTab ?? resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage {...rolePageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage {...rolePageProps} />
    case 'vmware':
      return <VmwareResourcesPage {...rolePageProps} />
  }
}
