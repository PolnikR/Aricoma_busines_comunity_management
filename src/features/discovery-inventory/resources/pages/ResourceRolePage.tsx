import { useEffect, useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import type { ProviderRole } from '@/features/providers-connectors/providers/model/providerTypes'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { buildResourceTabsByRole } from '../helpers/buildResourceSourceTabs'
import { VmwareResourcesPage } from '../components/vmware/VmwareResourcesPage'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'

interface ResourceRolePageProps {
  role: ProviderRole
}

export function ResourceRolePage({ role }: ResourceRolePageProps) {
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
    () => buildResourceTabsByRole(providers, {
      vmware: t('pages.virtualMachines.tabs.vmware'),
      flashsystem: t('pages.virtualMachines.tabs.flashSystem'),
      'ibm-power': t('pages.virtualMachines.tabs.ibmPower'),
    }, role),
    [providers, role, t],
  )
  const activeRoleTab = roleTabs.find(
    tab => tab.resourceTab === resourceTab && tab.providerId === providerId,
  ) ?? roleTabs.find(tab => tab.resourceTab === resourceTab) ?? roleTabs[0]

  useEffect(() => {
    if (!providersSuccess || !activeRoleTab) return
    if (activeRoleTab.resourceTab !== resourceTab || activeRoleTab.providerId !== providerId) {
      setResourceSource({
        resourceTab: activeRoleTab.resourceTab,
        providerId: activeRoleTab.providerId,
      })
    }
  }, [activeRoleTab, providerId, providersSuccess, resourceTab, setResourceSource])

  const tabs = (
    <Tabs
      items={roleTabs}
      value={activeRoleTab?.value ?? 'vmware:none'}
      onChange={(value) => {
        const nextTab = roleTabs.find(tab => tab.value === value)
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
    providerId: activeRoleTab?.providerId ?? null,
    tabs,
    t,
    role,
  }

  switch (resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage key={activeRoleTab?.value} {...rolePageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage key={activeRoleTab?.value} {...rolePageProps} />
    case 'vmware':
      return <VmwareResourcesPage key={activeRoleTab?.value} {...rolePageProps} />
  }
}
