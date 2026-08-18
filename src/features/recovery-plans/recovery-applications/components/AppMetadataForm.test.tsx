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
            name: 'Finance',
            description: 'Primary',
            environment: 'dev',
            platform: 'airflow-01',
          }}
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

  it('flags an application name containing a space as invalid', async () => {
    const user = userEvent.setup()
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>
    )

    const name = await screen.findByLabelText('Application Name *')
    await user.type(name, 'init_test app')

    expect(screen.getByText('Use letters, numbers, dashes, dots, and underscores only; no spaces.')).toBeInTheDocument()
  })

  it('disables filename in Edit mode', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm
          initialValues={{
            fileName: 'finance_app',
            name: 'Finance',
            description: 'Primary',
            environment: 'dev',
            platform: '',
          }}
          disableFileName
        />
      </LanguageProvider>
    )

    expect(await screen.findByLabelText('ID *')).toBeDisabled()
  })

  it('marks filename as required', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>
    )

    expect(await screen.findByLabelText('ID *')).toBeRequired()
  })

  it('disables browser autocomplete for application metadata fields', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>
    )

    const fileName = await screen.findByLabelText('ID *')
    const applicationName = screen.getByLabelText('Application Name *')
    const description = screen.getByLabelText('Description *')

    expect(fileName.closest('form')).toHaveAttribute('autocomplete', 'off')
    expect(fileName).toHaveAttribute('autocomplete', 'off')
    expect(applicationName).toHaveAttribute('autocomplete', 'off')
    expect(description).toHaveAttribute('autocomplete', 'off')
  })

  it('keeps policy and orchestration controls outside the metadata form', () => {
    render(
      <LanguageProvider>
        <AppMetadataForm />
      </LanguageProvider>,
    )

    expect(screen.queryByLabelText('Policy set *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Airflow platform provider *')).not.toBeInTheDocument()
    expect(screen.queryByText('Push to orchestrator')).not.toBeInTheDocument()
  })

  it('keeps an unknown backend environment selectable during edit', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm
          initialValues={{
            fileName: 'finance_app',
            name: 'Finance',
            description: 'Primary',
      environment: 'production',
            platform: 'airflow-01',
          }}
        />
      </LanguageProvider>,
    )

    const environment = await screen.findByLabelText('Environment *')
    expect(environment).toHaveValue('production')
    expect(screen.getByRole('option', { name: 'production' })).toBeInTheDocument()
  })

})
