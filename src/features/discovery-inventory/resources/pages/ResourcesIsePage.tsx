import { useEffect, useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { buildResourceTargetTabs } from '../helpers/buildResourceSourceTabs'
import { VmwareResourcesPage } from '../components/vmware/VmwareResourcesPage'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'

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
  const targetTabs = useMemo(
    () => buildResourceTargetTabs(providers, {
      vmware: t('pages.virtualMachines.tabs.vmware'),
      flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
      'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
    }),
    [providers, t],
  )
  const activeTargetTab = targetTabs.find(
    tab => tab.resourceTab === resourceTab && tab.providerId === providerId,
  ) ?? targetTabs.find(tab => tab.resourceTab === resourceTab) ?? targetTabs[0]

  useEffect(() => {
    if (!providersSuccess || !activeTargetTab) return
    if (activeTargetTab.resourceTab !== resourceTab || activeTargetTab.providerId !== providerId) {
      setResourceSource({
        resourceTab: activeTargetTab.resourceTab,
        providerId: activeTargetTab.providerId,
      })
    }
  }, [activeTargetTab, providerId, providersSuccess, resourceTab, setResourceSource])

  const tabs = (
    <Tabs
      items={targetTabs}
      value={activeTargetTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = targetTabs.find(tab => tab.value === value)
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
  const targetPageProps: SourceResourcesPageProps = {
    providers,
    providersPending: providersLoading || (!providersSuccess && providersError === null),
    providersSuccess,
    providersFetching,
    providersError: providersError instanceof Error ? providersError : null,
    onRefetchProviders: () => { void refetchProviders() },
    providerId: activeTargetTab?.providerId ?? null,
    tabs,
    t,
    role: 'target',
  }

  switch (resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage key={activeTargetTab?.value} {...targetPageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage key={activeTargetTab?.value} {...targetPageProps} />
    case 'vmware':
      return <VmwareResourcesPage key={activeTargetTab?.value} {...targetPageProps} />
  }
}
