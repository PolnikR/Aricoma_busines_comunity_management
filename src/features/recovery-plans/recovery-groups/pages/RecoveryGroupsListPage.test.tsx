import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { RecoveryGroupsListPage } from './RecoveryGroupsListPage'

const keycloakMock = vi.hoisted(() => ({
  token: 'recovery-groups-page-test-token',
  updateToken: vi.fn(() => Promise.resolve(true)),
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))

describe('RecoveryGroupsListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('app-language', 'en')
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input.startsWith('/api/get_providers')) {
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
    expect(screen.getByRole('searchbox', { name: 'pages.recoveryGroups.searchLabel' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'tables.recoveryGroups.group' })).toBeVisible()
    expect(await screen.findByRole('heading', { name: 'Recovery Groups' })).toBeInTheDocument()
    expect(screen.getByText(/Manage reusable groups of resources/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    expect(await screen.findByRole('button', { name: 'Create Your First Recovery Group' })).toBeEnabled()
  })

  it('keeps table filters available when loading recovery groups fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input.startsWith('/api/get_providers')) {
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

  it('shows nested backend detail below the localized load title', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input.startsWith('/api/get_providers')) {
        return Promise.resolve(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
      }
      if (input === '/api/get_recovery_groups') {
        return Promise.resolve(new Response(JSON.stringify({ detail: 'The selected provider is unavailable.' }), { status: 503 }))
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

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Recovery groups could not be loaded')
    expect(alert).toHaveTextContent('The selected provider is unavailable.')
  })

  it('shows backend detail in the localized mutation alert', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => {
      if (input.startsWith('/api/get_providers')) {
        return Promise.resolve(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
      }
      if (input === '/api/get_recovery_groups') {
        return Promise.resolve(new Response(JSON.stringify({
          recovery_groups: [{
            id: 'database-group',
            name: 'Database group',
            description: 'Primary databases',
            provider_id_vm: 'vmware-vcenter-01',
            policy_set_id: 'tier2-apps',
            vms: [{ name: 'DB-01' }],
            volumes: [],
          }],
        }), { status: 200 }))
      }
      if (input.startsWith('/api/delete_recovery_group')) {
        return Promise.resolve(new Response(JSON.stringify({ detail: 'The recovery group is still referenced.' }), { status: 409 }))
      }
      return Promise.reject(new Error(`Unexpected request: ${input}`))
    }))
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <LanguageProvider>
            <RecoveryGroupsListPage />
          </LanguageProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(await screen.findByRole('button', { name: '⋯' }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Recovery group operation failed.')
    expect(alert).toHaveTextContent('The recovery group is still referenced.')
  })

  it('refreshes recovery groups from the shared page toolbar', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input.startsWith('/api/get_providers')) {
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
