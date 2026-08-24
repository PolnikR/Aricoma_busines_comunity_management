import { useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { buildResourceSourceTabs } from '../helpers/buildResourceSourceTabs'
import { VmwareResourcesPage } from '../components/vmware/VmwareResourcesPage'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'

export function ResourcesPage() {
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
  const roleTabs = useMemo(
    () => buildResourceSourceTabs(providers, {
      vmware: t('pages.virtualMachines.tabs.vmware'),
      flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
      'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
    }),
    [providers, t],
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
          eyebrow={t('pages.virtualMachines.eyebrow')}
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
      items={visibleRoleTabs}
      value={effectiveActiveTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = visibleRoleTabs.find(tab => tab.value === value)
        if (nextTab) {
          setResourceSource({ resourceTab: nextTab.resourceTab, providerId: nextTab.providerId })
        }
      }}
      ariaLabel={t('pages.virtualMachines.tabs.label')}
      indicator="inset"
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
    role: 'source',
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
