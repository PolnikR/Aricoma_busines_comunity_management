import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { fetchAccessLogs } from '../api/accessLogsApi'
import { AuditPage } from './AuditPage'

vi.mock('../api/accessLogsApi', () => ({
  fetchAccessLogs: vi.fn(),
}))

const fetchAccessLogsMock = vi.mocked(fetchAccessLogs)

function renderPage(initialEntry = '/platform-administration/audit-retention') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } },
  })

  return render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AuditPage />
        </MemoryRouter>
      </QueryClientProvider>
    </LanguageProvider>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('AuditPage', () => {
  it('loads the default access-log window and updates it only after Apply', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockImplementation((filters) => Promise.resolve([{
      kind: 'request' as const,
      method: filters?.method ?? 'GET',
      path: '/api/access-logs',
      status: filters?.status ?? 200,
      durationMs: 8,
      requestBody: null,
      responseBody: null,
    }]))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Access logs' })).toBeInTheDocument()
    expect(await screen.findByRole('row', { name: 'GET /api/access-logs' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledWith({ lines: 200 })

    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.clear(screen.getByLabelText('Status'))
    await user.type(screen.getByLabelText('Status'), '404')
    await user.clear(screen.getByLabelText('Method'))
    await user.type(screen.getByLabelText('Method'), 'post')

    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('row', { name: 'POST /api/access-logs' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenLastCalledWith({ lines: 200, status: 404, method: 'POST' })
  })

  it('refreshes the applied window from the page toolbar and clears its prior selection', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock
      .mockResolvedValueOnce([{
        kind: 'request',
        method: 'GET',
        path: '/api/original',
        status: 200,
        durationMs: 2,
        requestBody: null,
        responseBody: null,
      }])
      .mockResolvedValueOnce([{
        kind: 'request',
        method: 'GET',
        path: '/api/refreshed',
        status: 200,
        durationMs: 3,
        requestBody: null,
        responseBody: null,
      }])

    renderPage()

    await user.click(await screen.findByRole('row', { name: 'GET /api/original' }))
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('row', { name: 'GET /api/refreshed' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Access log details' })).not.toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledTimes(2)
  })

  it('localizes the Audit-owned refresh state in Czech', async () => {
    const user = userEvent.setup()
    let resolveRefresh: (() => void) | undefined
    localStorage.setItem('app-language', 'cs')
    fetchAccessLogsMock
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = () => { resolve([]) } }))

    renderPage()

    const refresh = await screen.findByRole('button', { name: 'Obnovit' })
    await user.click(refresh)
    expect(screen.getByText('Aktualizuji')).toBeInTheDocument()

    resolveRefresh?.()
    await waitFor(() => { expect(screen.queryByText('Aktualizuji')).not.toBeInTheDocument() })
  })

  it('shows the access-log loading error when no data is cached', async () => {
    fetchAccessLogsMock.mockRejectedValue(new Error('Access log service unavailable'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Access logs could not be loaded.')
  })

  it('keeps cached rows visible when a refresh fails', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock
      .mockResolvedValueOnce([{
        kind: 'request',
        method: 'GET',
        path: '/api/cached',
        status: 200,
        durationMs: 3,
        requestBody: null,
        responseBody: null,
      }])
      .mockRejectedValueOnce(new Error('Access log service unavailable'))

    renderPage()

    await user.click(await screen.findByRole('row', { name: 'GET /api/cached' }))
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Access logs could not be refreshed.')
    expect(screen.getByRole('row', { name: 'GET /api/cached' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Access log details' })).toBeInTheDocument()
  })

  it('uses local pagination and opens the selected log details', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue(Array.from({ length: 26 }, (_, index) => ({
      kind: 'request' as const,
      method: 'GET',
      path: `/api/entry/${String(index + 1)}`,
      status: 200,
      durationMs: index + 1,
      requestBody: { id: index + 1 },
      responseBody: null,
    })))

    renderPage()

    expect(await screen.findByRole('row', { name: 'GET /api/entry/1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    await user.click(screen.getByRole('row', { name: 'GET /api/entry/26' }))

    expect(screen.getByRole('dialog', { name: 'Access log details' })).toHaveTextContent('GET /api/entry/26')
    await waitFor(() => {
      expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
    })
  })

  it('returns to page one when Clear all is used while the applied filters are already defaults', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue(Array.from({ length: 26 }, (_, index) => ({
      kind: 'request' as const,
      method: 'GET',
      path: `/api/entry/${String(index + 1)}`,
      status: 200,
      durationMs: index + 1,
      requestBody: null,
      responseBody: null,
    })))

    renderPage()

    await screen.findByRole('row', { name: 'GET /api/entry/1' })
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveValue('25')
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(screen.getByRole('row', { name: 'GET /api/entry/26' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filters/ }))
    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByRole('row', { name: 'GET /api/entry/1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
  })
})
