import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EXTERNAL_SERVICES } from '@/config/externalServices'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersTable } from './PlatformProvidersTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeletePlatformProvider', () => ({
  useDeletePlatformProvider: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
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
        providers={[{ ...baseProvider, url: EXTERNAL_SERVICES.airflow.dagsUrl }]}
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
    expect(dialog).toHaveTextContent(`"url": "${EXTERNAL_SERVICES.airflow.dagsUrl}"`)
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
