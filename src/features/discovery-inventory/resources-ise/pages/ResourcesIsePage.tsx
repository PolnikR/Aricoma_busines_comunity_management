import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { ResourceViewNavigation } from '@/features/discovery-inventory/resources/components/ResourceViewNavigation'
import { FlashSystemResourcesPage } from '@/features/discovery-inventory/resources/components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '@/features/discovery-inventory/resources/components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '@/features/discovery-inventory/resources/components/SourceResourcesPageProps'
import { buildResourceTargetTabs, resolveActiveResourceTab } from '@/features/discovery-inventory/resources/helpers/buildResourceSourceTabs'
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
  } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const resourceTabLabels = useMemo(() => ({
    vmware: t('pages.virtualMachines.tabs.vmware'),
    flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
    'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
  }), [t])
  const roleTabs = useMemo(
    () => buildResourceTargetTabs(providers, resourceTabLabels),
    [providers, resourceTabLabels],
  )
  const visibleRoleTabs = providersSuccess ? roleTabs.filter(tab => tab.providerId !== null) : roleTabs
  const effectiveActiveTab = resolveActiveResourceTab(roleTabs, resourceTab, providerId, providersSuccess)

  const tabs = (
    <ResourceViewNavigation
      items={visibleRoleTabs}
      labels={resourceTabLabels}
      selectedProvider={providers.find(provider => provider.id === effectiveActiveTab?.providerId) ?? null}
      value={effectiveActiveTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = visibleRoleTabs.find(tab => tab.value === value)
        if (nextTab) {
          setResourceSource({ resourceTab: nextTab.resourceTab, providerId: nextTab.providerId })
        }
      }}
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
    tabs: visibleRoleTabs.length > 0 ? tabs : undefined,
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
