import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('../api/useCreateCredential', () => ({
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
})
