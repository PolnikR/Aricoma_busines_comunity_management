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

    await user.click(screen.getByRole('button', { name: 'Configure access-log query' }))
    await user.clear(screen.getByLabelText('Status'))
    await user.type(screen.getByLabelText('Status'), '404')
    await user.clear(screen.getByLabelText('Method'))
    await user.type(screen.getByLabelText('Method'), 'post')

    expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('row', { name: 'POST /api/access-logs' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenLastCalledWith({ lines: 200, status: 404, method: 'POST' })
  })

  it('refreshes the applied window from the page toolbar', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock
      .mockResolvedValueOnce([])
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

    expect(await screen.findByText('No access logs found.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('row', { name: 'GET /api/refreshed' })).toBeInTheDocument()
    expect(fetchAccessLogsMock).toHaveBeenCalledTimes(2)
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

    expect(await screen.findByRole('row', { name: 'GET /api/cached' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Access logs could not be refreshed.')
    expect(screen.getByRole('row', { name: 'GET /api/cached' })).toBeInTheDocument()
  })

  it('uses local pagination and opens the selected log details', async () => {
    const user = userEvent.setup()
    fetchAccessLogsMock.mockResolvedValue(Array.from({ length: 11 }, (_, index) => ({
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
    await user.click(screen.getByRole('row', { name: 'GET /api/entry/11' }))

    expect(screen.getByRole('dialog', { name: 'Access log details' })).toHaveTextContent('GET /api/entry/11')
    await waitFor(() => {
      expect(fetchAccessLogsMock).toHaveBeenCalledOnce()
    })
  })
})
