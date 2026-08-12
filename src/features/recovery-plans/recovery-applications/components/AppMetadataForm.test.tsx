import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import { AppMetadataForm } from './AppMetadataForm'

describe('AppMetadataForm', () => {
  beforeEach(() => {
    localStorage.setItem('app-language', 'en')
  })

  it('renders initial values and reports each metadata change', async () => {
    const user = userEvent.setup()
    const onMetadataChange = vi.fn()
    render(
      <LanguageProvider>
        <AppMetadataForm
          initialValues={{
            fileName: 'finance_app',
            policySetId: 'test_1_hour_ps',
            name: 'Finance',
            description: 'Primary',
            environment: 'dev',
            platform: 'airflow-01',
            orchestrationProviderId: '',
          }}
          platformProviders={[{
            id: 'airflow-01',
            name: 'Primary Airflow',
            description: 'DAG orchestration',
            type: 'AIRFLOW',
            ipAddress: '10.99.99.55',
            port: 22,
            dagDir: '/opt/airflow/dags',
            credentialId: 'airflow-ssh',
            credentialStatus: 'ok',
          }]}
          onMetadataChange={onMetadataChange}
        />
      </LanguageProvider>
    )

    const name = await screen.findByLabelText('Application Name *')
    await user.clear(name)
    await user.type(name, 'Billing')
    await user.selectOptions(await screen.findByLabelText('Environment *'), 'prod')

    expect(name).toHaveValue('Billing')
    expect(onMetadataChange).toHaveBeenLastCalledWith({ environment: 'prod' })
    expect(onMetadataChange).toHaveBeenCalledWith({ name: 'Billing' })
  })

  it('disables filename in Edit mode', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm
          initialValues={{
            fileName: 'finance_app',
            policySetId: 'test_1_hour_ps',
            name: 'Finance',
            description: 'Primary',
            environment: 'dev',
            platform: '',
            orchestrationProviderId: '',
          }}
          disableFileName
        />
      </LanguageProvider>
    )

    expect(await screen.findByLabelText('File name *')).toBeDisabled()
  })

  it('marks filename as required', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>
    )

    expect(await screen.findByLabelText('File name *')).toBeRequired()
  })

  it('disables browser autocomplete for application metadata fields', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>
    )

    const fileName = await screen.findByLabelText('File name *')
    const applicationName = screen.getByLabelText('Application Name *')
    const description = screen.getByLabelText('Description *')

    expect(fileName.closest('form')).toHaveAttribute('autocomplete', 'off')
    expect(fileName).toHaveAttribute('autocomplete', 'off')
    expect(applicationName).toHaveAttribute('autocomplete', 'off')
    expect(description).toHaveAttribute('autocomplete', 'off')
  })

  it('reports platform provider selection', async () => {
    const user = userEvent.setup()
    const onMetadataChange = vi.fn()
    render(
      <LanguageProvider>
        <AppMetadataForm
          onMetadataChange={onMetadataChange}
          platformProviders={[{
            id: 'airflow-01',
            name: 'Primary Airflow',
            description: 'DAG orchestration',
            type: 'AIRFLOW',
            ipAddress: '10.99.99.55',
            port: 22,
            dagDir: '/opt/airflow/dags',
            credentialId: 'airflow-ssh',
            credentialStatus: 'ok',
          }]}
        />
      </LanguageProvider>
    )

    await user.selectOptions(await screen.findByLabelText('Airflow platform provider *'), 'airflow-01')

    expect(onMetadataChange).toHaveBeenCalledWith({ orchestrationProviderId: 'airflow-01' })
  })

  it('offers only providers with valid credentials', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm
          platformProviders={[
            {
              id: 'airflow-01', name: 'Primary Airflow', description: '', type: 'AIRFLOW',
              ipAddress: '10.0.0.1', port: 22, dagDir: '/dags', credentialId: 'cred-1',
              credentialStatus: 'ok',
            },
            {
              id: 'airflow-02', name: 'Broken Airflow', description: '', type: 'AIRFLOW',
              ipAddress: '10.0.0.2', port: 22, dagDir: '/dags', credentialId: 'cred-2',
              credentialStatus: 'missing',
            },
          ]}
        />
      </LanguageProvider>,
    )

    expect(await screen.findByRole('option', { name: 'Primary Airflow - AIRFLOW' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Broken Airflow - AIRFLOW' })).not.toBeInTheDocument()
  })
})
