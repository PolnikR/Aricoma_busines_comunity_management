import { act, render as rtlRender, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXTERNAL_SERVICES } from '@/config/externalServices'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useDeletePlatformProvider } from '@/generated/query/platform-providers/platform-providers.gen'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'
import { ConnectionTestManager } from '@/shared/connection-test/ConnectionTestManager'
import { ConnectionTestProvider } from '@/shared/connection-test/ConnectionTestProvider'
import { ConnectionTestHost } from '@/shared/connection-test/ConnectionTestHost'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersTable } from './PlatformProvidersTable'
import { detailNavigationLabels, detailSectionsFields, detailSectionsLabels, openDetailSection } from '@/test-utils/detailView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const testRequest = vi.hoisted(() => vi.fn<(id: string) => Promise<ProviderTestResponseOutput>>())

vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({
  useDeletePlatformProvider: vi.fn(),
  getTestPlatformProviderQueryKey: (params: unknown) => ['/test_platform_provider', params],
  getTestPlatformProviderQueryOptions: (params: { provider_id: string }, options: { query: Record<string, unknown> }) => ({
    ...options.query,
    queryFn: () => testRequest(params.provider_id),
  }),
}))

function render(ui: Parameters<typeof rtlRender>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const manager = new ConnectionTestManager(queryClient, 'test-session')
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <ConnectionTestProvider manager={manager}>
        {ui}
        <ConnectionTestHost />
      </ConnectionTestProvider>
    </QueryClientProvider>,
  )
}

const baseProvider: PlatformProviderRecord = {
  id: 'airflow-01',
  name: 'Primary Airflow',
  description: 'Application recovery DAG orchestration.',
  type: 'AIRFLOW',
  role: 'source',
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
  role: 'source',
  ipAddress: '10.99.99.53',
  port: 1025,
  url: 'http://10.99.99.53:8025/',
  credentialStatus: 'none',
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: true,
}

const backendProvider: PlatformProviderRecord = {
  id: 'backend',
  name: 'ABCo API',
  description: 'Backend service.',
  type: 'BACKEND',
  role: 'source', port: 22,
  url: 'http://10.99.99.54:8000/',
  credentialStatus: 'none',
  notificationEmail: 'abcobe@example.com',
  loggingEnabled: true,
  jwtEnabled: false,
  swaggerEnabled: true,
}

const keycloakProvider: PlatformProviderRecord = {
  id: 'keycloak-01',
  name: 'Aricoma Keycloak',
  description: 'Realm role sync target.',
  type: 'KEYCLOAK',
  role: 'source', port: 22,
  url: 'http://10.99.99.53:8081',
  credentialStatus: 'ok',
  realm: 'aricoma',
  clientId: 'abco-be',
  credentialId: 'keycloak-admin',
}

const deleteMutation = {
  mutate: vi.fn(),
  isPending: false,
  error: null as unknown,
}

beforeEach(() => {
  testRequest.mockReset()
  deleteMutation.mutate.mockReset()
  deleteMutation.error = null
  vi.mocked(useDeletePlatformProvider).mockReturnValue(
    deleteMutation as unknown as ReturnType<typeof useDeletePlatformProvider>,
  )
})

