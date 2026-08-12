import { useEffect, useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
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
  const sourceTabs = useMemo(
    () => buildResourceSourceTabs(providers, {
      vmware: t('pages.virtualMachines.tabs.vmware'),
      flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
      'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
    }),
    [providers, t],
  )
  const activeSourceTab = sourceTabs.find(
    tab => tab.resourceTab === resourceTab && tab.providerId === providerId,
  ) ?? sourceTabs.find(tab => tab.resourceTab === resourceTab) ?? sourceTabs[0]

  useEffect(() => {
    if (!providersSuccess || !activeSourceTab) return
    if (activeSourceTab.resourceTab !== resourceTab || activeSourceTab.providerId !== providerId) {
      setResourceSource({
        resourceTab: activeSourceTab.resourceTab,
        providerId: activeSourceTab.providerId,
      })
    }
  }, [activeSourceTab, providerId, providersSuccess, resourceTab, setResourceSource])

  const tabs = (
    <Tabs
      items={sourceTabs}
      value={activeSourceTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = sourceTabs.find(tab => tab.value === value)
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
  const sourcePageProps: SourceResourcesPageProps = {
    providers,
    providersPending: providersLoading || (!providersSuccess && providersError === null),
    providersSuccess,
    providersFetching,
    providersError: providersError instanceof Error ? providersError : null,
    onRefetchProviders: () => { void refetchProviders() },
    providerId: activeSourceTab?.providerId ?? null,
    tabs,
    t,
  }

  switch (resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage key={activeSourceTab?.value} {...sourcePageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage key={activeSourceTab?.value} {...sourcePageProps} />
    case 'vmware':
      return <VmwareResourcesPage key={activeSourceTab?.value} {...sourcePageProps} />
  }
}
