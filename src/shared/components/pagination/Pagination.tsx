import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/icons/Icons'

interface PaginationProps {
  page: number
  pageCount: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

function getPageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const items: PageItem[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) items.push('ellipsis-start')
  for (let value = start; value <= end; value += 1) items.push(value)
  if (end < pageCount - 1) items.push('ellipsis-end')
  items.push(pageCount)
  return items
}

export function Pagination({ page, pageCount, disabled = false, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null

  return (
    <nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label="Virtual machines pagination">
      <button type="button" className="flex size-9 items-center justify-center rounded-xl border border-[#cfdfef] bg-white text-[#66758f] shadow-sm transition hover:bg-[#f2f8ff] hover:text-[#087fca] disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled || page <= 1} aria-label="Previous page" onClick={() => { onPageChange(page - 1) }}>
        <ChevronLeftIcon className="size-5" />
      </button>
      <span className="text-sm font-medium text-[#5f6f88] sm:hidden">Page {page} of {pageCount}</span>
      <ul className="hidden items-center gap-1 sm:flex">
        {getPageItems(page, pageCount).map((item) => (
          <li key={item}>
            {typeof item === 'number' ? (
              <button type="button" className={`flex size-9 items-center justify-center rounded-xl text-sm font-medium transition ${item === page ? 'bg-[#1268f3] text-white shadow-sm' : 'text-[#66758f] hover:bg-[#edf7ff] hover:text-[#087fca]'}`} aria-label={`Page ${String(item)}`} aria-current={item === page ? 'page' : undefined} disabled={disabled} onClick={() => { onPageChange(item) }}>
                {item}
              </button>
            ) : <span className="flex size-10 items-center justify-center text-sm text-gray-400" aria-hidden="true">...</span>}
          </li>
        ))}
      </ul>
      <button type="button" className="flex size-9 items-center justify-center rounded-xl border border-[#cfdfef] bg-white text-[#66758f] shadow-sm transition hover:bg-[#f2f8ff] hover:text-[#087fca] disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled || page >= pageCount} aria-label="Next page" onClick={() => { onPageChange(page + 1) }}>
        <ChevronRightIcon className="size-5" />
      </button>
    </nav>
  )
}
