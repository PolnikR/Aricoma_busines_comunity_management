import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CredentialsTable } from './CredentialsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../api/useDeleteCredential', () => ({
  useDeleteCredential: () => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  }),
}))
vi.mock('./CredentialCreateModal', () => ({
  CredentialCreateModal: ({ credential }: { credential?: { id: string } }) => (
    <div>{credential ? `Editing ${credential.id}` : null}</div>
  ),
}))

describe('CredentialsTable', () => {
  it('opens a shared detail drawer and starts editing from its action', async () => {
    const user = userEvent.setup()
    render(
      <CredentialsTable
        credentials={[{
          id: 'vcenter-admin',
          name: 'vCenter admin',
          description: 'Production account',
          username: 'administrator',
        }]}
        isLoading={false}
        error={null}
      />,
    )

    await user.click(screen.getByText('vCenter admin'))

    expect(screen.getByRole('dialog', { name: 'Credential details' })).toBeInTheDocument()
    expect(screen.getByText('Stored securely and never displayed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Editing vcenter-admin')).toBeInTheDocument()
  })
})
