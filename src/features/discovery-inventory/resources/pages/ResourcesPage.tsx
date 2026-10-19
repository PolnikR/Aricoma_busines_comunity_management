import { useMemo } from 'react'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { selectProviders } from '@/features/providers-connectors/providers/model/selectProviders'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { buildResourceSourceTabs, formatResourceProviderId, resolveActiveResourceTab } from '../helpers/buildResourceSourceTabs'
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
    <Tabs
      items={visibleRoleTabs.map((tab) => ({
        ...tab,
        accessibleLabel: tab.label,
        label: (
          <span className="inline-flex items-center gap-2">
            <span>{resourceTabLabels[tab.resourceTab]}</span>
            {tab.providerId ? <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-text-muted">{formatResourceProviderId(tab.resourceTab, tab.providerId)}</span> : null}
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
