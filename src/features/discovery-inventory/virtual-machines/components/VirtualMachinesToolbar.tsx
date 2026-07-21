import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { FilterIcon, SearchIcon } from '@/shared/icons/Icons'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../types'

interface VirtualMachinesToolbarProps {
  filters: VirtualMachineFilters
  options: VirtualMachineFilterOptions
  availableTags?: string[]
  onFiltersChange: (filters: VirtualMachineFilters) => void
  onReset: () => void
}

const powerTabs = [
  { label: 'All', value: '' },
  { label: 'Powered on', value: 'poweredOn' },
  { label: 'Powered off', value: 'poweredOff' },
]

export function VirtualMachinesToolbar({ filters, options, availableTags = [], onFiltersChange, onReset }: VirtualMachinesToolbarProps) {
  const [showFilters, setShowFilters] = useState(false)
  const updateFilter = (key: keyof VirtualMachineFilters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFiltersChange({ ...filters, [key]: event.target.value })
  }
  const updateTags = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value)
    onFiltersChange({ ...filters, tags: selectedValues })
  }

  return (
    <div className="shrink-0 border-b border-[#e3edf6]">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Input id="vm-search" aria-label="Search virtual machines" className="lg:w-72" value={filters.search} onChange={updateFilter('search')} type="search" placeholder="Search name, hostname or IP" leadingIcon={<SearchIcon className="size-4" />} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" aria-label="Power state filter">
            {powerTabs.map((tab) => (
              <button key={tab.value || 'all'} type="button" className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition sm:text-sm ${filters.powerState === tab.value ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#71819a] hover:text-[#33425d]'}`} aria-pressed={filters.powerState === tab.value} onClick={() => { onFiltersChange({ ...filters, powerState: tab.value }) }}>
                {tab.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" startIcon={<FilterIcon className="size-4" />} onClick={() => { setShowFilters((value) => !value) }} aria-expanded={showFilters}>
            Filters
          </Button>
        </div>
      </div>

      {showFilters ? (
        <div className="grid grid-cols-1 gap-3 border-t border-[#e7eff7] bg-[#f8fbfe] p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label="Connection" htmlFor="connection-filter">
            <Select id="connection-filter" value={filters.connectionState} onChange={updateFilter('connectionState')}>
              <option value="">All connections</option>
              {options.connectionStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Cluster" htmlFor="cluster-filter">
            <Select id="cluster-filter" value={filters.cluster} onChange={updateFilter('cluster')}>
              <option value="">All clusters</option>
              {options.clusters.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>
          <Field label="Tags" htmlFor="tags-filter">
            <Select id="tags-filter" multiple value={filters.tags} onChange={updateTags} style={{ minHeight: '40px' }}>
              {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </Select>
          </Field>
          <Button size="sm" variant="ghost" onClick={onReset}>Clear filters</Button>
        </div>
      ) : null}
    </div>
  )
}
