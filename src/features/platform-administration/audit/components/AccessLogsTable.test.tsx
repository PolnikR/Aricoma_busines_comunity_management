import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageContext, type Language } from '@/contexts/LanguageContext'
import czechTranslations from '@/locales/cs.json'
import englishTranslations from '@/locales/en.json'
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
  language: Language = 'en',
) {
  const view = render(
    <LanguageContext.Provider value={{
      language,
      setLanguage: vi.fn(),
      translations: language === 'cs' ? czechTranslations : englishTranslations,
    }}>
      <QueryClientProvider client={queryClient}>
        <AccessLogsTable filters={filters} density="compact" />
      </QueryClientProvider>
    </LanguageContext.Provider>,
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
  it('shows a localized four-column loading skeleton while the access-log request is pending', () => {
    fetchAccessLogsMock.mockReturnValue(new Promise(() => undefined))

    renderTable({ lines: 200 }, createQueryClient(), 'cs')

    const table = screen.getByRole('status', { name: 'Načítání přístupových logů' })
    expect(table).toHaveAttribute('aria-busy', 'true')
    expect(within(table).getAllByRole('columnheader').map(header => header.textContent)).toEqual([
      'Metoda',
      'Cesta',
      'Stav',
      'Doba trvání',
    ])
  })

  it('shows a localized empty state when the fetched access-log window has no entries', async () => {
    fetchAccessLogsMock.mockResolvedValue([])

    renderTable({ lines: 200 }, createQueryClient(), 'cs')

    expect(await screen.findByText('Nebyly nalezeny žádné přístupové logy.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Řádků na stránku' })).toHaveValue('25')
  })

  it('keeps cached rows visible with a localized compact refresh error', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false, staleTime: 0 } },
    })
    queryClient.setQueryData(accessLogKeys.list({ lines: 200 }), [requestEntry])
    fetchAccessLogsMock.mockRejectedValue(new Error('Access log service unavailable'))

    renderTable({ lines: 200 }, queryClient, 'cs')

    expect(await screen.findByRole('alert')).toHaveTextContent('Přístupové logy se nepodařilo obnovit.')
    expect(screen.getByRole('button', { name: 'Zkusit znovu' })).toBeInTheDocument()
    expect(screen.getByText('/api/jobs')).toBeInTheDocument()
  })

  it('opens the selected request with localized JSON-body details after keyboard activation', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue([requestEntry])

    renderTable({ lines: 200 }, createQueryClient(), 'cs')

    const row = await screen.findByRole('row', { name: 'POST /api/jobs' })
    expect(screen.queryByText('"nightly"')).not.toBeInTheDocument()

    row.focus()
    await user.keyboard('{Enter}')

    const drawer = screen.getByRole('dialog', { name: 'Podrobnosti přístupového logu' })
    expect(drawer).toHaveTextContent('POST /api/jobs')
    expect(drawer).toHaveTextContent('Přístupový log')
    expect(drawer).toHaveTextContent('Tělo požadavku')
    expect(drawer).toHaveTextContent('Tělo odpovědi')
    expect(screen.getByRole('button', { name: 'Zavřít podrobnosti přístupového logu' })).toBeInTheDocument()
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

    await user.click(await screen.findByRole('row', { name: 'Raw access-log entry' }))

    const drawer = screen.getByRole('dialog', { name: 'Access log details' })
    expect(drawer).toHaveTextContent('Raw access-log entry')
    expect(drawer).toHaveTextContent('malformed access log line')
  })

  it('clears the selected snapshot row after a successful background refresh', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock
      .mockResolvedValueOnce([requestEntry])
      .mockResolvedValueOnce([{ ...requestEntry, method: 'GET', path: '/api/refreshed' }])
    const { queryClient } = renderTable()

    await user.click(await screen.findByRole('row', { name: 'POST /api/jobs' }))
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: accessLogKeys.list({ lines: 200 }) })
    })

    expect(await screen.findByRole('row', { name: 'GET /api/refreshed' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Access log details' })).not.toBeInTheDocument()
  })

  it('keeps pagination local and resets its page and selection for a new applied query', async () => {
    const user = userEvent.setup()
    const firstWindow = accessEntries(26)
    const nextWindow = accessEntries(26).map((entry, index) => ({
      ...entry,
      method: 'DELETE',
      path: `/api/reloaded/${String(index + 1)}`,
      status: 204,
    }))
    fetchAccessLogsMock.mockImplementation((filters) => Promise.resolve(
      filters?.status === 204 ? nextWindow : firstWindow,
    ))
    const { rerender, queryClient } = renderTable()

    await screen.findByRole('row', { name: 'GET /api/entries/1' })
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByRole('row', { name: 'GET /api/entries/26' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '25')
    expect(screen.getByRole('row', { name: 'GET /api/entries/25' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('row', { name: 'GET /api/entries/25' }))
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()

    rerender(
      <LanguageContext.Provider value={{
        language: 'en',
        setLanguage: vi.fn(),
        translations: englishTranslations,
      }}>
        <QueryClientProvider client={queryClient}>
          <AccessLogsTable filters={{ lines: 200, status: 204 }} density="compact" />
        </QueryClientProvider>
      </LanguageContext.Provider>,
    )

    expect(await screen.findByRole('row', { name: 'DELETE /api/reloaded/1' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Access log details' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(fetchAccessLogsMock).toHaveBeenCalledTimes(2)
  })
})
