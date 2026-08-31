import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { CredentialsTable } from './CredentialsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useDeleteCredential', () => ({
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
  it('keeps credential table chrome visible and skeletonizes only rows while loading', () => {
    render(
      <CredentialsTable
        credentials={[]}
        isLoading
        error={null}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search credentials' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Credential' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Username' })).toBeVisible()
    expect(screen.getByRole('status', { name: 'Loading credentials' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
  })

  it('keeps the table toolbar available and retries when loading credentials fails', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <CredentialsTable
        credentials={[]}
        isLoading={false}
        error={new Error('credential service internals')}
        isRetrying={false}
        onRetry={onRetry}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('credential service internals')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows nested backend detail while retaining the credentials retry state', () => {
    const error = new Error('Get credentials request failed with status 422', {
      cause: new OrvalApiError(422, 'Unprocessable Entity', {
        detail: [{ loc: ['query', 'scope'], msg: 'Credential scope is invalid.' }],
      }),
    })
    render(
      <CredentialsTable
        credentials={[]}
        isLoading={false}
        error={error}
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Credentials could not be loaded.')
    expect(screen.getByRole('alert')).toHaveTextContent('Credential scope is invalid.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('status 422')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

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
        isRetrying={false}
        onRetry={vi.fn()}
      />,
    )

    await user.click(screen.getByText('vCenter admin'))

    expect(screen.getByRole('dialog', { name: 'Credential details' })).toBeInTheDocument()
    expect(screen.getByText('Stored securely and never displayed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Editing vcenter-admin')).toBeInTheDocument()
  })
})
