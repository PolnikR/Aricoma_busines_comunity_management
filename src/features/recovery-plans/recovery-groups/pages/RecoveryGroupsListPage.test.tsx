import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { RecoveryGroupsListPage } from './RecoveryGroupsListPage'

describe('RecoveryGroupsListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('app-language', 'en')
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input === '/api/get_providers') {
        return Promise.resolve(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
      }
      if (input === '/api/get_recovery_groups') {
        return Promise.resolve(new Response(JSON.stringify({ recovery_groups: [] }), { status: 200 }))
      }
      return Promise.reject(new Error(`Unexpected request: ${input}`))
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the translated empty Recovery Groups screen', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <LanguageProvider>
            <RecoveryGroupsListPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('heading', { name: 'Recovery Groups' })).toBeInTheDocument()
    expect(screen.getByText(/Manage reusable groups of resources/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    expect(await screen.findByRole('button', { name: 'Create Your First Recovery Group' })).toBeEnabled()
  })

  it('keeps table filters available when loading recovery groups fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input === '/api/get_providers') {
        return Promise.resolve(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
      }
      if (input === '/api/get_recovery_groups') {
        return Promise.reject(new Error('recovery group internals'))
      }
      return Promise.reject(new Error(`Unexpected request: ${input}`))
    }))

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <LanguageProvider>
            <RecoveryGroupsListPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('recovery group internals')
  })

  it('refreshes recovery groups from the shared page toolbar', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === '/api/get_providers') {
        return Promise.resolve(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
      }
      if (input === '/api/get_recovery_groups') {
        return Promise.resolve(new Response(JSON.stringify({ recovery_groups: [] }), { status: 200 }))
      }
      return Promise.reject(new Error(`Unexpected request: ${input}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <LanguageProvider>
            <RecoveryGroupsListPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByRole('heading', { name: 'Recovery Groups' })
    await screen.findByRole('button', { name: 'Create Your First Recovery Group' })
    const initialGroupFetches = fetchMock.mock.calls.filter(([input]) => input === '/api/get_recovery_groups').length

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.filter(([input]) => input === '/api/get_recovery_groups')).toHaveLength(initialGroupFetches + 1)
    })
  })
})
