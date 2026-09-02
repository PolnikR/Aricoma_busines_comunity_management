import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import type { AccessLogFilters, AccessLogRecord } from '../model/accessLogTypes'
import { fetchAccessLogs } from '../api/accessLogsApi'
import { accessLogKeys } from '../api/accessLogQueryKeys'
import { AccessLogsTable } from './AccessLogsTable'

vi.mock('../api/accessLogsApi', () => ({
  fetchAccessLogs: vi.fn(),
}))

const fetchAccessLogsMock = vi.mocked(fetchAccessLogs)

const requestEntry: AccessLogRecord = {
  kind: 'request',
  method: 'POST',
  path: '/api/jobs',
  status: 202,
  durationMs: 12.5,
  requestBody: { job: 'nightly' },
  responseBody: [{ result: 'queued' }],
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })
}

function renderTable(
  filters: AccessLogFilters = { lines: 200 },
  queryClient = createQueryClient(),
) {
  const view = render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <AccessLogsTable filters={filters} density="compact" />
      </QueryClientProvider>
    </LanguageProvider>,
  )

  return { ...view, queryClient }
}

function accessEntries(count: number): AccessLogRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    kind: 'request' as const,
    method: 'GET',
    path: `/api/entries/${String(index + 1)}`,
    status: 200,
    durationMs: index + 1,
    requestBody: null,
    responseBody: null,
  }))
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AccessLogsTable', () => {
  it('shows four-column loading skeleton while the access-log request is pending', () => {
    fetchAccessLogsMock.mockReturnValue(new Promise(() => undefined))

    renderTable()

    const table = screen.getByRole('status', { name: 'Loading access logs' })
    expect(table).toHaveAttribute('aria-busy', 'true')
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Method',
      'Path',
      'Status',
      'Duration',
    ])
  })

  it('shows an empty state when the fetched access-log window has no entries', async () => {
    fetchAccessLogsMock.mockResolvedValue([])

    renderTable()

    expect(await screen.findByText('No access logs found.')).toBeInTheDocument()
  })

  it('keeps cached rows visible with a compact refresh error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false, staleTime: 0 } },
    })
    queryClient.setQueryData(accessLogKeys.list({ lines: 200 }), [requestEntry])
    fetchAccessLogsMock.mockRejectedValue(new Error('Access log service unavailable'))

    renderTable({ lines: 200 }, queryClient)

    expect(await screen.findByRole('alert')).toHaveTextContent('Access logs could not be refreshed.')
    expect(screen.getByText('/api/jobs')).toBeInTheDocument()
  })

  it('opens the selected request with JSON bodies after keyboard activation', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue([requestEntry])

    renderTable()

    const row = await screen.findByRole('row', { name: 'POST /api/jobs' })
    expect(screen.queryByText('"nightly"')).not.toBeInTheDocument()

    row.focus()
    await user.keyboard('{Enter}')

    const drawer = screen.getByRole('dialog', { name: 'Access log details' })
    expect(drawer).toHaveTextContent('POST /api/jobs')
    expect(drawer).toHaveTextContent('"job": "nightly"')
    expect(drawer).toHaveTextContent('"result": "queued"')
  })

  it('renders string and null bodies without putting either body in table cells', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue([{
      ...requestEntry,
      method: 'PATCH',
      path: '/api/jobs/1',
      requestBody: 'force=true',
      responseBody: null,
    }])

    renderTable()

    const row = await screen.findByRole('row', { name: 'PATCH /api/jobs/1' })
    expect(screen.queryByText('force=true')).not.toBeInTheDocument()
    row.focus()
    await user.keyboard('{Enter}')

    const drawer = screen.getByRole('dialog', { name: 'Access log details' })
    expect(drawer).toHaveTextContent('force=true')
    expect(drawer).toHaveTextContent('null')
  })

  it('opens raw fallback entries safely in the detail drawer', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue([{ kind: 'raw', raw: 'malformed access log line' }])

    renderTable()

    await user.click(await screen.findByRole('row', { name: 'Raw access log entry' }))

    const drawer = screen.getByRole('dialog', { name: 'Access log details' })
    expect(drawer).toHaveTextContent('Raw access-log entry')
    expect(drawer).toHaveTextContent('malformed access log line')
  })

  it('keeps pagination local and resets its page and selection for a new applied query', async () => {
    const user = userEvent.setup()
    const firstWindow = accessEntries(12)
    const nextWindow = accessEntries(12).map((entry, index) => ({
      ...entry,
      method: 'DELETE',
      path: `/api/reloaded/${String(index + 1)}`,
      status: 204,
    }))
    fetchAccessLogsMock.mockImplementation((filters) => Promise.resolve(
      filters.status === 204 ? nextWindow : firstWindow,
    ))
    const { rerender, queryClient } = renderTable()

    await screen.findByRole('row', { name: 'GET /api/entries/1' })
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByRole('row', { name: 'GET /api/entries/11' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '25')
    expect(screen.getByRole('row', { name: 'GET /api/entries/12' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('row', { name: 'GET /api/entries/12' }))
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()

    rerender(
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AccessLogsTable filters={{ lines: 200, status: 204 }} density="compact" />
        </QueryClientProvider>
      </LanguageProvider>,
    )

    expect(await screen.findByRole('row', { name: 'DELETE /api/reloaded/1' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Access log details' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(fetchAccessLogsMock).toHaveBeenCalledTimes(2)
  })
})
