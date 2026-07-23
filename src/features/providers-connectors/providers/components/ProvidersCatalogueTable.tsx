import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { Badge } from '@/shared/components/badge/Badge'
import { Select } from '@/shared/components/form/FormControls'
import { Pagination } from '@/shared/components/pagination/Pagination'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useProviders } from '../api/useProviders'
import { ProvidersToolbar } from './ProvidersToolbar'

const PAGE_SIZES = [10, 25, 50] as const
type PageSize = (typeof PAGE_SIZES)[number]

export function ProvidersCatalogueTable() {
  const { data: providers, isLoading, error } = useProviders()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)

  const types = useMemo(
    () => [...new Set((providers ?? []).map((provider) => provider.type).filter(Boolean))].sort(),
    [providers],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (providers ?? []).filter((provider) => {
      if (typeFilter && provider.type !== typeFilter) return false
      if (term && !provider.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [providers, search, typeFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const pageItems = filtered.slice(startIndex, startIndex + pageSize)
  const rangeStart = filtered.length === 0 ? 0 : startIndex + 1
  const rangeEnd = Math.min(startIndex + pageSize, filtered.length)

  const headerCell = 'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]'
  const cell = 'px-4 py-2.5 text-[13px] text-[#3b4763] align-middle'

  if (isLoading) {
    return <div className="p-6 text-sm text-[#71819a]">Loading providers…</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Failed to load providers. {error instanceof Error ? error.message : ''}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <ProvidersToolbar
        search={search}
        typeFilter={typeFilter}
        types={types}
        onSearchChange={(value) => { setSearch(value); setPage(1) }}
        onTypeChange={(value) => { setTypeFilter(value); setPage(1) }}
      />

      <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable providers table">
        <Table className="min-w-215">
          <TableHeader className="border-b border-[#dfe9f3] bg-[#f6f9fc]">
            <TableRow>
              <TableCell isHeader className={headerCell}>Provider</TableCell>
              <TableCell isHeader className={headerCell}>Description</TableCell>
              <TableCell isHeader className={headerCell}>Type</TableCell>
              <TableCell isHeader className={headerCell}>IP address</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#edf2f7]">
            {pageItems.length > 0 ? (
              pageItems.map((provider) => (
                <TableRow key={provider.id} className="bg-white hover:bg-[#f3f8fe] transition-colors">
                  <TableCell className={cell}>
                    <span className="block font-semibold text-[#17233d]">{provider.name}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-[#93a0b5]">{provider.id}</span>
                  </TableCell>
                  <TableCell className={cell}>
                    <span className="block max-w-md truncate" title={provider.description}>{provider.description || '-'}</span>
                  </TableCell>
                  <TableCell className={cell}>
                    <Badge color="info" size="sm">{provider.type || 'UNKNOWN'}</Badge>
                  </TableCell>
                  <TableCell className={cell}>
                    <span className="font-mono text-[12px] text-[#3b4763]">{provider.ipAddress || '-'}</span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="px-4 py-8 text-center text-sm text-[#71819a]">
                  {providers && providers.length > 0 ? (
                    'No providers match your search.'
                  ) : (
                    <EmptyState title="No providers found" description="No providers were returned by the backend." />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#e3edf6] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#71819a]">
          <span>Showing <strong className="font-medium text-[#17233d]">{rangeStart}-{rangeEnd}</strong> of <strong className="font-medium text-[#17233d]">{filtered.length}</strong></span>
          <label className="flex items-center gap-2">
            <span className="text-xs">Rows</span>
            <Select aria-label="Rows per page" className="h-9 w-20" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as PageSize); setPage(1) }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </Select>
          </label>
        </div>
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  )
}
