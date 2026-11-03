import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { useTranslation } from '@/hooks/useTranslation'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { formatResourceProviderId, type ResourceSourceTab, type ResourceSourceTabLabels } from '../helpers/buildResourceSourceTabs'
import { resolveVmwareProviderFilter } from '../helpers/vmwareProviderFilter'
import { VmwareProviderFilterSummary } from './vmware/VmwareProviderFilterSummary'

export interface ResourceViewNavigationProps {
  items: readonly ResourceSourceTab[]
  labels: ResourceSourceTabLabels
  value: string
  onChange: (value: string) => void
  selectedProvider?: ProviderRecord | null
}

export function ResourceViewNavigation({ items, labels, value, onChange, selectedProvider }: ResourceViewNavigationProps) {
  const { t } = useTranslation()
  const activeTab = items.find(tab => tab.value === value)
  const vmwareProvider = selectedProvider?.type === 'VMWARE'
    && activeTab?.resourceTab === 'vmware'
    && activeTab.providerId === selectedProvider.id
    ? selectedProvider
    : null
  const providerFilter = vmwareProvider ? resolveVmwareProviderFilter(vmwareProvider) : null

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      <div className="min-w-0 max-w-[44rem] flex-1 [&>div>button]:w-6 sm:[&>div>button]:w-9">
        <Tabs
          items={items.map(tab => ({
            value: tab.value,
            accessibleLabel: tab.label,
            label: (
              <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="min-w-0 max-w-full whitespace-normal text-left [overflow-wrap:anywhere]">{labels[tab.resourceTab]}</span>
                {tab.providerId ? (
                  <span className="no-scrollbar max-w-full shrink-0 overflow-x-auto rounded bg-surface-muted px-1 py-0.5 font-mono text-[10px] text-text-muted sm:max-w-28 sm:px-1.5 sm:text-[11px]">
                    {formatResourceProviderId(tab.resourceTab, tab.providerId)}
                  </span>
                ) : null}
              </span>
            ),
          }))}
          value={value}
          onChange={onChange}
          ariaLabel={t('pages.virtualMachines.tabs.label')}
          indicator="inset"
          appearance="embedded"
          compact
          className="[&>button]:!max-w-20 sm:[&>button]:!max-w-none"
          scrollControls={{
            previousLabel: t('pages.virtualMachines.tabs.previous'),
            nextLabel: t('pages.virtualMachines.tabs.next'),
          }}
        />
      </div>
      {vmwareProvider && providerFilter?.isFixed ? (
        <div className="ml-auto w-max min-w-0 max-w-[calc(100%-8.25rem)] shrink-0 sm:max-w-[50%]">
          <VmwareProviderFilterSummary
            providerId={vmwareProvider.id}
            filter={providerFilter}
            label={t('pages.virtualMachines.inventory.providerFilter')}
            nameLabel={t('pages.virtualMachines.inventory.namePrefix')}
            tagLabel={t('pages.virtualMachines.inventory.tags')}
          />
        </div>
      ) : null}
    </div>
  )
}
