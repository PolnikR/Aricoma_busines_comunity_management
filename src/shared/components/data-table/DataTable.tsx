import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { SkeletonBlock } from './DataTableSkeleton'

export type TableDensity = 'comfortable' | 'compact'

export interface ColumnDef<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  hideInCompact?: boolean
  cellClassName?: string
}

const loadingWidths = ['w-24', 'w-16', 'w-20', 'w-28', 'w-14']

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string
  rowSelectionKey?: (row: T) => string
  rowAriaLabel?: (row: T) => string
  density?: TableDensity
  onRowClick?: (row: T) => void
  selectedRowKey?: string | null
  minWidthClassName?: string
  layout?: 'scroll' | 'fit'
  emptyContent?: ReactNode
  ariaLabel?: string
  headerCellClassName?: string
  cellClassName?: string
  isLoading?: boolean
  loadingRowCount?: number
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowSelectionKey,
  rowAriaLabel,
  density = 'compact',
  onRowClick,
  selectedRowKey = null,
  minWidthClassName = 'min-w-full',
  layout = 'scroll',
  emptyContent,
  ariaLabel = 'Data table',
  headerCellClassName,
  cellClassName,
  isLoading = false,
  loadingRowCount = 6,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) => !(density === 'compact' && column.hideInCompact))
  const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5'
  const isFitLayout = layout === 'fit'
  const headerCell = headerCellClassName ?? (isFitLayout
    ? 'whitespace-normal break-words px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
    : 'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle')
  const bodyCell = cellClassName ?? (isFitLayout
    ? `whitespace-normal break-words px-3 ${rowPad} text-[13px] text-text-secondary align-middle`
    : `px-4 ${rowPad} text-[13px] text-text-secondary align-middle`)
  const isInteractive = Boolean(onRowClick)

  return (
    <div
      className={isFitLayout
        ? 'w-full min-w-0 overflow-x-hidden'
        : 'custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain'}
      tabIndex={isFitLayout || isLoading ? undefined : 0}
      role={isLoading ? 'status' : undefined}
      aria-busy={isLoading ? true : undefined}
      aria-label={ariaLabel}
    >
      <Table className={isFitLayout ? 'w-full table-fixed' : minWidthClassName}>
        <TableHeader className="sticky top-0 z-10 border-b border-border bg-surface-subtle">
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell key={column.id} isHeader className={`${headerCell} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border" aria-hidden={isLoading ? true : undefined}>
          {isLoading ? (
            Array.from({ length: Math.max(1, loadingRowCount) }, (_, rowIndex) => (
              <TableRow key={rowIndex} className="bg-surface">
                {visibleColumns.map((column, columnIndex) => (
                  <TableCell
                    key={column.id}
                    className={`${bodyCell} ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.cellClassName ?? ''}`}
                  >
                    <SkeletonBlock className={`h-3.5 ${loadingWidths[(rowIndex + columnIndex) % loadingWidths.length] ?? 'w-20'}`} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length > 0 ? (
            rows.map((row, index) => {
              const key = rowKey(row, index)
              const selectionKey = rowSelectionKey?.(row) ?? key
              const isSelected = selectedRowKey === selectionKey
              return (
                <TableRow
                  key={key}
                  className={`outline-none transition-colors ${isInteractive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus' : ''} ${isSelected ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]' : 'bg-surface hover:bg-accent-soft'}`}
                  tabIndex={isInteractive ? 0 : undefined}
                  aria-label={rowAriaLabel?.(row)}
                  aria-selected={isInteractive ? isSelected : undefined}
                  onClick={isInteractive ? () => { onRowClick?.(row) } : undefined}
                  onKeyDown={isInteractive ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onRowClick?.(row)
                    }
                  } : undefined}
                >
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={`${bodyCell} ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.cellClassName ?? ''}`}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="px-4 py-8 text-center text-sm text-text-muted">
                {emptyContent ?? 'No records found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
