import { ChevronLeftIcon, ChevronRightIcon } from '@/shared/icons/Icons'

interface PaginationProps {
  page: number
  pageCount: number
  disabled?: boolean
  isLoading?: boolean
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

export function Pagination({ page, pageCount, disabled = false, isLoading = false, onPageChange }: PaginationProps) {
  if (pageCount <= 1 && !isLoading) return null

  return (
    <nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label="Virtual machines pagination">
      <button type="button" className="flex size-9 items-center justify-center rounded-xl border border-border-strong bg-surface text-text-muted shadow-sm transition hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled || isLoading || page <= 1} aria-label="Previous page" onClick={() => { onPageChange(page - 1) }}>
        <ChevronLeftIcon className="size-5" />
      </button>
      <span className="text-sm font-medium text-text-muted sm:hidden">
        Page {isLoading ? <span className="inline-block h-3.5 w-5 animate-pulse rounded bg-surface-muted align-middle" aria-hidden="true" /> : page}
        {' '}of{' '}
        {isLoading ? <span className="inline-block h-3.5 w-5 animate-pulse rounded bg-surface-muted align-middle" aria-hidden="true" /> : pageCount}
      </span>
      <ul className="hidden items-center gap-1 sm:flex">
        {isLoading ? Array.from({ length: 4 }, (_, index) => (
          <li key={index}>
            <span className="block size-9 animate-pulse rounded-xl bg-surface-muted" aria-hidden="true" />
          </li>
        )) : getPageItems(page, pageCount).map((item) => (
          <li key={item}>
            {typeof item === 'number' ? (
              <button type="button" className={`flex size-9 items-center justify-center rounded-xl text-sm font-medium transition ${item === page ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:bg-accent-soft hover:text-accent'}`} aria-label={`Page ${String(item)}`} aria-current={item === page ? 'page' : undefined} disabled={disabled} onClick={() => { onPageChange(item) }}>
                {item}
              </button>
            ) : <span className="flex size-10 items-center justify-center text-sm text-text-subtle" aria-hidden="true">...</span>}
          </li>
        ))}
      </ul>
      <button type="button" className="flex size-9 items-center justify-center rounded-xl border border-border-strong bg-surface text-text-muted shadow-sm transition hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-40" disabled={disabled || isLoading || page >= pageCount} aria-label="Next page" onClick={() => { onPageChange(page + 1) }}>
        <ChevronRightIcon className="size-5" />
      </button>
    </nav>
  )
}
