import { useLayoutEffect, useRef, useState } from 'react'
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

// Column header typography, shared with tables that pass their own headerCellClassName.
// Secondary text at 80% keeps 12px labels above 4.5:1 on the header background.
export const DATA_TABLE_HEADER_TEXT = 'text-xs font-medium text-text-secondary/80'

const fillerLineColor = 'color-mix(in srgb, var(--color-border) 60%, transparent)'

// Faint lines below the last row, so a short table keeps its rhythm down to the footer. Rows
// size to their content, so the spacing is the measured pitch between the last two rows (one
// row plus its divider). The first line closes the last row, which has no bottom border.
function DataTableFiller() {
  const ref = useRef<HTMLDivElement>(null)
  const [rowHeight, setRowHeight] = useState(0)

  useLayoutEffect(() => {
    const lastRow = ref.current?.previousElementSibling?.querySelector('tbody > tr:last-child')
    if (!lastRow) return
    const measure = () => {
      const last = lastRow.getBoundingClientRect()
      const previous = lastRow.previousElementSibling?.getBoundingClientRect()
      setRowHeight(Math.round(previous ? last.top - previous.top : last.height + 1))
    }
    measure()
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    resizeObserver?.observe(lastRow)
    return () => { resizeObserver?.disconnect() }
  })

  return (
    <div
      ref={ref}
      data-table-filler=""
      aria-hidden="true"
      // Sticky so the lines stay under the visible columns while the table scrolls sideways.
      className="sticky left-0 w-full flex-1"
      style={rowHeight > 0
        ? { backgroundImage: `repeating-linear-gradient(to bottom, ${fillerLineColor} 0 1px, transparent 1px ${String(rowHeight)}px)` }
        : undefined}
    />
  )
}

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
    ? `whitespace-normal break-words px-2 @min-[80rem]/data-table:px-3 py-2.5 text-left ${DATA_TABLE_HEADER_TEXT}`
    : `whitespace-nowrap px-2 @min-[80rem]/data-table:px-4 py-2.5 text-left ${DATA_TABLE_HEADER_TEXT}`)
  const bodyCell = cellClassName ?? (isFitLayout
    ? `whitespace-normal break-words px-2 @min-[80rem]/data-table:px-3 ${rowPad} text-[12px] @min-[80rem]/data-table:text-[13px] text-text-secondary align-middle`
    : `px-2 @min-[80rem]/data-table:px-4 ${rowPad} text-[12px] @min-[80rem]/data-table:text-[13px] text-text-secondary align-middle`)
  const isInteractive = Boolean(onRowClick)

  return (
    <div
      // flex-1 + flex-col lets the filler take the rest of a flex parent (DataTableSurface);
      // elsewhere the filler has no height and the table renders as before.
      className={isFitLayout
        ? '@container/data-table flex w-full min-w-0 flex-1 flex-col overflow-x-hidden'
        : '@container/data-table custom-scrollbar flex w-full min-w-0 flex-1 touch-pan-x flex-col overflow-x-auto overscroll-x-contain'}
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
                  className={`outline-none transition-colors ${isInteractive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus' : ''} ${isSelected ? 'bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]' : 'bg-surface hover:bg-surface-subtle'}`}
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
      {!isLoading && rows.length > 0 ? <DataTableFiller /> : null}
    </div>
  )
}
