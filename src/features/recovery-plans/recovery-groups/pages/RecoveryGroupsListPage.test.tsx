import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
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
})
