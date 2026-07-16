import type { ChangeEvent } from 'react'
import type { VirtualMachineFilters } from '../types'

interface VirtualMachinesToolbarProps {
  filters: VirtualMachineFilters
  clusters: string[]
  onFiltersChange: (filters: VirtualMachineFilters) => void
}

export function VirtualMachinesToolbar({ filters, clusters, onFiltersChange }: VirtualMachinesToolbarProps) {
  const updateFilter = (key: keyof VirtualMachineFilters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFiltersChange({ ...filters, [key]: event.target.value })
  }

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 dark:border-gray-800 md:grid-cols-2 xl:grid-cols-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
        <input
          value={filters.search}
          onChange={updateFilter('search')}
          type="search"
          placeholder="Name, hostname or IP"
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Power state</span>
        <select value={filters.powerState} onChange={updateFilter('powerState')} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
          <option value="">All states</option>
          <option value="poweredOn">poweredOn</option>
          <option value="poweredOff">poweredOff</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Connection</span>
        <select value={filters.connectionState} onChange={updateFilter('connectionState')} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
          <option value="">All connections</option>
          <option value="connected">connected</option>
          <option value="disconnected">disconnected</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cluster</span>
        <select value={filters.cluster} onChange={updateFilter('cluster')} className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90">
          <option value="">All clusters</option>
          {clusters.map((cluster) => (
            <option key={cluster} value={cluster}>{cluster}</option>
          ))}
        </select>
      </label>
    </div>
  )
}