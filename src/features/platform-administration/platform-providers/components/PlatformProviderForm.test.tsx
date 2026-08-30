import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlatformProviderForm, type PlatformProviderFormData } from './PlatformProviderForm'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const formData: PlatformProviderFormData = {
  id: 'airflow-1',
  name: 'Production Airflow',
  description: 'Production orchestration',
  type: 'AIRFLOW',
  ipAddress: '10.99.99.40',
  url: 'https://airflow.example.test',
  port: '22',
  dagDir: '/opt/airflow/dags',
  credentialId: 'credential-1',
  vmPrefix: 'airflow-',
  vmTags: ['saved-platform-tag'],
  notificationEmail: 'platform-alerts@example.test',
  fromEmail: '',
  disableSsl: null,
  disableTls: null,
  loggingEnabled: null,
  jwtEnabled: null,
}

describe('PlatformProviderForm', () => {
  it('keeps IP address and port in a responsive grid row', () => {
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const ipField = screen.getByLabelText('IP address').closest('label')
    const portField = screen.getByLabelText('Port').closest('label')
    const row = ipField?.parentElement

    expect(row).toBe(portField?.parentElement)
    expect(row).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_7.5rem]')

    const portInput = screen.getByLabelText('Port')
    expect(screen.getByLabelText('URL')).toHaveValue('https://airflow.example.test')
    expect(portInput).toHaveAttribute('type', 'number')
    expect(portInput).toHaveAttribute('min', '1')
    expect(portInput).toHaveAttribute('max', '65535')
    expect(portInput).toHaveAttribute('step', '1')
  })

  it('renders VM prefix and reports a single selected platform tag', async () => {
    const user = userEvent.setup()
    const onTagsChange = vi.fn()
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={['replacement-platform-tag']}
        tagsDisabled={false}
        onTagsChange={onTagsChange}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('VM prefix')).toHaveValue('airflow-')
    const vmTagsSelect = document.querySelector<HTMLSelectElement>('#platform-provider-vm-tags')
    if (!vmTagsSelect) throw new Error('VM tags select not found')
    expect(vmTagsSelect).toHaveValue('saved-platform-tag')

    await user.selectOptions(vmTagsSelect, 'replacement-platform-tag')
    expect(onTagsChange).toHaveBeenLastCalledWith(['replacement-platform-tag'])

    await user.selectOptions(vmTagsSelect, '')
    expect(onTagsChange).toHaveBeenLastCalledWith([])
  })

  it('renders and reports notification email changes', () => {
    const onChange = vi.fn()
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    const input = screen.getByLabelText('Notification email')
    expect(input).toHaveValue('platform-alerts@example.test')
    fireEvent.change(input, { target: { value: 'new-alerts@example.test' } })
    expect(onChange).toHaveBeenCalledWith('notificationEmail', 'new-alerts@example.test')
  })

  it('renders and reports the optional SMTP fields', () => {
    const onChange = vi.fn()
    render(
      <PlatformProviderForm
        data={{ ...formData, fromEmail: 'airflow@example.com', disableSsl: true, disableTls: false }}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('From email')).toHaveValue('airflow@example.com')
    expect(screen.getByRole('checkbox', { name: 'Disable SSL' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Disable TLS' })).not.toBeChecked()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Disable SSL' }))
    expect(onChange).toHaveBeenCalledWith('disableSsl', false)
  })

  it('renders BACKEND controls and reports explicit boolean changes', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <PlatformProviderForm
        data={{ ...formData, type: 'BACKEND', loggingEnabled: null, jwtEnabled: null }}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable logging' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable JWT' }))

    expect(onChange).toHaveBeenCalledWith('loggingEnabled', true)
    expect(onChange).toHaveBeenCalledWith('jwtEnabled', true)
    expect(screen.getByText('JWT enforcement is not yet implemented on the backend.')).toBeVisible()

    rerender(
      <PlatformProviderForm
        data={{ ...formData, type: 'BACKEND', loggingEnabled: true, jwtEnabled: true }}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={onChange}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable logging' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable JWT' }))
    expect(onChange).toHaveBeenCalledWith('loggingEnabled', false)
    expect(onChange).toHaveBeenCalledWith('jwtEnabled', false)
  })

  it.each(['AIRFLOW', 'SMTP'])('does not render BACKEND controls for %s providers', (type) => {
    render(
      <PlatformProviderForm
        data={{ ...formData, type }}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('checkbox', { name: 'Enable logging' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Enable JWT' })).not.toBeInTheDocument()
  })

  it('uses the compact provider-style rows for platform fields', () => {
    render(
      <PlatformProviderForm
        data={formData}
        errors={{}}
        isSubmitting={false}
        credentials={[]}
        credentialsLoading={false}
        credentialsError={false}
        onRetryCredentials={vi.fn()}
        tags={[]}
        tagsDisabled={false}
        onTagsChange={vi.fn()}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    const idRow = screen.getByLabelText('ID').closest('label')?.parentElement
    const nameRow = screen.getByLabelText('Provider name').closest('label')?.parentElement
    const typeRow = screen.getByLabelText('Type').closest('label')?.parentElement
    const credentialsRow = screen.getByLabelText('Credentials').closest('label')?.parentElement
    const urlRow = screen.getByLabelText('URL').closest('label')?.parentElement
    const dagDirRow = screen.getByLabelText('DAG directory').closest('label')?.parentElement

    expect(idRow).toBe(nameRow)
    expect(typeRow).toBe(credentialsRow)
    expect(urlRow).toBe(dagDirRow)
    expect(idRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
    expect(typeRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
    expect(urlRow).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2')
  })
})
