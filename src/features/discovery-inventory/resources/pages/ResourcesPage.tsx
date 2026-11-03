import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { ResourceViewNavigation } from '../components/ResourceViewNavigation'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { buildResourceSourceTabs, resolveActiveResourceTab } from '../helpers/buildResourceSourceTabs'
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
  } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
  const resourceTabLabels = useMemo(() => ({
    vmware: t('pages.virtualMachines.tabs.vmware'),
    flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
    'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
  }), [t])
  const roleTabs = useMemo(
    () => buildResourceSourceTabs(providers, resourceTabLabels),
    [providers, resourceTabLabels],
  )
  const visibleRoleTabs = providersSuccess ? roleTabs.filter(tab => tab.providerId !== null) : roleTabs
  const effectiveActiveTab = resolveActiveResourceTab(roleTabs, resourceTab, providerId, providersSuccess)
  const vmwareTabs = roleTabs.filter(tab => tab.resourceTab === 'vmware' && tab.providerId !== null)
  const backgroundPrefetchProvider = providersSuccess && effectiveActiveTab === vmwareTabs[0]
    ? providers.find(provider => provider.id === vmwareTabs[1]?.providerId && provider.credentialStatus !== 'missing')
    : undefined

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
    role: 'source',
  }

  switch (effectiveActiveTab?.resourceTab ?? resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage {...rolePageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage {...rolePageProps} />
    case 'vmware':
      return <VmwareResourcesPage {...rolePageProps} {...(backgroundPrefetchProvider ? { backgroundPrefetchProvider } : {})} />
  }
}
