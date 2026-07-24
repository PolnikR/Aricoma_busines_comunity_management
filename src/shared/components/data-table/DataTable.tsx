import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'

export type TableDensity = 'comfortable' | 'compact'

export interface ColumnDef<T> {
  id: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  hideInCompact?: boolean
  cellClassName?: string
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  density?: TableDensity
  onRowClick?: (row: T) => void
  selectedRowKey?: string | null
  minWidthClassName?: string
  emptyContent?: ReactNode
  ariaLabel?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  density = 'compact',
  onRowClick,
  selectedRowKey = null,
  minWidthClassName = 'min-w-full',
  emptyContent,
  ariaLabel = 'Data table',
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) => !(density === 'compact' && column.hideInCompact))
  const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5'
  const headerCell = 'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]'
  const isInteractive = Boolean(onRowClick)

  return (
    <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label={ariaLabel}>
      <Table className={minWidthClassName}>
        <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
          <TableRow>
            {visibleColumns.map((column) => (
              <TableCell key={column.id} isHeader className={`${headerCell} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#edf2f7]">
          {rows.length > 0 ? (
            rows.map((row) => {
              const key = rowKey(row)
              const isSelected = selectedRowKey === key
              return (
                <TableRow
                  key={key}
                  className={`outline-none transition-colors ${isInteractive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1596dd]' : ''} ${isSelected ? 'bg-[#e8f4fd] shadow-[inset_3px_0_0_#0d91d7]' : 'bg-white hover:bg-[#f3f8fe]'}`}
                  tabIndex={isInteractive ? 0 : undefined}
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
                      className={`px-4 ${rowPad} text-[13px] text-[#3b4763] align-middle ${column.align === 'right' ? 'text-right tabular-nums' : ''} ${column.cellClassName ?? ''}`}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={visibleColumns.length} className="px-4 py-8 text-center text-sm text-[#71819a]">
                {emptyContent ?? 'No records found'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
