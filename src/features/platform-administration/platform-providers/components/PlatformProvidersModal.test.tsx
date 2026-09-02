import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useCredentials } from '@/features/providers-connectors/credentials/hooks/useCredentials'
import { useUpsertPlatformProvider } from '../hooks/useUpsertPlatformProvider'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'
import { PlatformProvidersModal } from './PlatformProvidersModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/providers-connectors/credentials/hooks/useCredentials', () => ({ useCredentials: vi.fn() }))
vi.mock('../hooks/useUpsertPlatformProvider', () => ({ useUpsertPlatformProvider: vi.fn() }))
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
  vi.mocked(useUpsertPlatformProvider).mockReturnValue({
    isPending: false,
    mutate,
  } as unknown as ReturnType<typeof useUpsertPlatformProvider>)
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: /platform provider/i }))
}

function submittedProvider(mutate: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const mutationInput = mutate.mock.calls[0]?.[0] as unknown as { provider?: unknown } | undefined
  if (!mutationInput?.provider || typeof mutationInput.provider !== 'object') {
    throw new Error('Platform provider mutation payload missing')
  }
  return mutationInput.provider as Record<string, unknown>
}

beforeEach(() => {
  vi.mocked(useCredentials).mockReturnValue(emptyCredentialsQuery as unknown as ReturnType<typeof useCredentials>)
  setMutate(vi.fn())
})

describe('PlatformProvidersModal', () => {
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
    expect(screen.getByLabelText('Notification email')).toHaveValue('platform-alerts@example.test')
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
    expect(screen.getByLabelText('Notification email')).toHaveValue('backend@example.test')
    expect(screen.getByRole('checkbox', { name: 'Enable logging' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Enable JWT' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Enable Swagger' })).toBeChecked()
    expect(screen.queryByLabelText('IP address')).not.toBeInTheDocument()
  })

  it('prefills KEYCLOAK edit fields', () => {
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={keycloakProvider} />)
    expect(screen.getByLabelText('Realm')).toHaveValue('aricoma')
    expect(screen.getByLabelText('Client ID')).toHaveValue('abco-be')
    expect(screen.getByLabelText('Credentials')).toHaveValue('keycloak-admin')
    expect(screen.queryByLabelText('Port')).not.toBeInTheDocument()
  })

  it('submits an exact AIRFLOW payload and sends null when notification email is cleared', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={airflowProvider} />)
    fireEvent.change(screen.getByLabelText('Notification email'), { target: { value: '' } })
    clickSave()

    expect(mutate.mock.calls[0]?.[0]).toEqual({
      provider: {
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
      },
    })
  })

  it('submits an exact BACKEND payload and preserves false flags', () => {
    const mutate = vi.fn()
    setMutate(mutate)
    render(<PlatformProvidersModal open onClose={vi.fn()} existingProviders={[]} provider={backendProvider} />)
    clickSave()

    expect(mutate.mock.calls[0]?.[0]).toEqual({
      provider: {
        id: 'backend',
        name: 'ABCo API',
        description: 'Backend service',
        type: 'BACKEND',
        url: 'http://backend.example.test',
        notificationEmail: 'backend@example.test',
        loggingEnabled: true,
        jwtEnabled: false,
        swaggerEnabled: true,
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
      notificationEmail: null,
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
