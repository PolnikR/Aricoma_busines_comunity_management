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
    <div className="flex min-w-0 items-center gap-3 [--tab-slot-width:9rem] 2xl:[--tab-slot-width:10rem]">
      <div className="min-w-0 flex-initial">
        <Tabs
          items={items.map(tab => ({
            value: tab.value,
            accessibleLabel: tab.label,
            label: (
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 truncate">{labels[tab.resourceTab]}</span>
                {tab.providerId ? (
                  <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-text-muted">
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
          maxVisibleItems={4}
          scrollControls={{
            previousLabel: t('pages.virtualMachines.tabs.previous'),
            nextLabel: t('pages.virtualMachines.tabs.next'),
          }}
        />
      </div>
      {vmwareProvider && providerFilter?.isFixed ? (
        <div className="ml-auto w-1/2 min-w-0 max-w-[17rem] shrink-0">
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
