import { render, screen } from '@testing-library/react'
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

  it('shows delete backend detail in the table context', () => {
    deleteMutation.error = new Error('Delete platform provider request failed with status 409', {
      cause: new OrvalApiError(409, 'Conflict', {
        detail: 'The platform provider is referenced by a recovery policy.',
      }),
    })

    render(
      <PlatformProvidersTable
        providers={[baseProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

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
