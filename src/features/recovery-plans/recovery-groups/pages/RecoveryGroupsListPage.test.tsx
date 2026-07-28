import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
      <MemoryRouter>
        <LanguageProvider>
          <RecoveryGroupsListPage />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Recovery Groups' })).toBeInTheDocument()
    expect(screen.getByText(/Manage reusable groups of resources/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Create Your First Recovery Group' })).toBeEnabled()
  })
})
