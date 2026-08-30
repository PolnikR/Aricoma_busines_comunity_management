import { fireEvent, render, screen } from '@testing-library/react'
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
  url: 'https://vcenter.example.test',
  port: '22',
  credentialId: 'vcenter-admin',
  defaultFlashcopyProviderId: '',
  orchestratorConnId: '',
  vmPrefix: 'prod-',
  vmTags: ['saved-tag'],
  notificationEmail: 'provider-alerts@example.test',
  cacheRefreshSeconds: '120',
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
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    )
    await user.type(screen.getByLabelText('Provider name'), 'X')
    await user.selectOptions(screen.getByLabelText('Type'), 'IBM_POWER')
    await user.type(screen.getByLabelText('IP address'), '{Enter}')
    expect(onChange).toHaveBeenCalled()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('URL')).toHaveValue('https://vcenter.example.test')
  })

  it('locks ID and provider type in edit mode and renders validation errors', () => {
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
        typeDisabled
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('provider-1')).toBeDisabled()
    expect(screen.getByLabelText('Type')).toBeDisabled()
    expect(screen.getByText('ID error')).toBeInTheDocument()
  })

  it('renders and reports notification email changes', () => {
    const onChange = vi.fn()

    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Notification email')
    expect(input).toHaveValue('provider-alerts@example.test')
    fireEvent.change(input, { target: { value: 'new-alerts@example.test' } })
    expect(onChange).toHaveBeenCalledWith('notificationEmail', 'new-alerts@example.test')
  })

  it('renders and reports cache refresh interval changes', () => {
    const onChange = vi.fn()

    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText(/Cache refresh interval \(seconds\)/)
    expect(input).toHaveValue(120)
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('step', '1')
    fireEvent.change(input, { target: { value: '60' } })
    expect(onChange).toHaveBeenCalledWith('cacheRefreshSeconds', '60')
  })

  it('renders VM settings and reports a single selected tag', async () => {
    const user = userEvent.setup()
    const onTagsChange = vi.fn()

    render(
      <ProviderCreateForm
        data={data}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={['available-tag', 'replacement-tag']}
        tagsLoading={false}
        tagsError={false}
        tagsDisabled={false}
        onRetryTags={vi.fn()}
        onTagsChange={onTagsChange}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('VM prefix')).toHaveValue('prod-')
    expect(screen.getByLabelText('VM tags')).toHaveValue('saved-tag')

    await user.selectOptions(screen.getByLabelText('VM tags'), 'replacement-tag')
    expect(onTagsChange).toHaveBeenLastCalledWith(['replacement-tag'])

    await user.selectOptions(screen.getByLabelText('VM tags'), '')
    expect(onTagsChange).toHaveBeenLastCalledWith([])
  })
})
