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

  it('shows recovery app policies without orchestration-only controls', async () => {
    render(
      <LanguageProvider>
        <AppMetadataForm
          recoveryAppPolicies={[{
            id: 'critical-daily-latest',
            name: 'Critical - Daily DR Test',
            description: 'Daily recovery test',
            level: 'critical',
            frequencyValue: 1,
            frequencyUnit: 'days',
            retentionValue: 4,
            retentionUnit: 'hours',
            bootVerify: true,
            snapshotSelectionMode: 'latest',
            snapshotMaxAgeValue: null,
            snapshotMaxAgeUnit: null,
            snapshotTargetTime: null,
            enabled: true,
          }]}
        />
      </LanguageProvider>,
    )

    expect(await screen.findByRole('option', {
      name: 'Critical - Daily DR Test (critical-daily-latest)',
    })).toBeInTheDocument()
    expect(screen.queryByLabelText('Airflow platform provider *')).not.toBeInTheDocument()
    expect(screen.queryByText('Push to orchestrator')).not.toBeInTheDocument()
  })

})
