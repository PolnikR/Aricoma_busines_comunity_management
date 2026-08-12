import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { RecoveryActionsPageShell } from './RecoveryActionsPageShell'

describe('RecoveryActionsPageShell', () => {
  it('renders operational status and contextual detail for the action tabs', async () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <RecoveryActionsPageShell activeTab="validate">
            <p>Validation content</p>
          </RecoveryActionsPageShell>
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByText('1 issue')).toBeInTheDocument()
    expect(await screen.findByText(/Last check/)).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Recovery action sections' })).toBeInTheDocument()
    expect(screen.getByText('Validation content')).toBeInTheDocument()
  })
})
