import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { useCredentials } from '@/features/providers-connectors/credentials/hooks/useCredentials'
import { useUpsertPlatformProvider } from '../hooks/useUpsertPlatformProvider'
import { PlatformProvidersModal } from './PlatformProvidersModal'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/providers-connectors/credentials/hooks/useCredentials', () => ({
  useCredentials: vi.fn(),
}))
vi.mock('../hooks/useUpsertPlatformProvider', () => ({
  useUpsertPlatformProvider: vi.fn(),
}))
vi.mock('@/shared/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({
    isNavigationBlocked: false,
    cancelNavigation: vi.fn(),
    confirmNavigation: vi.fn(),
    requestNavigation: (action: () => void) => { action() },
    runWithoutBlocking: (action: () => void) => { action() },
  }),
}))
const emptyCredentialsQuery = {
  data: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
}

const editedProvider = {
  id: 'airflow-1',
  name: 'Production Airflow',
  description: 'Production orchestration',
  type: 'AIRFLOW' as const,
  ipAddress: '10.99.99.40',
  url: 'https://airflow.example.test',
  port: 8443,
  dagDir: '/opt/airflow/dags',
  credentialId: 'credential-1',
  credentialStatus: 'ok' as const,
  vmPrefix: 'airflow-',
  vmTags: ['saved-platform-tag'],
  notificationEmail: 'platform-alerts@example.test',
}

beforeEach(() => {
  vi.mocked(useCredentials).mockReturnValue(emptyCredentialsQuery as unknown as ReturnType<typeof useCredentials>)
  vi.mocked(useUpsertPlatformProvider).mockReturnValue({
    isPending: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useUpsertPlatformProvider>)
})

describe('PlatformProvidersModal', () => {
  it('uses the configured default port when creating a provider', async () => {
    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
      />,
    )

    expect(await screen.findByLabelText('Port')).toHaveValue(22)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('max-w-2xl')
    expect(dialog.querySelector('[class~="overflow-y-auto"]')).not.toBeNull()
    expect(dialog.querySelector('[class~="md:overflow-visible"]')).toBeNull()
  })

  it('keeps the saved port when editing a provider', async () => {
    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={editedProvider}
      />,
    )

    expect(await screen.findByLabelText('Port')).toHaveValue(8443)
    expect(screen.getByLabelText('URL')).toHaveValue('https://airflow.example.test')
    expect(screen.getByLabelText('Notification email')).toHaveValue('platform-alerts@example.test')
    expect(screen.getByLabelText('VM prefix')).toHaveValue('airflow-')
    expect(document.querySelector('#platform-provider-vm-tags')).toHaveValue('saved-platform-tag')
  })

  it('normalizes legacy platform provider VM tags to the first saved tag', async () => {
    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={{ ...editedProvider, vmTags: ['first-tag', 'second-tag'] }}
      />,
    )

    await screen.findByLabelText('Port')
    expect(document.querySelector('#platform-provider-vm-tags')).toHaveValue('first-tag')
  })

  it('submits platform VM settings and sends explicit empty values when cleared', () => {
    const mutate = vi.fn()
    vi.mocked(useUpsertPlatformProvider).mockReturnValue({
      isPending: false,
      mutate,
    } as unknown as ReturnType<typeof useUpsertPlatformProvider>)

    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={editedProvider}
      />,
    )

    fireEvent.change(screen.getByLabelText('VM prefix'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit platform provider/i }))

    const submitted = mutate.mock.calls[0]?.[0] as unknown as {
      provider?: { vmPrefix?: string | null, vmTags?: string[] }
    } | undefined
    expect(submitted?.provider).toMatchObject({ vmPrefix: null, vmTags: ['saved-platform-tag'] })
    expect(submitted?.provider).toMatchObject({ notificationEmail: 'platform-alerts@example.test' })
  })

  it('submits null when notification email is cleared', () => {
    const mutate = vi.fn()
    vi.mocked(useUpsertPlatformProvider).mockReturnValue({
      isPending: false,
      mutate,
    } as unknown as ReturnType<typeof useUpsertPlatformProvider>)

    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={editedProvider}
      />,
    )

    fireEvent.change(screen.getByLabelText('Notification email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit platform provider/i }))

    const submitted = mutate.mock.calls[0]?.[0] as { provider?: { notificationEmail?: unknown } } | undefined
    expect(submitted?.provider?.notificationEmail).toBeNull()
  })

  it('shows the localized save failure title with supported backend detail', () => {
    const mutate = vi.fn()
    vi.mocked(useUpsertPlatformProvider).mockReturnValue({
      isPending: false,
      mutate,
    } as unknown as ReturnType<typeof useUpsertPlatformProvider>)

    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={editedProvider}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit platform provider' }))
    const mutationOptions = mutate.mock.calls[0]?.[1] as { onError?: (error: unknown) => void } | undefined
    if (!mutationOptions?.onError) throw new Error('Mutation error handler was not passed')

    act(() => {
      mutationOptions.onError?.(new Error('Save platform provider request failed with status 409', {
        cause: new OrvalApiError(409, 'Conflict', { detail: 'Platform provider ID is already in use.' }),
      }))
    })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to save platform provider')
    expect(alert).toHaveTextContent('Platform provider ID is already in use.')
    expect(alert).not.toHaveTextContent('status 409')
  })

  it('does not add an unsupported API payload as a save failure description', () => {
    const mutate = vi.fn()
    vi.mocked(useUpsertPlatformProvider).mockReturnValue({
      isPending: false,
      mutate,
    } as unknown as ReturnType<typeof useUpsertPlatformProvider>)

    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={editedProvider}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit platform provider' }))
    const mutationOptions = mutate.mock.calls[0]?.[1] as { onError?: (error: unknown) => void } | undefined
    if (!mutationOptions?.onError) throw new Error('Mutation error handler was not passed')

    act(() => {
      mutationOptions.onError?.(new Error('Save platform provider request failed with status 500', {
        cause: new OrvalApiError(500, 'Internal Server Error', { message: 'Unexpected platform provider failure.' }),
      }))
    })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to save platform provider')
    expect(alert).not.toHaveTextContent('status 500')
    expect(alert).not.toHaveTextContent('Unexpected platform provider failure.')
  })
})
