import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { formatDateTime } from '@/shared/utils/dateTime'
import { RecoveryActionsHistoryPage } from './RecoveryActionsHistoryPage'

describe('RecoveryActionsHistoryPage', () => {
  it('opens a recovery test in the Model C detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LanguageProvider>
          <RecoveryActionsHistoryPage />
        </LanguageProvider>
      </MemoryRouter>,
    )

    const row = await screen.findByRole('row', { name: 'Customer Portal passed' })
    expect(row).toHaveTextContent(formatDateTime('2026-07-31T14:30:00+02:00', { language: 'en' }))
    await user.click(row)

    const drawer = screen.getByRole('dialog', { name: 'Recovery test details' })
    const meta = within(drawer).getByRole('heading', { name: 'Customer Portal' }).parentElement?.nextElementSibling
    expect(meta).toHaveTextContent(/^Recovery test/)
    expect(meta).toHaveTextContent('Passed')
    expect(drawer).toHaveTextContent('Manual point-in-time validation completed successfully.')
    await user.click(within(drawer).getByRole('button', { name: 'Recovery test help' }))
    expect(within(drawer).getByRole('dialog', { name: 'What a recovery test shows' })).toHaveTextContent('Automated and manual')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Recovery test details' })).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Recovery test details' })).not.toBeInTheDocument()
  })
})
