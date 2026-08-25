import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXTERNAL_SERVICES } from '@/config/externalServices'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useDeletePlatformProvider } from '../hooks/useDeletePlatformProvider'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersTable } from './PlatformProvidersTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeletePlatformProvider', () => ({
  useDeletePlatformProvider: vi.fn(),
}))

const baseProvider: PlatformProviderRecord = {
  id: 'airflow-01',
  name: 'Primary Airflow',
  description: 'Application recovery DAG orchestration.',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.55',
  port: 22,
  dagDir: '/home/airflow/dags',
  credentialId: 'airflow-ssh',
  credentialStatus: 'ok',
  notificationEmail: 'platform-alerts@example.test',
}

const smtpProvider: PlatformProviderRecord = {
  id: 'smtp-01',
  name: 'Test SMTP',
  description: 'Local test SMTP relay.',
  type: 'SMTP',
  ipAddress: '10.99.99.53',
  port: 1025,
  url: 'http://10.99.99.53:8025/',
  dagDir: '',
  credentialId: '',
  credentialStatus: 'none',
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: true,
}

const deleteMutation = {
  mutate: vi.fn(),
  isPending: false,
  error: null as unknown,
}

beforeEach(() => {
  deleteMutation.mutate.mockReset()
  deleteMutation.error = null
  vi.mocked(useDeletePlatformProvider).mockReturnValue(
    deleteMutation as unknown as ReturnType<typeof useDeletePlatformProvider>,
  )
})

describe('PlatformProvidersTable', () => {
  it('shows the SMTP action only for a selected SMTP provider', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[smtpProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'SMTP' })).not.toBeInTheDocument()
    await user.click(screen.getByText('Test SMTP'))

    expect(screen.getByRole('button', { name: 'SMTP' })).toBeInTheDocument()
  })

  it('opens SMTP details for the selected provider without a second modal', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[smtpProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Test SMTP'))
    await user.click(screen.getByRole('button', { name: 'SMTP' }))
    const smtpUrl = smtpProvider.url
    if (!smtpUrl) throw new Error('SMTP fixture URL is required')

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'SMTP provider details' })).toHaveTextContent('Test SMTP')
    expect(screen.getByRole('link', { name: smtpUrl })).toHaveAttribute('href', smtpUrl)
    expect(deleteMutation.mutate).not.toHaveBeenCalled()
  })

  it('returns to the selected provider drawer when SMTP details close', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[smtpProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Test SMTP'))
    await user.click(screen.getByRole('button', { name: 'SMTP' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog', { name: 'SMTP provider details' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Provider detail' })).toBeInTheDocument()
  })

  it('displays an SMTP provider and its OpenAPI fields', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[smtpProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('SMTP')).toBeInTheDocument()
    await user.click(screen.getByText('Test SMTP'))

    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
    const smtpUrl = smtpProvider.url
    if (!smtpUrl) throw new Error('SMTP fixture URL is required')
    for (const label of ['Provider ID', 'Type', 'IP address', 'Port', 'DAG directory', 'URL', 'Notification email', 'From email']) {
      expect(within(drawer).getByText(label)).toBeInTheDocument()
    }

    expect(within(drawer).getByRole('link', { name: smtpUrl })).toHaveAttribute('href', smtpUrl)
    expect(within(drawer).getByText('airflow@example.com')).toBeInTheDocument()
    expect(within(drawer).queryByText('Description')).not.toBeInTheDocument()
    expect(within(drawer).queryByText('Disable SSL')).not.toBeInTheDocument()
    expect(within(drawer).queryByText('Disable TLS')).not.toBeInTheDocument()
    expect(within(drawer).queryByText('Credential')).not.toBeInTheDocument()
  })

  it('keeps search available without exposing platform-provider API errors', () => {
    render(
      <PlatformProvidersTable
        providers={[]}
        isLoading={false}
        error={new Error('platform provider internals')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('platform provider internals')
  })

  it('shows backend detail while retaining the platform-provider retry state', () => {
    const error = new Error('Get platform providers request failed with status 503', {
      cause: new OrvalApiError(503, 'Service Unavailable', {
        detail: 'The platform provider inventory is unavailable.',
      }),
    })

    render(
      <PlatformProvidersTable
        providers={[]}
        isLoading={false}
        error={error}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to load platform providers.')
    expect(alert).toHaveTextContent('The platform provider inventory is unavailable.')
    expect(alert).not.toHaveTextContent('status 503')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('closes failed delete confirmation and shows backend detail in the table context', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[baseProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Primary Airflow'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    const confirmation = screen.getByRole('dialog', { name: 'Delete platform provider' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }))

    const mutationOptions = deleteMutation.mutate.mock.calls[0]?.[1] as { onError?: () => void } | undefined
    if (!mutationOptions?.onError) throw new Error('Delete mutation error handler was not passed')

    deleteMutation.error = new Error('Delete platform provider request failed with status 409', {
      cause: new OrvalApiError(409, 'Conflict', {
        detail: 'The platform provider is referenced by a recovery policy.',
      }),
    })
    act(() => {
      mutationOptions.onError?.()
    })

    expect(screen.queryByRole('dialog', { name: 'Delete platform provider' })).not.toBeInTheDocument()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Delete platform provider')
    expect(alert).toHaveTextContent('The platform provider is referenced by a recovery policy.')
    expect(alert).not.toHaveTextContent('status 409')
  })

  it('shows a link to the provider url in the detail drawer when one is present', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[{ ...baseProvider, url: EXTERNAL_SERVICES.airflow.dagsUrl }]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Primary Airflow'))

    const link = screen.getByRole('link', { name: new RegExp(EXTERNAL_SERVICES.airflow.dagsUrl) })
    expect(link).toHaveAttribute('href', EXTERNAL_SERVICES.airflow.dagsUrl)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByText('platform-alerts@example.test')).toBeInTheDocument()
  })

  it('omits the url row when the provider has no url', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[baseProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Primary Airflow'))

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the complete platform provider GET record without opening the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[{
          ...baseProvider,
          url: EXTERNAL_SERVICES.airflow.dagsUrl,
          rawRecord: {
            ...baseProvider,
            role: 'source',
            description: null,
            url: null,
          },
        }]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'View' }))

    const dialog = screen.getByRole('dialog', { name: 'Platform Provider JSON' })
    expect(dialog).toHaveTextContent('"id": "airflow-01"')
    expect(dialog).toHaveTextContent('"port": 22')
    expect(dialog).toHaveTextContent('"dagDir": "/home/airflow/dags"')
    expect(dialog).toHaveTextContent('"credentialStatus": "ok"')
    expect(dialog).toHaveTextContent('"description": null')
    expect(dialog).toHaveTextContent('"url": null')
    expect(dialog).not.toHaveTextContent(EXTERNAL_SERVICES.airflow.dagsUrl)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
