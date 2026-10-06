import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { formatDateTime } from '@/shared/utils/dateTime'
import { latestAutomatedRun } from '../mocks/recoveryActionsMocks'
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
    const latestCheckDate = formatDateTime(latestAutomatedRun.startedAt, { language: 'en', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    expect(await screen.findByText(`Last check · ${latestCheckDate}`)).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Recovery action sections' })).toBeInTheDocument()
    expect(screen.getByText('Validation content')).toBeInTheDocument()
  })
})
