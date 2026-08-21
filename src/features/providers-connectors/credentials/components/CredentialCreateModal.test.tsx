import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type {
  CredentialFormData,
  CredentialSubmitPayload,
} from '../model/credentialTypes'
import { CredentialCreateModal } from './CredentialCreateModal'

const mutate = vi.fn()
const createEncryptedCredentialPayload = vi.fn<
  (form: CredentialFormData) => Promise<CredentialSubmitPayload>
>()

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useBlocker: () => ({ state: 'unblocked' as const }),
  }
})
vi.mock('../hooks/useCreateCredential', () => ({
  useCreateCredential: () => ({ mutate, isPending: false }),
}))
vi.mock('../api/credentialsApi', () => ({
  createEncryptedCredentialPayload: (form: CredentialFormData) => createEncryptedCredentialPayload(form),
}))

describe('CredentialCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createEncryptedCredentialPayload.mockResolvedValue({
      id: 'vcenter-admin',
      name: 'vCenter admin',
      description: 'Production account',
      username: 'administrator',
      password: 'encrypted-password',
      password_encrypted: true,
    })
  })

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup()
    render(
      <CredentialCreateModal
        open
        existingCredentials={[]}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Create credential' })).toHaveClass('max-w-md')
    await user.click(screen.getByRole('button', { name: 'Create credential' }))

    expect(screen.getByText('Credential ID is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByText('Password confirmation is required.')).toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('does not encrypt or submit when the passwords differ', async () => {
    const user = userEvent.setup()
    render(
      <CredentialCreateModal
        open
        existingCredentials={[]}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Credential ID *'), 'vcenter-admin')
    await user.type(screen.getByLabelText('Name *'), 'vCenter admin')
    await user.type(screen.getByLabelText('Description *'), 'Production account')
    await user.type(screen.getByLabelText('Username *'), 'administrator')
    const password = document.querySelector<HTMLInputElement>('#credential-password')
    const confirmation = document.querySelector<HTMLInputElement>('#credential-confirmPassword')
    if (!password || !confirmation) throw new Error('Password inputs were not rendered')
    await user.type(password, 'secret')
    await user.type(confirmation, 'different')
    await user.click(screen.getByRole('button', { name: 'Create credential' }))

    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(createEncryptedCredentialPayload).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('submits the password only through the credential mutation', async () => {
    const user = userEvent.setup()
    render(
      <CredentialCreateModal
        open
        existingCredentials={[]}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Credential ID *'), 'vcenter-admin')
    await user.type(screen.getByLabelText('Name *'), 'vCenter admin')
    await user.type(screen.getByLabelText('Description *'), 'Production account')
    await user.type(screen.getByLabelText('Username *'), 'administrator')
    const password = document.querySelector<HTMLInputElement>('#credential-password')
    const confirmation = document.querySelector<HTMLInputElement>('#credential-confirmPassword')
    if (!password || !confirmation) throw new Error('Password inputs were not rendered')
    await user.type(password, 'secret')
    await user.type(confirmation, 'secret')
    await user.click(screen.getByRole('button', { name: 'Create credential' }))

    expect(createEncryptedCredentialPayload).toHaveBeenCalledWith(
      {
        id: 'vcenter-admin',
        name: 'vCenter admin',
        description: 'Production account',
        username: 'administrator',
        password: 'secret',
      },
    )
    expect(mutate).toHaveBeenCalledWith(
      {
        id: 'vcenter-admin',
        name: 'vCenter admin',
        description: 'Production account',
        username: 'administrator',
        password: 'encrypted-password',
        password_encrypted: true,
      },
      expect.objectContaining({}),
    )
  })

  it('shows a contextual alert with nested backend validation detail after submission fails', async () => {
    const user = userEvent.setup()
    render(
      <CredentialCreateModal
        open
        existingCredentials={[]}
        onClose={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Credential ID *'), 'vcenter-admin')
    await user.type(screen.getByLabelText('Name *'), 'vCenter admin')
    await user.type(screen.getByLabelText('Description *'), 'Production account')
    await user.type(screen.getByLabelText('Username *'), 'administrator')
    const password = document.querySelector<HTMLInputElement>('#credential-password')
    const confirmation = document.querySelector<HTMLInputElement>('#credential-confirmPassword')
    if (!password || !confirmation) throw new Error('Password inputs were not rendered')
    await user.type(password, 'secret')
    await user.type(confirmation, 'secret')
    await user.click(screen.getByRole('button', { name: 'Create credential' }))

    await waitFor(() => { expect(mutate).toHaveBeenCalledOnce() })
    const mutationOptions = mutate.mock.calls[0]?.[1] as { onError?: (error: unknown) => void } | undefined
    if (!mutationOptions?.onError) throw new Error('Mutation error handler was not passed')

    act(() => {
      mutationOptions.onError?.(new Error('Submit credential request failed with status 422', {
        cause: new OrvalApiError(422, 'Unprocessable Entity', {
          detail: [{ loc: ['body', 'id'], msg: 'Credential ID already exists.' }],
        }),
      }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Credential could not be created securely.')
    expect(screen.getByRole('alert')).toHaveTextContent('Credential ID already exists.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('status 422')
  })

  it('prefills metadata, locks the id and requires a new password when editing', async () => {
    const user = userEvent.setup()
    render(
      <CredentialCreateModal
        open
        credential={{
          id: 'vcenter-admin',
          name: 'vCenter admin',
          description: 'Production account',
          username: 'administrator',
        }}
        existingCredentials={[]}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Credential ID *')).toBeDisabled()
    expect(screen.getByLabelText('Name *')).toHaveValue('vCenter admin')
    await user.click(screen.getByRole('button', { name: 'Save credential' }))

    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(screen.getByText('Password confirmation is required.')).toBeInTheDocument()
    expect(createEncryptedCredentialPayload).not.toHaveBeenCalled()
  })

  it('ignores backdrop clicks and warns before discarding dirty form data', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <CredentialCreateModal
        open
        existingCredentials={[]}
        onClose={onClose}
      />,
    )

    const backdrop = document.querySelector('[aria-hidden="true"]')
    if (!backdrop) throw new Error('Modal backdrop was not rendered')
    await user.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Name *'), 'Changed name')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('dialog', {
      name: 'Discard unsaved credential changes?',
    })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Stay' }))
    expect(screen.queryByRole('dialog', {
      name: 'Discard unsaved credential changes?',
    })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByRole('dialog', {
      name: 'Discard unsaved credential changes?',
    })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
