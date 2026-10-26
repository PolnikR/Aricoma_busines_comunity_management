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
  credentialId: 'vcenter-admin',
  vmPrefix: 'prod-',
  vmTags: ['saved-tag'],
  backingStorageProviderIds: [],
  partnerProviderId: '',
  managedSystem: '',
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
        onBackingStorageChange={vi.fn()}
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
    expect(screen.queryByLabelText('Port')).not.toBeInTheDocument()
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
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByDisplayValue('provider-1')).toBeDisabled()
    expect(screen.getByLabelText('Type')).toBeDisabled()
    expect(screen.getByText('ID error')).toBeInTheDocument()
    expect(screen.queryByLabelText('Orchestrator connection ID')).not.toBeInTheDocument()
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
        onBackingStorageChange={vi.fn()}
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
        onBackingStorageChange={vi.fn()}
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

  it.each([
    ['VMWARE', true, false],
    ['IBM_POWER', true, false],
    ['FLASHCOPY', false, true],
    ['HITACHI', false, false],
    ['', false, false],
    ['unknown', false, false],
  ])('shows the relationship fields that %s supports (backing=%s, partner=%s)', (type, backing, partner) => {
    render(
      <ProviderCreateForm
        data={{ ...data, type }}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        backingStorageProviders={[{ id: 'hitachi-a', name: 'Hitachi A' }]}
        partnerProviders={[{ id: 'provider-1', name: 'Self' }, { id: 'flash-b', name: 'Array B' }]}
        onTagsChange={vi.fn()}
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Backing storage providers' }) !== null).toBe(backing)
    expect(screen.queryByLabelText('VM prefix') !== null).toBe(type === 'VMWARE')
    expect(screen.queryByLabelText('VM tags') !== null).toBe(type === 'VMWARE')
    expect(screen.queryByLabelText('Managed system') !== null).toBe(type === 'IBM_POWER')
    for (const label of ['Description', 'IP address', 'Role', 'URL', 'Notification email', 'Credentials']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    const partnerSelect = screen.queryByLabelText('Partner FlashSystem provider')
    expect(partnerSelect !== null).toBe(partner)
    if (partnerSelect) {
      expect([...partnerSelect.querySelectorAll('option')].map(option => option.value)).toEqual(['', 'flash-b'])
    }
  })

  it('keeps all saved tags available and reports additions and removals', async () => {
    const user = userEvent.setup()
    const onTagsChange = vi.fn()

    render(
      <ProviderCreateForm
        data={{ ...data, vmTags: ['saved-tag', 'missing-tag'] }}
        errors={{}}
        isSubmitting={false}
        credentials={credentials}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={['available-tag', 'saved-tag', 'saved-tag']}
        tagsLoading={false}
        tagsError={false}
        tagsDisabled={false}
        onRetryTags={vi.fn()}
        onTagsChange={onTagsChange}
        onBackingStorageChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('VM prefix')).toHaveValue('prod-')
    await user.click(screen.getByRole('button', { name: 'VM tags' }))
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'saved-tag' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'missing-tag' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'available-tag' }))
    expect(onTagsChange).toHaveBeenLastCalledWith(['saved-tag', 'missing-tag', 'available-tag'])

    await user.click(screen.getByRole('checkbox', { name: 'saved-tag' }))
    expect(onTagsChange).toHaveBeenLastCalledWith(['missing-tag'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox', { name: 'missing-tag' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'VM tags' })).toHaveFocus()
  })
})
