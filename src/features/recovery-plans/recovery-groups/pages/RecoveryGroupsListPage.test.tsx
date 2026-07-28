import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { RecoveryGroupsListPage } from './RecoveryGroupsListPage'

describe('RecoveryGroupsListPage', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  it('renders the translated empty Recovery Groups screen', async () => {
    render(
      <LanguageProvider>
        <RecoveryGroupsListPage />
      </LanguageProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Recovery Groups' })).toBeInTheDocument()
    expect(screen.getByText(/Manage reusable groups of resources/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Recovery Group' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Create Your First Recovery Group' })).toBeDisabled()
  })
})
