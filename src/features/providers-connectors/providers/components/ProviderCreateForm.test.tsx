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
  ipAddress: '10.0.0.1',
}

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
        idDisabled
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('textbox', { name: /ID/ })).toBeDisabled()
    expect(screen.getByText('ID error')).toBeInTheDocument()
  })
})
