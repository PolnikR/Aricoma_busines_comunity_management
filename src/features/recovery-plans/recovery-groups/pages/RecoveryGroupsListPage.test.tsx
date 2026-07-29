import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { RecoveryGroupsListPage } from './RecoveryGroupsListPage'

describe('RecoveryGroupsListPage', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('app-language', 'en')
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

    expect(await screen.findByRole('heading', { name: 'Recovery Groups' })).toBeInTheDocument()
    expect(screen.getByText(/Manage reusable groups of resources/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Create Your First Recovery Group' })).toBeEnabled()
  })
})
