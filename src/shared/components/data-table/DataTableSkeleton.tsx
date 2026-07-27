import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { cn } from '@/shared/utils/cn'

interface DataTableSkeletonProps {
  columnCount: number
  rowCount?: number
  ariaLabel?: string
  showToolbar?: boolean
  showPagination?: boolean
  className?: string
}

const widths = ['w-24', 'w-16', 'w-20', 'w-28', 'w-14']

function SkeletonBlock({ className }: { className: string }) {
  return <span className={cn('block animate-pulse rounded-md bg-[#e8eff6]', className)} />
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 6,
  ariaLabel = 'Loading table data',
  showToolbar = true,
  showPagination = true,
  className,
}: DataTableSkeletonProps) {
  const columns = Array.from({ length: Math.max(1, columnCount) })
  const rows = Array.from({ length: Math.max(1, rowCount) })

  return (
    <section
      className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm', className)}
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      {showToolbar ? (
        <div className="shrink-0 border-b border-[#e3edf6]" aria-hidden="true">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <SkeletonBlock className="h-10 w-full rounded-xl lg:w-72" />
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-40 rounded-xl sm:w-56" />
              <SkeletonBlock className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="custom-scrollbar w-full min-w-0 flex-1 touch-pan-x overflow-x-auto overscroll-x-contain"
        aria-hidden="true"
      >
        <Table className="min-w-190">
          <TableHeader className="border-b border-[#dfe9f3] bg-[#f6f9fc]">
            <TableRow>
              {columns.map((_, columnIndex) => (
                <TableCell
                  key={columnIndex}
                  isHeader
                  className="whitespace-nowrap px-4 py-2.5 text-left"
                >
                  <SkeletonBlock className={cn('h-3', widths[columnIndex % widths.length])} />
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#edf2f7]">
            {rows.map((_, rowIndex) => (
              <TableRow key={rowIndex} className="bg-white">
                {columns.map((__, columnIndex) => (
                  <TableCell key={columnIndex} className="px-4 py-3 align-middle">
                    <div className="space-y-2">
                      <SkeletonBlock className={cn('h-3.5', widths[(rowIndex + columnIndex) % widths.length])} />
                      {columnIndex === 0 ? (
                        <SkeletonBlock className={cn('h-2.5', widths[(rowIndex + columnIndex + 2) % widths.length])} />
                      ) : null}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {showPagination ? (
        <div
          className="flex shrink-0 flex-col gap-4 border-t border-[#e3edf6] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-3.5 w-32" />
            <SkeletonBlock className="h-9 w-20 rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="size-9 rounded-lg" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
