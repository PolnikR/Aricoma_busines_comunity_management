import type { ChangeEvent } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Input, Select } from '@/shared/components/form/FormControls'
import { GridIcon, LayersIcon, SearchIcon } from '@/shared/icons/Icons'
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

const powerTabs = [
  { label: 'All', value: '' },
  { label: 'Powered on', value: 'poweredOn' },
  { label: 'Powered off', value: 'poweredOff' },
]

export function InfrastructureTopologyToolbar({
  filters,
  options,
  isLayouting,
  onFiltersChange,
  onAutoLayout,
  onResetPositions,
  onFitView,
}: InfrastructureTopologyToolbarProps) {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: event.target.value })
  }
  const handleHost = (event: ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, host: event.target.value })
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[#e3edf6] bg-white p-3.5 xl:flex-row xl:items-center xl:justify-between">
      <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-[minmax(220px,1fr)_220px] xl:max-w-2xl">
        <Input
          aria-label="Search infrastructure topology"
          type="search"
          value={filters.search}
          onChange={handleSearch}
          placeholder="Search VM, host, cluster or datastore"
          leadingIcon={<SearchIcon className="size-4" />}
        />
        <Select aria-label="Filter topology by host" value={filters.host} onChange={handleHost}>
          <option value="">All hosts</option>
          {options.hosts.map((host) => <option key={host} value={host}>{host}</option>)}
        </Select>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <div className="flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" aria-label="Power state filter">
          {powerTabs.map((tab) => (
            <button
              key={tab.value || 'all'}
              type="button"
              className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition ${
                filters.powerState === tab.value
                  ? 'bg-white text-[#087fca] shadow-sm'
                  : 'text-[#71819a] hover:text-[#33425d]'
              }`}
              aria-pressed={filters.powerState === tab.value}
              onClick={() => {
                onFiltersChange({ ...filters, powerState: tab.value })
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#cfdaea] bg-white px-3 text-xs font-medium text-[#52627a] shadow-sm">
          <input
            type="checkbox"
            className="size-4 accent-[#1268f3]"
            checked={filters.showDatastores}
            onChange={(event) => {
              onFiltersChange({ ...filters, showDatastores: event.target.checked })
            }}
          />
          Datastores
        </label>

        <Button
          size="sm"
          variant="outline"
          startIcon={<LayersIcon className="size-4" />}
          disabled={isLayouting}
          onClick={onAutoLayout}
        >
          {isLayouting ? 'Layouting' : 'Auto layout'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onResetPositions}
        >
          Reset positions
        </Button>
        <Button
          size="sm"
          variant="ghost"
          startIcon={<GridIcon className="size-4" />}
          onClick={onFitView}
        >
          Fit view
        </Button>
      </div>
    </div>
  )
}
