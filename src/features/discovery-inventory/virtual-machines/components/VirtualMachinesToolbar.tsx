import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { FilterIcon, SearchIcon } from '@/shared/icons/Icons'
import { RowDensityToggle, type TableDensity } from '@/shared/components/table'
import type { ProviderRecord } from '@/features/api/providersApi'
import { FilterPanelSkeleton } from '../skeletons'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../types'

interface VirtualMachinesToolbarProps {
  filters: VirtualMachineFilters
  options: VirtualMachineFilterOptions
  availableTags?: string[]
  providers?: ProviderRecord[]
  providersLoading?: boolean
  onFiltersChange: (filters: VirtualMachineFilters) => void
  onReset: () => void
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
}

const powerTabs = [
  { label: 'All', value: '' },
  { label: 'Powered on', value: 'poweredOn' },
  { label: 'Powered off', value: 'poweredOff' },
]

export function VirtualMachinesToolbar({ filters, options, availableTags = [], providers = [], providersLoading = false, onFiltersChange, onReset, density, onDensityChange }: VirtualMachinesToolbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState(filters)

  const openModal = () => {
    setTempFilters(filters)
    setIsModalOpen(true)
  }

  const updateTempFilter = (key: keyof VirtualMachineFilters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTempFilters({ ...tempFilters, [key]: event.target.value })
  }

  const updateTempTag = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setTempFilters({ ...tempFilters, tags: value ? [value] : [], untagged: false })
  }

  const toggleTempUntagged = () => {
    setTempFilters({ ...tempFilters, untagged: !tempFilters.untagged, tags: [] })
  }

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters)
    setIsModalOpen(false)
  }

  const handleResetFilters = () => {
    onReset()
    setTempFilters(filters)
  }

  const activeFilterCount = [
    filters.search,
    filters.powerState,
    filters.connectionState,
    filters.cluster,
    filters.providerId,
    filters.tags.length > 0 ? 'tags' : '',
    filters.untagged ? 'untagged' : '',
  ].filter(Boolean).length

  return (
    <div className="shrink-0 border-b border-[#e3edf6]">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Input id="vm-search" aria-label="Search virtual machines" className="lg:w-72" value={filters.search} onChange={(e) => { onFiltersChange({ ...filters, search: e.target.value }) }} type="search" placeholder="Search name, hostname or IP" leadingIcon={<SearchIcon className="size-4" />} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" aria-label="Power state filter">
            {powerTabs.map((tab) => (
              <button key={tab.value || 'all'} type="button" className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition sm:text-sm ${filters.powerState === tab.value ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#71819a] hover:text-[#33425d]'}`} aria-pressed={filters.powerState === tab.value} onClick={() => { onFiltersChange({ ...filters, powerState: tab.value }) }}>
                {tab.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" startIcon={<FilterIcon className="size-4" />} onClick={openModal} aria-expanded={isModalOpen}>
            Filters {activeFilterCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0d91d7] text-xs font-semibold text-white">{activeFilterCount}</span>}
          </Button>
          {density && onDensityChange ? (
            <RowDensityToggle density={density} onDensityChange={onDensityChange} />
          ) : null}
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setIsModalOpen(false) }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-lg" onClick={(e) => { e.stopPropagation() }}>
            <div className="border-b border-[#e3edf6] px-6 py-4">
              <h2 className="text-base font-semibold text-[#17233d]">Filter Virtual Machines</h2>
            </div>

            {providersLoading ? (
              <FilterPanelSkeleton />
            ) : (
              <div className="space-y-4 px-6 py-4">
                <Field label="Connection" htmlFor="modal-connection-filter">
                  <Select id="modal-connection-filter" value={tempFilters.connectionState} onChange={updateTempFilter('connectionState')}>
                    <option value="">All connections</option>
                    {options.connectionStates.map((value) => <option key={value} value={value}>{value}</option>)}
                  </Select>
                </Field>

                <Field label="Cluster" htmlFor="modal-cluster-filter">
                  <Select id="modal-cluster-filter" value={tempFilters.cluster} onChange={updateTempFilter('cluster')}>
                    <option value="">All clusters</option>
                    {options.clusters.map((value) => <option key={value} value={value}>{value}</option>)}
                  </Select>
                </Field>

                <Field label="Provider" htmlFor="modal-provider-filter">
                  <Select id="modal-provider-filter" value={tempFilters.providerId} onChange={updateTempFilter('providerId')}>
                    <option value="">All providers</option>
                    {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
                  </Select>
                </Field>

                <Field label="Tag" htmlFor="modal-tag-filter">
                  <Select id="modal-tag-filter" value={tempFilters.tags[0] ?? ''} onChange={updateTempTag}>
                    <option value="">All tags</option>
                    {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                  </Select>
                </Field>

                <label className="flex items-center gap-3 cursor-pointer pt-2">
                  <input type="checkbox" checked={tempFilters.untagged} onChange={toggleTempUntagged} className="rounded border-[#cfdaea]" />
                  <span className="text-sm font-medium text-[#273750]">Show only VMs without tags</span>
                </label>
              </div>
            )}

            <div className="flex gap-3 border-t border-[#e3edf6] px-6 py-4">
              <Button size="sm" variant="ghost" onClick={() => { setIsModalOpen(false) }} className="flex-1">Cancel</Button>
              <Button size="sm" variant="ghost" onClick={handleResetFilters} className="flex-1">Clear all</Button>
              <Button size="sm" onClick={handleApplyFilters} className="flex-1 bg-[#0d91d7] text-white">Apply</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
