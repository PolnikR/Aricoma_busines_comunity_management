import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '@/contexts/LanguageProvider'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { sourceProviderIdOf } from '../utils/sourceProvider'
import { AppMetadataForm } from './AppMetadataForm'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

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

  it.each([
    ['source_provider_id', { platform: 'IBM_POWER', source_provider_id: 'ibm-power-01' }, 'ibm-power-01'],
    ['a legacy provider id in platform', { platform: 'vmware-vcenter-01' }, 'vmware-vcenter-01'],
  ])('selects the stored provider from %s', async (_label, stored, expected) => {
    const providers = [
      { id: 'vmware-vcenter-01', name: 'VMware Source', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
      { id: 'ibm-power-01', name: 'IBM Power Source', type: 'IBM_POWER', role: 'source', credentialStatus: 'ok' },
    ] as ProviderRecord[]
    render(
      <LanguageProvider>
        <AppMetadataForm
          initialValues={{
            fileName: 'finance_app',
            name: 'Finance',
            description: 'Primary',
            environment: 'dev',
            platform: sourceProviderIdOf(stored),
          }}
          providers={providers}
        />
      </LanguageProvider>
    )

    expect(await screen.findByLabelText('Provider ID *')).toHaveValue(expected)
  })

  describe('target provider', () => {
    const providers = [
      { id: 'vmware-source', name: 'VMware Source', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
      { id: 'vmware-source-2', name: 'VMware Source 2', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
      { id: 'vmware-target', name: 'VMware Target', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
      { id: 'power-source', name: 'Power Source', type: 'IBM_POWER', role: 'source', credentialStatus: 'ok' },
      { id: 'power-target', name: 'Power Target', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
    ] as ProviderRecord[]

    // Applies every reported change, like the builder does, since the form shows
    // the source and target its parent passes in.
    function Harness({ platform, targetProviderId, onMetadataChange }: {
      platform: string
      targetProviderId: string
      onMetadataChange: (metadata: Partial<RecoveryApplicationFormState>) => void
    }) {
      const [values, setValues] = useState({ platform, targetProviderId })
      return (
        <AppMetadataForm
          initialValues={{ fileName: 'finance_app', name: 'Finance', description: 'Primary', environment: 'dev', ...values }}
          providers={providers}
          onMetadataChange={metadata => {
            onMetadataChange(metadata)
            setValues(current => ({
              platform: metadata.platform ?? current.platform,
              targetProviderId: metadata.targetProviderId ?? current.targetProviderId,
            }))
          }}
        />
      )
    }

    function renderForm(platform: string, targetProviderId: string, onMetadataChange = vi.fn()) {
      render(
        <LanguageProvider>
          <Harness platform={platform} targetProviderId={targetProviderId} onMetadataChange={onMetadataChange} />
        </LanguageProvider>,
      )
      return onMetadataChange
    }

    it('shows the source its parent keeps, so a declined change leaves the old provider selected', async () => {
      const user = userEvent.setup()
      const onMetadataChange = vi.fn()
      render(
        <LanguageProvider>
          <AppMetadataForm
            initialValues={{ fileName: 'finance_app', name: 'Finance', description: 'Primary', environment: 'dev', platform: 'vmware-source', targetProviderId: 'vmware-target' }}
            providers={providers}
            onMetadataChange={onMetadataChange}
          />
        </LanguageProvider>,
      )

      await user.selectOptions(await screen.findByLabelText('Provider ID *'), 'power-source')

      expect(onMetadataChange).toHaveBeenLastCalledWith({ platform: 'power-source', targetProviderId: '' })
      expect(screen.getByLabelText('Provider ID *')).toHaveValue('vmware-source')
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('vmware-target')
    })

    it('is disabled until a source provider is selected', async () => {
      renderForm('', '')
      expect(await screen.findByLabelText('Target provider ID *')).toBeDisabled()
    })

    it('offers target providers of the source type and reports the selection', async () => {
      const user = userEvent.setup()
      const onMetadataChange = renderForm('vmware-source', '')
      const target = await screen.findByLabelText('Target provider ID *')

      expect([...target.querySelectorAll('option')].map(option => option.value)).toEqual(['', 'vmware-target'])
      await user.selectOptions(target, 'vmware-target')
      expect(onMetadataChange).toHaveBeenLastCalledWith({ targetProviderId: 'vmware-target' })
    })

    it('offers the selected IBM Power provider itself as the target', async () => {
      renderForm('power-source', '')
      const target = await screen.findByLabelText('Target provider ID *')

      expect([...target.querySelectorAll('option')].map(option => option.value)).toEqual(['', 'power-source', 'power-target'])
    })

    it('clears the target when the source changes to another provider type', async () => {
      const user = userEvent.setup()
      const onMetadataChange = renderForm('vmware-source', 'vmware-target')

      await user.selectOptions(await screen.findByLabelText('Provider ID *'), 'power-source')

      expect(onMetadataChange).toHaveBeenLastCalledWith({ platform: 'power-source', targetProviderId: '' })
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('')
    })

    it('keeps the target when the source changes within the same provider type', async () => {
      const user = userEvent.setup()
      const onMetadataChange = renderForm('vmware-source', 'vmware-target')

      await user.selectOptions(await screen.findByLabelText('Provider ID *'), 'vmware-source-2')

      expect(onMetadataChange).toHaveBeenLastCalledWith({ platform: 'vmware-source-2' })
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('vmware-target')
    })
  })
})
