import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { FilterIcon, SearchIcon } from '@/shared/icons/Icons'

interface ProvidersToolbarProps {
  search: string
  typeFilter: string
  types: string[]
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
}

export function ProvidersToolbar({ search, typeFilter, types, onSearchChange, onTypeChange }: ProvidersToolbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tempType, setTempType] = useState(typeFilter)

  const openModal = () => {
    setTempType(typeFilter)
    setIsModalOpen(true)
  }

  const applyFilters = () => {
    onTypeChange(tempType)
    setIsModalOpen(false)
  }

  const clearFilters = () => {
    onTypeChange('')
    setTempType('')
  }

  const typeTabs = [{ label: 'All', value: '' }, ...types.map((type) => ({ label: type, value: type }))]
  const activeFilterCount = typeFilter ? 1 : 0

  return (
    <div className="shrink-0 border-b border-[#e3edf6]">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          id="provider-search"
          aria-label="Search providers by name"
          className="lg:w-72"
          value={search}
          onChange={(event) => { onSearchChange(event.target.value) }}
          type="search"
          placeholder="Search by provider name"
          leadingIcon={<SearchIcon className="size-4" />}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" aria-label="Provider type filter">
            {typeTabs.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition sm:text-sm ${typeFilter === tab.value ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#71819a] hover:text-[#33425d]'}`}
                aria-pressed={typeFilter === tab.value}
                onClick={() => { onTypeChange(tab.value) }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" startIcon={<FilterIcon className="size-4" />} onClick={openModal} aria-expanded={isModalOpen}>
            Filters {activeFilterCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0d91d7] text-xs font-semibold text-white">{activeFilterCount}</span>}
          </Button>
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setIsModalOpen(false) }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-lg" onClick={(event) => { event.stopPropagation() }}>
            <div className="border-b border-[#e3edf6] px-6 py-4">
              <h2 className="text-base font-semibold text-[#17233d]">Filter providers</h2>
            </div>

            <div className="space-y-4 px-6 py-4">
              <Field label="Type" htmlFor="modal-type-filter">
                <Select id="modal-type-filter" value={tempType} onChange={(event) => { setTempType(event.target.value) }}>
                  <option value="">All types</option>
                  {types.map((type) => <option key={type} value={type}>{type}</option>)}
                </Select>
              </Field>
            </div>

            <div className="flex gap-3 border-t border-[#e3edf6] px-6 py-4">
              <Button size="sm" variant="ghost" onClick={() => { setIsModalOpen(false) }} className="flex-1">Cancel</Button>
              <Button size="sm" variant="ghost" onClick={clearFilters} className="flex-1">Clear all</Button>
              <Button size="sm" onClick={applyFilters} className="flex-1 bg-[#0d91d7] text-white">Apply</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
