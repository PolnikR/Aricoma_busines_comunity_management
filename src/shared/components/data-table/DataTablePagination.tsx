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
  isLoading?: boolean
  paginationAriaLabel?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 25, 50],
  disabled = false,
  isLoading = false,
  paginationAriaLabel,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const { t } = useTranslation()
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  const handlePageSize = (event: ChangeEvent<HTMLSelectElement>) => { onPageSizeChange(Number(event.target.value)) }
  const canChangePageSize = pageSizeOptions.length > 1
  const controlsDisabled = disabled || isLoading
  const summary = t('pagination.showing')
  const summaryParts = summary.split(/(\{start\}|\{end\}|\{total\})/)

  return (
    <div
      className="flex shrink-0 flex-col gap-4 border-t border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-busy={isLoading ? true : undefined}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span>
          {isLoading
            ? summaryParts.map((part, index) => (
                part.startsWith('{')
                  ? <span key={index} className="inline-block h-3.5 w-8 animate-pulse rounded bg-surface-muted align-middle" aria-hidden="true" />
                  : part
              ))
            : summary.replace('{start}', String(start)).replace('{end}', String(end)).replace('{total}', String(total))}
        </span>
        {canChangePageSize ? (
          <label className="flex items-center gap-2">
            <span className="text-xs">{t('pagination.rows')}</span>
            <Select aria-label="Rows per page" className="h-9 w-20" value={pageSize} onChange={handlePageSize} disabled={controlsDisabled}>
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </Select>
          </label>
        ) : null}
      </div>
      <Pagination
        page={page}
        pageCount={pageCount}
        disabled={controlsDisabled}
        isLoading={isLoading}
        {...(paginationAriaLabel ? { ariaLabel: paginationAriaLabel } : {})}
        onPageChange={onPageChange}
      />
    </div>
  )
}
