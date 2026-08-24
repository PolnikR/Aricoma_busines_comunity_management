import type { ChangeEvent } from 'react'
import { Button } from '@/shared/components/button/Button'
import { CheckboxField, Input, Select } from '@/shared/components/form/FormControls'
import { FilterTabs } from '@/shared/components/filters/FilterTabs'
import { GridIcon, LayersIcon, SearchIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  InfrastructureTopologyFilterOptions,
  InfrastructureTopologyFilters,
} from '../model/filterInfrastructureTopology'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'
import type { FlashSystemVolumeTreeView } from '../model/flashSystemVolumeTreeTypes'

interface InfrastructureTopologyToolbarProps {
  platform: InfrastructureTopologyPlatform
  filters: InfrastructureTopologyFilters
  options: InfrastructureTopologyFilterOptions
  isLayouting: boolean
  flashSystemView?: FlashSystemVolumeTreeView | undefined
  onFiltersChange: (filters: InfrastructureTopologyFilters) => void
  onFlashSystemViewChange?: ((view: FlashSystemVolumeTreeView) => void) | undefined
  onAutoLayout: () => void
  onResetPositions: () => void
  onFitView: () => void
}

export function InfrastructureTopologyToolbar({
  platform,
  filters,
  options,
  isLayouting,
  flashSystemView,
  onFiltersChange,
  onFlashSystemViewChange,
  onAutoLayout,
  onResetPositions,
  onFitView,
}: InfrastructureTopologyToolbarProps) {
  const { t } = useTranslation()
  const powerTabs = [
    { label: t('topology.filters.all'), value: '' },
    { label: t('topology.filters.poweredOn'), value: 'poweredOn' },
    { label: t('topology.filters.poweredOff'), value: 'poweredOff' },
  ]
  const partitionTabs = [
    { label: t('topology.filters.all'), value: '' },
    { label: 'LPAR', value: 'LPAR' },
    { label: 'VIOS', value: 'VIOS' },
  ]
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value })
  }
  const handleHost = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, host: event.target.value })
  }
  const handleSystem = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, system: event.target.value })
  }
  const handlePartitionState = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, partitionState: event.target.value })
  }
  const isPower = platform === 'ibm-power'
  const isFlashSystem = platform === 'flashsystem'

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface p-3.5 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-[minmax(220px,1fr)_220px] xl:max-w-2xl">
        <Input
          aria-label={t('topology.searchLabel')}
          type="search"
          value={filters.search}
          onChange={handleSearch}
          placeholder={t(isPower ? 'topology.power.searchPlaceholder' : 'topology.searchPlaceholder')}
          leadingIcon={<SearchIcon className="size-4" />}
        />
        {isFlashSystem ? (
          <Select
            aria-label={t('topology.flashsystem.viewFilterLabel')}
            value={flashSystemView ?? 'flat'}
            onChange={(event) => {
              onFlashSystemViewChange?.(event.target.value as FlashSystemVolumeTreeView)
            }}
          >
            <option value="flat">{t('topology.flashsystem.viewFlat')}</option>
            <option value="snapshot">{t('topology.flashsystem.viewSnapshot')}</option>
            <option value="consistency_group">{t('topology.flashsystem.viewConsistencyGroup')}</option>
          </Select>
        ) : isPower ? (
          <Select aria-label={t('topology.power.systemFilterLabel')} value={filters.system} onChange={handleSystem}>
            <option value="">{t('topology.power.allSystems')}</option>
            {options.systems.map((system) => <option key={system} value={system}>{system}</option>)}
          </Select>
        ) : (
          <Select aria-label={t('topology.hostFilterLabel')} value={filters.host} onChange={handleHost}>
            <option value="">{t('topology.filters.allHosts')}</option>
            {options.hosts.map((host) => <option key={host} value={host}>{host}</option>)}
          </Select>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        {isFlashSystem ? null : isPower ? (
          <>
            <Select
              aria-label={t('topology.power.partitionStateFilterLabel')}
              value={filters.partitionState}
              onChange={handlePartitionState}
              className="w-44"
            >
              <option value="">{t('resources.power.filters.allStates')}</option>
              {options.partitionStates.map((state) => <option key={state} value={state}>{state}</option>)}
            </Select>
            <FilterTabs
              tabs={partitionTabs}
              value={filters.partitionKind}
              ariaLabel={t('topology.power.partitionKindFilterLabel')}
              onChange={(partitionKind) => {
                onFiltersChange({ ...filters, partitionKind })
              }}
            />
          </>
        ) : (
          <>
            <FilterTabs
              tabs={powerTabs}
              value={filters.powerState}
              ariaLabel={t('topology.powerFilterLabel')}
              onChange={(powerState) => {
                onFiltersChange({ ...filters, powerState })
              }}
            />
            <CheckboxField
              label={t('topology.filters.datastores')}
              variant="bordered"
              checked={filters.showDatastores}
              onChange={(event) => {
                onFiltersChange({ ...filters, showDatastores: event.target.checked })
              }}
            />
          </>
        )}

        <Button
          size="sm"
          variant="outline"
          startIcon={<LayersIcon className="size-4" />}
          disabled={isLayouting}
          onClick={onAutoLayout}
        >
          {isLayouting ? t('topology.layouting') : t('topology.autoLayout')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isLayouting}
          onClick={onResetPositions}
        >
          {t('topology.resetPositions')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          startIcon={<GridIcon className="size-4" />}
          onClick={onFitView}
        >
          {t('topology.fitView')}
        </Button>
      </div>
    </div>
  )
}
