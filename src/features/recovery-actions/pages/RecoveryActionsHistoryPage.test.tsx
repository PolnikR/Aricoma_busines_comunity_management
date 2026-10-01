import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
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

    await user.click(await screen.findByRole('row', { name: 'Customer Portal passed' }))

    const drawer = screen.getByRole('dialog', { name: 'Recovery test details' })
    const meta = within(drawer).getByRole('heading', { name: 'Customer Portal' }).parentElement?.nextElementSibling
    expect(meta).toHaveTextContent(/^Recovery test/)
    expect(meta).toHaveTextContent('Passed')
    expect(drawer).toHaveTextContent('Manual point-in-time validation completed successfully.')

    await user.click(within(drawer).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Recovery test details' })).not.toBeInTheDocument()
  })
})
