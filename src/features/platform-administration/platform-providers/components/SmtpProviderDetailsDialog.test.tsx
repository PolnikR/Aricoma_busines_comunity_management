import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { SmtpProviderDetailsDialog } from './SmtpProviderDetailsDialog'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const smtpProvider: PlatformProviderRecord = {
  id: 'smtp-01',
  name: 'Test SMTP',
  description: 'Local test SMTP relay backing Airflow.',
  type: 'SMTP',
  ipAddress: '10.99.99.53',
  port: 1025,
  url: 'http://10.99.99.53:8025/',
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: true,
  dagDir: '',
  credentialId: '',
  credentialStatus: 'none',
}

describe('SmtpProviderDetailsDialog', () => {
  it('renders all SMTP fields and links to the provider URL', () => {
    render(<SmtpProviderDetailsDialog open provider={smtpProvider} onClose={vi.fn()} />)
    const url = smtpProvider.url
    if (!url) throw new Error('SMTP fixture URL is required')

    expect(screen.getByRole('dialog', { name: 'platformProviders.smtpDialog.title' })).toBeInTheDocument()
    for (const value of [
      smtpProvider.id,
      smtpProvider.name,
      smtpProvider.description,
      smtpProvider.type,
      smtpProvider.ipAddress,
      String(smtpProvider.port),
      smtpProvider.fromEmail ?? '',
      'true',
    ]) {
      expect(screen.getAllByText(value).length).toBeGreaterThan(0)
    }

    const link = screen.getByRole('link', { name: url })
    expect(link).toHaveAttribute('href', url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows a placeholder when the provider URL is absent', () => {
    const providerWithoutUrl: PlatformProviderRecord = { ...smtpProvider }
    delete providerWithoutUrl.url

    render(
      <SmtpProviderDetailsDialog
        open
        provider={providerWithoutUrl}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})
