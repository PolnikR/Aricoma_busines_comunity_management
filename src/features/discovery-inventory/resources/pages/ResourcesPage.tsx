import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import { FlashSystemResourcesPage } from '../components/flash-system/FlashSystemResourcesPage'
import { IbmPowerResourcesPage } from '../components/ibm-power/IbmPowerResourcesPage'
import type { SourceResourcesPageProps } from '../components/SourceResourcesPageProps'
import { VmwareResourcesPage } from '../components/vmware/VmwareResourcesPage'
import { useResourceTabSearchParam } from '../hooks/useResourceTabSearchParam'

export function ResourcesPage() {
  const { t } = useTranslation()
  const { resourceTab, setResourceTab } = useResourceTabSearchParam()
  const {
    data: providers = [],
    error: providersError,
    isLoading: providersLoading,
    isSuccess: providersSuccess,
    isFetching: providersFetching,
    refetch: refetchProviders,
  } = useProviders()
  const tabs = (
    <Tabs
      items={[
        { value: 'vmware', label: t('pages.virtualMachines.tabs.vmware') },
        { value: 'flashsystem', label: t('pages.virtualMachines.tabs.flashSystem') },
        { value: 'ibm-power', label: t('pages.virtualMachines.tabs.ibmPower') },
      ]}
      value={resourceTab}
      onChange={setResourceTab}
      ariaLabel={t('pages.virtualMachines.tabs.label')}
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
    tabs,
    t,
  }

  switch (resourceTab) {
    case 'flashsystem':
      return <FlashSystemResourcesPage {...sourcePageProps} />
    case 'ibm-power':
      return <IbmPowerResourcesPage {...sourcePageProps} />
    case 'vmware':
      return <VmwareResourcesPage {...sourcePageProps} />
  }
}
