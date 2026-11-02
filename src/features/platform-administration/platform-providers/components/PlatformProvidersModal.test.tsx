import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import translations from '@/locales/en.json'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useGetCredentials } from '@/generated/query/credentials/credentials.gen'
import { useSubmitPlatformProvider } from '@/generated/query/platform-providers/platform-providers.gen'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersModal } from './PlatformProvidersModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/credentials/credentials.gen', () => ({ useGetCredentials: vi.fn() }))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({ useSubmitPlatformProvider: vi.fn() }))
vi.mock('@/shared/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({
    isNavigationBlocked: false,
    cancelNavigation: vi.fn(),
    confirmNavigation: vi.fn(),
    requestNavigation: (action: () => void) => { action() },
    runWithoutBlocking: (action: () => void) => { action() },
  }),
}))

const airflowProvider: PlatformProviderRecord = {
  id: 'airflow-1',
  name: 'Production Airflow',
  description: 'Production orchestration',
  type: 'AIRFLOW',
  role: 'source',
  url: 'https://airflow.example.test',
  ipAddress: '10.99.99.40',
  port: 8443,
  dagDir: '/opt/airflow/dags',
  credentialId: 'credential-1',
  notificationEmail: 'platform-alerts@example.test',
  credentialStatus: 'ok',
}

const smtpProvider: PlatformProviderRecord = {
  id: 'smtp-1',
  name: 'SMTP',
  description: 'Mail relay',
  type: 'SMTP',
  role: 'source',
  url: 'http://smtp.example.test',
  ipAddress: '10.99.99.53',
  port: 1025,
  fromEmail: 'airflow@example.com',
  disableSsl: true,
  disableTls: false,
  credentialStatus: 'none',
}

const backendProvider: PlatformProviderRecord = {
  id: 'backend',
  name: 'ABCo API',
  description: 'Backend service',
  type: 'BACKEND',
  role: 'source', port: 22,
  url: 'http://backend.example.test',
  notificationEmail: 'backend@example.test',
  loggingEnabled: true,
  jwtEnabled: false,
  swaggerEnabled: true,
  credentialStatus: 'none',
}

const keycloakProvider: PlatformProviderRecord = {
  id: 'keycloak-1',
  name: 'Keycloak',
  description: 'Identity provider',
  type: 'KEYCLOAK',
  role: 'source', port: 22,
  url: 'http://keycloak.example.test',
  realm: 'aricoma',
  clientId: 'abco-be',
  credentialId: 'keycloak-admin',
  credentialStatus: 'ok',
}

const emptyCredentialsQuery = {
  data: [
    { id: 'credential-1', name: 'Airflow credential', username: 'airflow' },
    { id: 'keycloak-admin', name: 'Keycloak admin', username: 'admin' },
  ],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

function setMutate(mutate: ReturnType<typeof vi.fn>) {
  vi.mocked(useSubmitPlatformProvider).mockReturnValue({
    isPending: false,
    mutate,
  } as unknown as ReturnType<typeof useSubmitPlatformProvider>)
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /^(create|edit) platform provider$/i }))
}

function submittedProvider(mutate: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const mutationInput = mutate.mock.calls[0]?.[0] as unknown as { data?: unknown } | undefined
  if (!mutationInput?.data || typeof mutationInput.data !== 'object') {
    throw new Error('Platform provider mutation payload missing')
  }
  return mutationInput.data as Record<string, unknown>
}

beforeEach(() => {
  vi.mocked(useGetCredentials).mockReturnValue(emptyCredentialsQuery as unknown as ReturnType<typeof useGetCredentials>)
  setMutate(vi.fn())
})

