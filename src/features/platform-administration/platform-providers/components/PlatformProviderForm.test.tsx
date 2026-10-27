import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import translations from '@/locales/en.json'
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

function renderForm(formData: PlatformProviderFormData, onChange = vi.fn(), onSubmit = vi.fn()) {
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
      onSubmit={onSubmit}
    />,
  )
  return onChange
}

function expectAbsent(labels: string[]) {
  for (const label of labels) expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
}

describe('PlatformProviderForm', () => {
  const helpFields = {
    AIRFLOW: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'ipAddress', 'port', 'credentialId', 'dagDir'],
    SMTP: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'ipAddress', 'port', 'fromEmail', 'disableSsl', 'disableTls'],
    BACKEND: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'loggingEnabled', 'jwtEnabled'],
    KEYCLOAK: ['url', 'notificationEmail', 'cacheRefreshSeconds', 'credentialId', 'realm', 'clientId'],
  }
  const helpText = (field: string, suffix: string) => {
    const key = `platformProviders.fieldHelp.${field}.${suffix}`
    return (translations as Record<string, string>)[key] ?? key
  }

  it.each(['AIRFLOW', 'SMTP', 'BACKEND', 'KEYCLOAK'] as const)('has exactly the relevant compact help labels for %s', async type => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    renderForm(data(type), onChange, onSubmit)
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label')).sort())
      .toEqual(helpFields[type].map(field => helpText(field, 'trigger')).sort())
    for (const field of helpFields[type]) {
      const trigger = screen.getByRole('button', { name: helpText(field, 'trigger') })
      expect(trigger.closest('label')).toBeNull()
      expect(trigger.parentElement?.parentElement).toHaveClass('gap-1.5')
      await user.click(trigger)
      expect(screen.getByRole('dialog', { name: helpText(field, 'title') })).toHaveTextContent(helpText(field, 'intro'))
      await user.keyboard('{Escape}')
    }
    expect(onChange).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it.each([
    ['SMTP', ['disableSsl', 'disableTls'], ['Disable SSL', 'Disable TLS']],
    ['BACKEND', ['loggingEnabled', 'jwtEnabled'], ['Enable logging', 'Enable JWT']],
  ] as const)('help does not change %s controls for true, false or unset values', async (type, fields, labels) => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    for (const value of [true, false, null]) {
      const view = render(
        <PlatformProviderForm data={{ ...data(type), disableSsl: value, disableTls: value, loggingEnabled: value, jwtEnabled: value }}
          errors={{}} isSubmitting={false} credentials={[]} credentialsLoading={false} credentialsError={false}
          onRetryCredentials={vi.fn()} onChange={onChange} onSubmit={vi.fn()} />,
      )
      for (const field of fields) {
        const trigger = screen.getByRole('button', { name: helpText(field, 'trigger') })
        await user.click(trigger)
        await user.keyboard('{Escape}')
        await user.keyboard('{Enter}')
        await user.keyboard('{Escape}')
        await user.keyboard(' ')
        await user.keyboard('{Escape}')
      }
      for (const label of labels) expect(screen.getByRole('checkbox', { name: label }).matches(':checked')).toBe(value === true)
      view.unmount()
    }
    expect(onChange).not.toHaveBeenCalled()
  })
  it.each(['AIRFLOW', 'SMTP', 'BACKEND', 'KEYCLOAK'] as const)('renders common inputs once for %s', type => {
    const onChange = renderForm({ ...data(type), notificationEmail: 'alerts@example.test', cacheRefreshSeconds: '60' })
    expect(screen.getAllByLabelText('Notification email')).toHaveLength(1)
    expect(screen.getByLabelText('Notification email')).toHaveAttribute('type', 'email')
    const interval = screen.getByRole('spinbutton', { name: 'Cache refresh interval (seconds)' })
    expect(interval).toHaveAttribute('min', '1')
    expect(interval).toHaveAttribute('step', '1')
    expect(interval).toHaveValue(60)
    fireEvent.change(interval, { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('cacheRefreshSeconds', '')
  })

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
    expectAbsent(['DAG directory', 'Credentials', 'Enable logging', 'Enable JWT', 'Enable Swagger', 'Realm', 'Client ID'])
  })

  it('renders only BACKEND configuration fields and reports all boolean controls', () => {
    const onChange = renderForm({
      ...data('BACKEND'),
      notificationEmail: 'backend@example.test',
      loggingEnabled: true,
      jwtEnabled: false,
    })

    for (const label of ['URL', 'Notification email', 'Enable logging', 'Enable JWT']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expectAbsent(['IP address', 'Port', 'DAG directory', 'Credentials', 'From email', 'Disable SSL', 'Disable TLS', 'Realm', 'Client ID', 'Enable Swagger'])

    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable logging' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enable JWT' }))
    expect(onChange).toHaveBeenCalledWith('loggingEnabled', false)
    expect(onChange).toHaveBeenCalledWith('jwtEnabled', true)
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
    expectAbsent(['IP address', 'Port', 'DAG directory', 'From email', 'Disable SSL', 'Disable TLS', 'Enable logging', 'Enable JWT', 'Enable Swagger'])
  })

  it('keeps AIRFLOW IP and port in the compact responsive row', () => {
    renderForm({ ...data('AIRFLOW'), ipAddress: '10.0.0.1', port: '22' })
    const ipField = screen.getByLabelText('IP address').parentElement?.parentElement
    const portField = screen.getByLabelText('Port').parentElement?.parentElement
    expect(ipField?.parentElement).toBe(portField?.parentElement)
    expect(ipField?.parentElement).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-[minmax(0,1fr)_7.5rem]')
  })
})
