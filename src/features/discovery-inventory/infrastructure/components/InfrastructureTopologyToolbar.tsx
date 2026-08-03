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

interface InfrastructureTopologyToolbarProps {
  filters: InfrastructureTopologyFilters
  options: InfrastructureTopologyFilterOptions
  isLayouting: boolean
  onFiltersChange: (filters: InfrastructureTopologyFilters) => void
  onAutoLayout: () => void
  onResetPositions: () => void
  onFitView: () => void
}

export function InfrastructureTopologyToolbar({
  filters,
  options,
  isLayouting,
  onFiltersChange,
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
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value })
  }
  const handleHost = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, host: event.target.value })
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface p-3.5 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-[minmax(220px,1fr)_220px] xl:max-w-2xl">
        <Input
          aria-label={t('topology.searchLabel')}
          type="search"
          value={filters.search}
          onChange={handleSearch}
          placeholder={t('topology.searchPlaceholder')}
          leadingIcon={<SearchIcon className="size-4" />}
        />
        <Select aria-label={t('topology.hostFilterLabel')} value={filters.host} onChange={handleHost}>
          <option value="">{t('topology.filters.allHosts')}</option>
          {options.hosts.map((host) => <option key={host} value={host}>{host}</option>)}
        </Select>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
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