describe('PlatformProvidersModal', () => {
  const providers = [airflowProvider, smtpProvider, backendProvider, keycloakProvider]
  const helpFields = {
    AIRFLOW: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'ipAddress', 'port', 'credentialId', 'dagDir'],
    SMTP: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'ipAddress', 'port', 'fromEmail', 'disableSsl', 'disableTls'],
    BACKEND: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'loggingEnabled', 'jwtEnabled'],
    KEYCLOAK: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'credentialId', 'realm', 'clientId'],
  }
  const helpText = (field: string, suffix: string) => {
    const key = `platformProviders.fieldHelp.${field}.${suffix}`
    return (translations as Record<string, string>)[key] ?? key
  }

  describe.each(['create', 'edit'] as const)('%s help', mode => {
    it.each(providers)('keeps the exact field help set for $type and updates it on type changes', async provider => {
      const user = userEvent.setup()
      const mutate = vi.fn()
      setMutate(mutate)
      render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} {...(mode === 'edit' ? { provider } : {})} />)
      if (mode === 'create') fireEvent.change(screen.getByLabelText('Type'), { target: { value: provider.type } })
      for (const targetType of [provider.type, 'AIRFLOW', 'SMTP', 'BACKEND', 'KEYCLOAK'] as const) {
        fireEvent.change(screen.getByLabelText('Type'), { target: { value: targetType } })
        const expected = helpFields[targetType].map(field => helpText(field, 'trigger')).sort()
        expect(screen.getAllByRole('button').filter(button => button.hasAttribute('aria-haspopup'))
          .map(button => button.getAttribute('aria-label')).sort()).toEqual(expected)
      }
      for (const field of helpFields.KEYCLOAK) {
        await user.click(screen.getByRole('button', { name: helpText(field, 'trigger') }))
        expect(screen.getByRole('dialog', { name: helpText(field, 'title') })).toHaveTextContent(helpText(field, 'intro'))
        await user.keyboard('{Escape}')
      }
      expect(screen.getByLabelText('Type')).toHaveValue('KEYCLOAK')
      expect(mutate).not.toHaveBeenCalled()
    })
  })

  it.each(providers)('prefills and submits exact edit values after help for $type', async provider => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={{ ...provider, notificationEmail: 'alerts@example.test', cacheRefreshSeconds: 60 }} />)
    expect(screen.getByLabelText(/^Notification email/)).toHaveValue('alerts@example.test')
    expect(screen.getByLabelText(/^Cache refresh interval/)).toHaveValue(60)
    for (const field of helpFields[provider.type]) {
      await user.click(screen.getByRole('button', { name: helpText(field, 'trigger') }))
      await user.keyboard('{Escape}')
    }
    expect(mutate).not.toHaveBeenCalled()
    clickSave()
    const expectedSettings = {
      AIRFLOW: { ipAddress: '10.99.99.40', port: 8443, dagDir: '/opt/airflow/dags', credentialId: 'credential-1' },
      SMTP: { ipAddress: '10.99.99.53', port: 1025, fromEmail: 'airflow@example.com', disableSsl: true, disableTls: false },
      BACKEND: { loggingEnabled: true, jwtEnabled: false },
      KEYCLOAK: { realm: 'aricoma', clientId: 'abco-be', credentialId: 'keycloak-admin' },
    }
    expect(submittedProvider(mutate)).toEqual({
      id: provider.id, name: provider.name, description: provider.description, type: provider.type, url: provider.url,
      notificationEmail: 'alerts@example.test', cacheRefreshSeconds: 60, ...expectedSettings[provider.type],
    })
  })

  it.each(providers)('creates $type with optional common fields empty after help', async provider => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} />)
    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'new-provider' } })
    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'New provider' } })
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: provider.type } })
    expect(screen.getByLabelText(/^Notification email/)).toHaveValue('')
    expect(screen.getByLabelText(/^Cache refresh interval/)).toHaveValue(null)
    if (provider.type === 'AIRFLOW') fireEvent.change(screen.getByLabelText('DAG directory'), { target: { value: '/dags' } })
    if (provider.type === 'KEYCLOAK') {
      fireEvent.change(screen.getByLabelText('Realm'), { target: { value: 'realm' } })
      fireEvent.change(screen.getByLabelText('Credentials'), { target: { value: 'keycloak-admin' } })
    }
    await user.click(screen.getByRole('button', { name: helpText('url', 'trigger') }))
    await user.keyboard('{Escape}')
    expect(mutate).not.toHaveBeenCalled()
    clickSave()
    expect(submittedProvider(mutate)).toMatchObject({ notificationEmail: null, cacheRefreshSeconds: null })
  })

  it.each(providers)('preserves common values through every target type from $type', provider => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={{ ...provider, notificationEmail: 'alerts@example.test', cacheRefreshSeconds: 60 }} />)
    for (const target of providers) {
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: target.type } })
      expect(screen.getByLabelText(/^Notification email/)).toHaveValue('alerts@example.test')
      expect(screen.getByLabelText(/^Cache refresh interval/)).toHaveValue(60)
    }
  })

  it.each(providers)('validates and clears common fields for $type', provider => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={{ ...provider, cacheRefreshSeconds: 60 }} />)
    fireEvent.change(screen.getByLabelText(/^Notification email/), { target: { value: 'invalid-email' } })
    clickSave()
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address.')).toBeVisible()
    fireEvent.change(screen.getByLabelText(/^Notification email/), { target: { value: '' } })
    for (const value of ['0', '-1', '1.5']) {
      fireEvent.change(screen.getByLabelText(/^Cache refresh interval/), { target: { value } })
      clickSave()
      expect(mutate).not.toHaveBeenCalled()
      expect(screen.getByText('Enter a positive whole number.')).toBeVisible()
    }
    fireEvent.change(screen.getByLabelText(/^Cache refresh interval/), { target: { value: '1' } })
    clickSave()
    expect(submittedProvider(mutate)).toMatchObject({ notificationEmail: null, cacheRefreshSeconds: 1 })
    mutate.mockClear()
    fireEvent.change(screen.getByLabelText(/^Cache refresh interval/), { target: { value: '' } })
    clickSave()
    expect(submittedProvider(mutate)).toMatchObject({ notificationEmail: null, cacheRefreshSeconds: null })
  })

  it('starts AIRFLOW with the default port after the type is selected', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} />)
    expect(screen.queryByLabelText('Port')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'AIRFLOW' } })
    expect(screen.getByLabelText('Port')).toHaveValue(22)
  })

  it('prefills AIRFLOW edit fields without unrelated fields', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={airflowProvider} />)
    expect(screen.getByLabelText('Port')).toHaveValue(8443)
    expect(screen.getByLabelText('DAG directory')).toHaveValue('/opt/airflow/dags')
    expect(screen.getByLabelText('Credentials')).toHaveValue('credential-1')
    expect(screen.getByLabelText(/^Notification email/)).toHaveValue('platform-alerts@example.test')
    expect(screen.queryByLabelText('From email')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Enable logging')).not.toBeInTheDocument()
  })

  it('prefills SMTP edit fields without AIRFLOW fields', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={smtpProvider} />)
    expect(screen.getByLabelText('From email')).toHaveValue('airflow@example.com')
    expect(screen.getByRole('checkbox', { name: 'Disable SSL' })).toBeChecked()
    expect(screen.queryByLabelText('DAG directory')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Credentials')).not.toBeInTheDocument()
  })

  it('prefills BACKEND controls including Swagger', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={backendProvider} />)
    expect(screen.getByLabelText(/^Notification email/)).toHaveValue('backend@example.test')
    expect(screen.getByRole('checkbox', { name: 'Enable logging' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Enable JWT' })).not.toBeChecked()
    expect(screen.queryByRole('checkbox', { name: 'Enable Swagger' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('IP address')).not.toBeInTheDocument()
  })

  it('prefills KEYCLOAK edit fields', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={keycloakProvider} />)
    expect(screen.getByLabelText('Realm')).toHaveValue('aricoma')
    expect(screen.getByLabelText('Client ID')).toHaveValue('abco-be')
    expect(screen.getByLabelText('Credentials')).toHaveValue('keycloak-admin')
    expect(screen.queryByLabelText('Port')).not.toBeInTheDocument()
  })

  it('blocks save and shows an error for an invalid notification email', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={airflowProvider} />)
    fireEvent.change(screen.getByLabelText(/^Notification email/), { target: { value: 'not-an-email' } })
    clickSave()

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  })

  it('submits an exact AIRFLOW payload after help and sends null when notification email is cleared', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={airflowProvider} />)
    fireEvent.change(screen.getByLabelText(/^Notification email/), { target: { value: '' } })
    for (const field of helpFields.AIRFLOW) {
      await user.click(screen.getByRole('button', { name: helpText(field, 'trigger') }))
      await user.keyboard('{Escape}')
    }
    expect(mutate).not.toHaveBeenCalled()
    clickSave()

    expect(mutate.mock.calls[0]?.[0]).toEqual({
      data: {
        id: 'airflow-1',
        name: 'Production Airflow',
        description: 'Production orchestration',
        type: 'AIRFLOW',
        url: 'https://airflow.example.test',
        ipAddress: '10.99.99.40',
        port: 8443,
        dagDir: '/opt/airflow/dags',
        credentialId: 'credential-1',
        notificationEmail: null,
        cacheRefreshSeconds: null,
      },
    })
  })

  it('submits an exact BACKEND payload after help, preserves false flags and omits Swagger', async () => {
    const user = userEvent.setup()
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={backendProvider} />)
    expect(screen.queryByRole('checkbox', { name: 'Enable Swagger' })).not.toBeInTheDocument()
    for (const field of helpFields.BACKEND) {
      await user.click(screen.getByRole('button', { name: helpText(field, 'trigger') }))
      await user.keyboard('{Escape}')
    }
    expect(mutate).not.toHaveBeenCalled()
    clickSave()

    expect(mutate.mock.calls[0]?.[0]).toEqual({
      data: {
        id: 'backend',
        name: 'ABCo API',
        description: 'Backend service',
        type: 'BACKEND',
        url: 'http://backend.example.test',
        notificationEmail: 'backend@example.test',
        cacheRefreshSeconds: null,
        loggingEnabled: true,
        jwtEnabled: false,
      },
    })
  })

  it('drops BACKEND fields after switching to AIRFLOW', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={backendProvider} />)

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'AIRFLOW' } })
    fireEvent.change(screen.getByLabelText('DAG directory'), { target: { value: '/new/dags' } })
    clickSave()

    const payload = submittedProvider(mutate)
    expect(payload).toEqual({
      id: 'backend',
      name: 'ABCo API',
      description: 'Backend service',
      type: 'AIRFLOW',
      url: 'http://backend.example.test',
      ipAddress: null,
      port: 22,
      dagDir: '/new/dags',
      credentialId: null,
      notificationEmail: 'backend@example.test',
      cacheRefreshSeconds: null,
    })
    expect(payload).not.toHaveProperty('loggingEnabled')
    expect(payload).not.toHaveProperty('jwtEnabled')
    expect(payload).not.toHaveProperty('swaggerEnabled')
  })

  it('drops SMTP fields after switching to KEYCLOAK', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={smtpProvider} />)

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'KEYCLOAK' } })
    fireEvent.change(screen.getByLabelText('Realm'), { target: { value: 'aricoma' } })
    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'abco-be' } })
    fireEvent.change(screen.getByLabelText('Credentials'), { target: { value: 'keycloak-admin' } })
    clickSave()

    const payload = submittedProvider(mutate)
    expect(payload).toEqual({
      id: 'smtp-1',
      name: 'SMTP',
      description: 'Mail relay',
      type: 'KEYCLOAK',
      notificationEmail: null,
      cacheRefreshSeconds: null,
      url: 'http://smtp.example.test',
      realm: 'aricoma',
      clientId: 'abco-be',
      credentialId: 'keycloak-admin',
    })
    expect(payload).not.toHaveProperty('fromEmail')
    expect(payload).not.toHaveProperty('disableSsl')
    expect(payload).not.toHaveProperty('disableTls')
  })

  it('validates only fields relevant to the selected type', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={keycloakProvider} />)
    fireEvent.change(screen.getByLabelText('Realm'), { target: { value: '' } })
    clickSave()
    expect(screen.getByText('Realm is required')).toBeVisible()
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.queryByText('DAG directory is required')).not.toBeInTheDocument()
  })

  it('shows a supported backend detail after save failure', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={airflowProvider} />)
    clickSave()
    const options = mutate.mock.calls[0]?.[1] as { onError?: (error: unknown) => void } | undefined
    if (!options?.onError) throw new Error('Mutation error handler missing')

    act(() => {
      options.onError?.(new Error('Save failed', {
        cause: new OrvalApiError(409, 'Conflict', { detail: 'Platform provider ID is already in use.' }),
      }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Platform provider ID is already in use.')
  })
})