describe('PlatformProvidersTable', () => {
  it('keeps the table toolbar and headers visible while provider rows load', () => {
    render(
      <PlatformProvidersTable
        providers={[]}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search platform providers' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Loading platform providers' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
  })

  it('does not show an SMTP header action in the SMTP provider drawer', async () => {
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

    expect(screen.getByRole('dialog', { name: 'Provider detail' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'SMTP' })).not.toBeInTheDocument()
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
    // One flat Overview with the original SMTP fields only, in the original order.
    expect(detailNavigationLabels(drawer)).toEqual(['Overview'])
    expect(detailSectionsLabels(drawer)).toEqual(['Provider ID', 'Type', 'URL', 'Description', 'Notification email', 'Cache refresh interval (seconds)', 'IP address', 'Port', 'From email', 'Disable SSL', 'Disable TLS'])

    const overview = openDetailSection(drawer, 'Overview')
    expect(within(overview).getByRole('link', { name: smtpUrl })).toHaveAttribute('href', smtpUrl)
    expect(within(overview).getByText('airflow@example.com')).toBeInTheDocument()
  })

  it('shows only AIRFLOW configuration fields in the detail drawer', async () => {
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
    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })

    // Exactly one section: the navigation lists only Overview, no Connection or Technical.
    expect(detailNavigationLabels(drawer)).toEqual(['Overview'])
    expect(within(drawer).getAllByRole('region')).toHaveLength(1)
    expect(within(drawer).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    expect(detailSectionsLabels(drawer)).toEqual([
      'Provider ID', 'Type', 'URL', 'Description', 'Notification email', 'Cache refresh interval (seconds)',
      'IP address', 'Port', 'DAG directory', 'Credential', 'Credential status',
    ])
    expect(detailSectionsFields(drawer)).toMatchObject({ 'Provider ID': 'airflow-01', 'Credential status': 'Available' })
  })

  it('shows only BACKEND configuration fields in the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[backendProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('ABCo API'))
    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
    expect(detailNavigationLabels(drawer)).toEqual(['Overview'])
    expect(detailSectionsLabels(drawer)).toEqual(['Provider ID', 'Type', 'URL', 'Description', 'Notification email', 'Cache refresh interval (seconds)', 'Logging enabled', 'JWT enabled', 'Swagger enabled'])
  })

  it('shows only KEYCLOAK configuration fields in the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <PlatformProvidersTable
        providers={[keycloakProvider]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Aricoma Keycloak'))
    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
    expect(detailNavigationLabels(drawer)).toEqual(['Overview'])
    expect(detailSectionsLabels(drawer)).toEqual(['Provider ID', 'Type', 'URL', 'Description', 'Notification email', 'Cache refresh interval (seconds)', 'Realm', 'Client ID', 'Credential', 'Credential status'])
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

  it('keeps pagination available when cached providers remain after a refresh error', () => {
    render(
      <PlatformProvidersTable
        providers={[baseProvider]}
        isLoading={false}
        error={new Error('background refresh failed')}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
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
          description: null,
          url: null,
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
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
  describe('DetailView', () => {
    it.each([baseProvider, smtpProvider, backendProvider, keycloakProvider])('shows common detail values once for $type', async provider => {
      const user = userEvent.setup()
      renderTable([{ ...provider, notificationEmail: 'alerts@example.test', cacheRefreshSeconds: 60 }])
      await user.click(screen.getByText(provider.name))
      const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
      const labels = detailSectionsLabels(drawer)
      expect(labels.filter(label => label === 'Notification email')).toHaveLength(1)
      expect(labels.filter(label => label === 'Cache refresh interval (seconds)')).toHaveLength(1)
      expect(detailSectionsFields(drawer)).toMatchObject({ 'Notification email': 'alerts@example.test', 'Cache refresh interval (seconds)': '60' })
    })

    it.each([baseProvider, smtpProvider, backendProvider, keycloakProvider])('shows unset common detail values for $type', async provider => {
      const user = userEvent.setup()
      renderTable([{ ...provider, notificationEmail: null, cacheRefreshSeconds: null }])
      await user.click(screen.getByText(provider.name))
      const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
      expect(detailSectionsFields(drawer)).toMatchObject({ 'Notification email': 'Not set', 'Cache refresh interval (seconds)': 'Not set' })
    })

    const renderTable = (providers: PlatformProviderRecord[]) => render(
      <PlatformProvidersTable providers={providers} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />,
    )

    it('shows entity, type and credential status in the header and the id in Overview', async () => {
      const user = userEvent.setup()
      renderTable([baseProvider])
      await user.click(screen.getByText('Primary Airflow'))
      const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
      const header = within(drawer).getByRole('heading', { level: 2, name: 'Primary Airflow' }).closest('header')

      expect(drawer).toHaveAttribute('data-size', 'md')
      expect(header).toHaveTextContent('Platform provider')
      expect(header).toHaveTextContent('AIRFLOW')
      expect(header).toHaveTextContent('Available')
      expect(header).not.toHaveTextContent('airflow-01')
      expect(openDetailSection(drawer, 'Overview')).toHaveTextContent('airflow-01')
      await user.click(within(drawer).getByRole('button', { name: 'Platform provider help' }))
      expect(screen.getByRole('dialog', { name: 'What a platform provider is' })).toHaveTextContent('Airflow')
    })

    it('omits the credential badge for an SMTP provider', async () => {
      const user = userEvent.setup()
      renderTable([smtpProvider])
      await user.click(screen.getByText('Test SMTP'))
      const drawer = screen.getByRole('dialog', { name: 'Provider detail' })

      expect(within(drawer).getByRole('heading', { level: 2 }).closest('header')).not.toHaveTextContent('Available')
    })

    it('puts Delete left and Edit right', async () => {
      const user = userEvent.setup()
      renderTable([baseProvider])
      await user.click(screen.getByText('Primary Airflow'))
      const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
      const deleteButton = within(drawer).getByRole('button', { name: 'Delete' })
      const footer = deleteButton.closest('footer')

      expect(footer?.children[0]).toContainElement(deleteButton)
      expect(footer?.children[1]).toContainElement(within(drawer).getByRole('button', { name: 'Edit' }))
    })

    it('runs an AIRFLOW connection test in the global result dialog', async () => {
      const user = userEvent.setup()
      testRequest.mockResolvedValue({
        provider_id: baseProvider.id,
        provider_type: 'AIRFLOW',
        ok: true,
        checks: [{ name: 'Connectivity', status: 'ok', detail: 'Connected' }],
      })
      renderTable([baseProvider])
      await user.click(screen.getByText('Primary Airflow'))
      await user.click(screen.getByRole('button', { name: 'Test connection' }))

      const resultDialog = screen.getByRole('dialog', { name: 'Test provider connection' })
      expect(screen.queryByRole('dialog', { name: 'Provider detail' })).not.toBeInTheDocument()
      await waitFor(() => { expect(resultDialog).toHaveTextContent('Connectivity') })
      expect(testRequest).toHaveBeenCalledExactlyOnceWith(baseProvider.id)
      await user.click(within(resultDialog).getByRole('button', { name: 'Close' }))
      expect(screen.getByRole('dialog', { name: 'Provider detail' })).toBeInTheDocument()
    })

    it('requires a credential for AIRFLOW and omits the action for other types', async () => {
      const user = userEvent.setup()
      renderTable([{ ...baseProvider, credentialStatus: 'missing' }, smtpProvider, keycloakProvider])
      await user.click(screen.getByText('Primary Airflow'))
      const testButton = screen.getByRole('button', { name: 'Test connection' })
      expect(testButton).toBeDisabled()
      expect(testButton).toHaveAttribute('title', 'A valid credential is required to test this provider.')
      await user.keyboard('{Escape}')
      await user.click(screen.getByText('Test SMTP'))
      expect(screen.queryByRole('button', { name: 'Test connection' })).not.toBeInTheDocument()
      await user.keyboard('{Escape}')
      await user.click(screen.getByText('Aricoma Keycloak'))
      expect(screen.queryByRole('button', { name: 'Test connection' })).not.toBeInTheDocument()
      expect(testRequest).not.toHaveBeenCalled()
    })
  })
})
