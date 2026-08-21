import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CredentialsTable } from './credentials/components/CredentialsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const deleteCredentialState = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: new Error('Credential is still referenced by a provider'),
}))
vi.mock('./credentials/hooks/useDeleteCredential', () => ({
  useDeleteCredential: () => deleteCredentialState,
}))
vi.mock('./credentials/components/CredentialCreateModal', () => ({
  CredentialCreateModal: () => null,
}))

describe('CredentialsTable delete error', () => {
  it('renders the shared error alert when deleting a credential fails', () => {
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
  })
})
