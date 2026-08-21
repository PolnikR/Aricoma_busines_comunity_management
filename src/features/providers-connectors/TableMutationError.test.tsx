import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { CredentialsTable } from './credentials/components/CredentialsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const deleteCredentialState = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null as Error | null,
}))
vi.mock('./credentials/hooks/useDeleteCredential', () => ({
  useDeleteCredential: () => deleteCredentialState,
}))
vi.mock('./credentials/components/CredentialCreateModal', () => ({
  CredentialCreateModal: () => null,
}))

describe('CredentialsTable delete error', () => {
  it('renders nested FastAPI detail in the shared error alert when deleting a credential fails', () => {
    deleteCredentialState.error = new Error('Delete credential request failed with status 422', {
      cause: new OrvalApiError(422, 'Unprocessable Entity', {
        detail: [{ loc: ['path', 'credential_id'], msg: 'Credential is still referenced by a provider.' }],
      }),
    })
    render(
      <CredentialsTable
        credentials={[]}
        isLoading={false}
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Delete credential')
    expect(screen.getByRole('alert')).toHaveTextContent('Credential is still referenced by a provider')
    expect(screen.getByRole('alert')).not.toHaveTextContent('status 422')
  })
})
