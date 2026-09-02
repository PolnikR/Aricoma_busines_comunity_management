import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_PLATFORM_PROVIDER_FORM } from '../model/platformProviderForm'
import type { PlatformProviderFormData } from '../model/platformProviderForm'
import { PlatformProviderForm } from './PlatformProviderForm'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function data(type: PlatformProviderFormData['type']): PlatformProviderFormData {
  return {
    ...EMPTY_PLATFORM_PROVIDER_FORM,
    id: 'provider-1',
    name: 'Provider',
    description: 'Description',
    type,
    url: 'https://provider.example.test',
  }
}

function renderForm(formData: PlatformProviderFormData, onChange = vi.fn()) {
  render(
    <PlatformProviderForm
      data={formData}
      errors={{}}
      isSubmitting={false}
      credentials={[
        { id: 'credential-1', name: 'Credential 1', username: 'admin', credentialStatus: 'ok' } as never,
      ]}
      credentialsLoading={false}
      credentialsError={false}
      onRetryCredentials={vi.fn()}
      onChange={onChange}
      onSubmit={vi.fn()}
    />,
  )
  return onChange
}

function expectAbsent(labels: string[]) {
  for (const label of labels) expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
}

describe('PlatformProviderForm', () => {
  it('offers only the four platform-provider types', () => {
    renderForm(data(''))
    const select = screen.getByLabelText('Type')
    if (!(select instanceof HTMLSelectElement)) throw new Error('Platform provider type select not found')
    const options = Array.from(select.options).map(option => option.value)
    expect(options).toEqual(['', 'AIRFLOW', 'SMTP', 'BACKEND', 'KEYCLOAK'])
  })

  it('renders only AIRFLOW configuration fields', () => {
    renderForm({
      ...data('AIRFLOW'),
      ipAddress: '10.0.0.1',
      port: '22',
      dagDir: '/opt/airflow/dags',
      credentialId: 'credential-1',
      notificationEmail: 'platform@example.test',
    })

    for (const label of ['URL', 'IP address', 'Port', 'DAG directory', 'Credentials', 'Notification email']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expectAbsent(['From email', 'Disable SSL', 'Disable TLS', 'Enable logging', 'Enable JWT', 'Enable Swagger', 'Realm', 'Client ID'])
  })

  it('renders only SMTP configuration fields', () => {
    renderForm({
      ...data('SMTP'),
      ipAddress: '10.0.0.2',
      port: '1025',
      fromEmail: 'airflow@example.test',
      disableSsl: true,
      disableTls: false,
    })

    for (const label of ['URL', 'IP address', 'Port', 'From email', 'Disable SSL', 'Disable TLS']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByRole('checkbox', { name: 'Disable SSL' })).toBeChecked()
    expectAbsent(['DAG directory', 'Credentials', 'Notification email', 'Enable logging', 'Enable JWT', 'Enable Swagger', 'Realm', 'Client ID'])
  })

  it('renders only BACKEND configuration fields and reports all boolean controls', () => {
    const onChange = renderForm({
      ...data('BACKEND'),
      notificationEmail: 'backend@example.test',
      loggingEnabled: true,
      jwtEnabled: false,
      swaggerEnabled: true,
    })

    for (const label of ['URL', 'Notification email', 'Enable logging', 'Enable JWT', 'Enable Swagger']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expectAbsent(['IP address', 'Port', 'DAG directory', 'Credentials', 'From email', 'Disable SSL', 'Disable TLS', 'Realm', 'Client ID'])

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable logging' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable JWT' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Swagger' }))
    expect(onChange).toHaveBeenCalledWith('loggingEnabled', false)
    expect(onChange).toHaveBeenCalledWith('jwtEnabled', true)
    expect(onChange).toHaveBeenCalledWith('swaggerEnabled', false)
  })

  it('renders only KEYCLOAK configuration fields and preserves a missing credential option', () => {
    renderForm({
      ...data('KEYCLOAK'),
      realm: 'aricoma',
      clientId: 'abco-be',
      credentialId: 'missing-credential',
    })

    for (const label of ['URL', 'Realm', 'Client ID', 'Credentials']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Credentials')).toHaveValue('missing-credential')
    expectAbsent(['IP address', 'Port', 'DAG directory', 'Notification email', 'From email', 'Disable SSL', 'Disable TLS', 'Enable logging', 'Enable JWT', 'Enable Swagger'])
  })

  it('keeps AIRFLOW IP and port in the compact responsive row', () => {
    renderForm({ ...data('AIRFLOW'), ipAddress: '10.0.0.1', port: '22' })
    const ipField = screen.getByLabelText('IP address').closest('label')
    const portField = screen.getByLabelText('Port').closest('label')
    expect(ipField?.parentElement).toBe(portField?.parentElement)
    expect(ipField?.parentElement).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_7.5rem]')
  })
})
