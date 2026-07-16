import type { ChangeEvent } from 'react'
import { Select } from '@/shared/components/form/FormControls'
import { Pagination } from '@/shared/components/pagination/Pagination'
import type { VirtualMachinePageSize, VirtualMachinesPageData } from '../types'

interface VirtualMachinesPaginationProps {
  data: VirtualMachinesPageData
  disabled?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: VirtualMachinePageSize) => void
}

export function VirtualMachinesPagination({ data, disabled = false, onPageChange, onPageSizeChange }: VirtualMachinesPaginationProps) {
  const start = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const end = Math.min(data.page * data.pageSize, data.total)
  const handlePageSize = (event: ChangeEvent<HTMLSelectElement>) => { onPageSizeChange(Number(event.target.value) as VirtualMachinePageSize) }

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t border-[#e3edf6] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span>Showing <strong className="font-medium text-gray-800 dark:text-white/90">{start}-{end}</strong> of <strong className="font-medium text-gray-800 dark:text-white/90">{data.total}</strong></span>
        <label className="flex items-center gap-2">
          <span className="text-xs">Rows</span>
          <Select aria-label="Rows per page" className="h-9 w-20" value={data.pageSize} onChange={handlePageSize} disabled={disabled}>
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </Select>
        </label>
      </div>
      <Pagination page={data.page} pageCount={data.pageCount} disabled={disabled} onPageChange={onPageChange} />
    </div>
  )
}
