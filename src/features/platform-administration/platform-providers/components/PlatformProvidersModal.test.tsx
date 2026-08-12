import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  })

  it('keeps the saved port when editing a provider', async () => {
    render(
      <PlatformProvidersModal
        open
        onClose={vi.fn()}
        existingProviders={[]}
        provider={{
          id: 'airflow-1',
          name: 'Production Airflow',
          description: 'Production orchestration',
          type: 'AIRFLOW',
          ipAddress: '10.99.99.40',
          port: 8443,
          dagDir: '/opt/airflow/dags',
          credentialId: 'credential-1',
          credentialStatus: 'ok',
        }}
      />,
    )

    expect(await screen.findByLabelText('Port')).toHaveValue(8443)
  })
})
