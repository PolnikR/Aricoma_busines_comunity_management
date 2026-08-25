import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { SmtpProviderDetailsDialog } from './SmtpProviderDetailsDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const rawSmtpProvider = {
  id: 'smtp-01',
  name: 'Test SMTP',
  description: 'Local test SMTP relay backing Airflow.',
  type: 'SMTP',
  role: 'source',
  ipAddress: '10.99.99.53',
  credentialId: null,
  url: 'http://10.99.99.53:8025/',
  defaultFlashcopyProviderId: null,
  orchestratorConnId: null,
  vmPrefix: null,
  vmTags: [],
  notificationEmail: null,
  port: 1025,
  dagDir: null,
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: false,
  credentialStatus: 'none',
} satisfies NonNullable<PlatformProviderRecord['rawRecord']>

const smtpProvider: PlatformProviderRecord = {
  ...rawSmtpProvider,
  description: rawSmtpProvider.description,
  ipAddress: rawSmtpProvider.ipAddress,
  credentialId: '',
  dagDir: '',
  rawRecord: rawSmtpProvider,
}

describe('SmtpProviderDetailsDialog', () => {
  it('renders the SMTP summary cards and complete raw provider response', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

    render(<SmtpProviderDetailsDialog open provider={smtpProvider} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'SMTP provider details' })
    expect(within(dialog).getByText('Source')).toBeInTheDocument()
    expect(within(dialog).queryByText('Connection test completed')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/\d+ \/ \d+ passed/)).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()

    const summary = within(dialog).getByRole('list', { name: 'SMTP provider details' })
    const cards = within(summary).getAllByRole('listitem')
    expect(cards).toHaveLength(4)
    expect(cards[0]).toHaveTextContent('ProviderTest SMTP')
    expect(cards[1]).toHaveTextContent('From emailairflow@example.com')
    expect(cards[2]).toHaveTextContent('Disable SSLtrue')
    expect(cards[3]).toHaveTextContent('Disable TLSfalse')

    const responseBody = dialog.querySelector('pre')
    expect(responseBody).toBeVisible()
    expect(responseBody?.textContent).toBe(JSON.stringify(rawSmtpProvider, null, 2))

    await user.click(within(dialog).getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(rawSmtpProvider, null, 2))
  })

  it('shows placeholders for missing optional SMTP summary values', () => {
    const providerWithoutOptionalValues: PlatformProviderRecord = {
      ...smtpProvider,
      fromEmail: null,
      disableSsl: null,
      disableTls: null,
      rawRecord: {
        ...rawSmtpProvider,
        fromEmail: null,
        disableSsl: null,
        disableTls: null,
      },
    }

    render(
      <SmtpProviderDetailsDialog
        open
        provider={providerWithoutOptionalValues}
        onClose={vi.fn()}
      />,
    )

    const summary = screen.getByRole('list', { name: 'SMTP provider details' })
    expect(within(summary).getAllByText('-')).toHaveLength(3)
  })
})
