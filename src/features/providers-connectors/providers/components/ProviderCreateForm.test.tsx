import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProviderCreateForm } from './ProviderCreateForm'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const data = {
  id: 'provider-1',
  name: 'Primary',
  description: 'Production provider',
  type: 'VMWARE',
  role: 'source',
  ipAddress: '10.0.0.1',
  port: '22',
  credentialId: 'vcenter-admin',
  defaultFlashcopyProviderId: '',
  orchestratorConnId: '',
}

const credentials = [{
  id: 'vcenter-admin',
  name: 'vCenter admin',
  description: 'Production account',
  username: 'administrator',
}]

describe('ProviderCreateForm', () => {
  it('reports field changes and submits on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByLabelText('Provider name'), 'X')
    await user.selectOptions(screen.getByLabelText('Type'), 'IBM_POWER')
    await user.type(screen.getByLabelText('IP address'), '{Enter}')
    expect(onChange).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('locks ID in edit mode and renders validation errors', () => {
    render(
      <ProviderCreateForm
        data={data}
        errors={{ id: 'ID error' }}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        idDisabled
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('provider-1')).toBeDisabled()
    expect(screen.getByText('ID error')).toBeInTheDocument()
  })
})
