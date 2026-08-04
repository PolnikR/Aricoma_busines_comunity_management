import type { ChangeEvent } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Select } from '@/shared/components/form/FormControls'
import { Pagination } from '@/shared/components/pagination/Pagination'

interface DataTablePaginationProps {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  disabled?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50],
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const { t } = useTranslation()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const handlePageSize = (event: ChangeEvent<HTMLSelectElement>) => { onPageSizeChange(Number(event.target.value)) }

  return (
    <div className="flex shrink-0 flex-col gap-4 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>{t('pagination.showing').replace('{start}', String(start)).replace('{end}', String(end)).replace('{total}', String(total))}</span>
        <label className="flex items-center gap-2">
          <span className="text-xs">{t('pagination.rows')}</span>
          <Select aria-label="Rows per page" className="h-9 w-20" value={pageSize} onChange={handlePageSize} disabled={disabled}>
            {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
          </Select>
        </label>
      </div>
      <Pagination page={page} pageCount={pageCount} disabled={disabled} onPageChange={onPageChange} />
    </div>
  )
}
