import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
    it.each([
      ['unknown to known', 'source-gone', 'vmware-source', { platform: 'vmware-source' }],
      ['known to unknown', 'vmware-source', '', { platform: '' }],
      ['both unknown', 'source-gone', '', { platform: '' }],
      ['same type with invalid target', 'vmware-source', 'vmware-source-2', { platform: 'vmware-source-2' }],
    ])('emits raw source intent without changing the controlled target: %s', async (_label, source, nextSource, expected) => {
      const onMetadataChange = renderForm(source, 'target-gone')
      fireEvent.change(await screen.findByLabelText('Provider ID *'), { target: { value: nextSource } })
      expect(onMetadataChange).toHaveBeenCalledExactlyOnceWith(expected)
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('target-gone')
    })

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

    it('locks the source and target of a saved application and still names a provider that is gone', async () => {
      const user = userEvent.setup()
      const onMetadataChange = vi.fn()
      render(
        <LanguageProvider>
          <AppMetadataForm
            initialValues={{ fileName: 'finance_app', name: 'Finance', description: 'Primary', environment: 'dev', platform: 'power-target', targetProviderId: 'power-gone' }}
            providers={providers}
            onMetadataChange={onMetadataChange}
            lockProviders
          />
        </LanguageProvider>,
      )

      const source = await screen.findByLabelText('Provider ID *')
      const target = screen.getByLabelText('Target provider ID *')
      expect(source).toBeDisabled()
      expect(target).toBeDisabled()
      expect(source).toHaveValue('power-target')
      expect(screen.getByRole('option', { name: 'Power Target - IBM_POWER' })).toBeInTheDocument()
      expect(target).toHaveValue('power-gone')
      expect(target).toHaveTextContent('power-gone')
      await user.type(screen.getByLabelText('Application Name *'), 'X')
      expect(onMetadataChange).not.toHaveBeenCalledWith(expect.objectContaining({ platform: expect.anything() as unknown }))
    })

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

      expect(onMetadataChange).toHaveBeenLastCalledWith({ platform: 'power-source' })
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

    it('reports another source type without deriving a target reset', async () => {
      const user = userEvent.setup()
      const onMetadataChange = renderForm('vmware-source', 'vmware-target')

      await user.selectOptions(await screen.findByLabelText('Provider ID *'), 'power-source')

      expect(onMetadataChange).toHaveBeenLastCalledWith({ platform: 'power-source' })
      expect(screen.getByLabelText('Target provider ID *')).toHaveValue('vmware-target')
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


describe('application email editing', () => {
  it('keeps all read-only controls locked while technical help remains keyboard accessible', async () => {
    const user = userEvent.setup()
    const onMetadataChange = vi.fn()
    render(<LanguageProvider><AppMetadataForm readOnly helpPlatform="IBM_POWER" onMetadataChange={onMetadataChange} /></LanguageProvider>)
    const sourceHelp = await screen.findByRole('button', { name: 'About Source HMC' })
    for (const control of [...screen.getAllByRole('textbox'), ...screen.getAllByRole('combobox')]) expect(control).toBeDisabled()
    expect(sourceHelp.closest('label')).toBeNull()
    await user.click(sourceHelp)
    expect(await screen.findByRole('dialog', { name: 'Source HMC' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'About Application DAG notifications' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('There is no fallback')
    expect(onMetadataChange).not.toHaveBeenCalled()
  })

  it('replaces an open platform helper when the application context changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<LanguageProvider><AppMetadataForm helpPlatform="VMWARE" /></LanguageProvider>)
    await user.click(await screen.findByRole('button', { name: 'About Source vCenter' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('source provider ID')
    rerender(<LanguageProvider><AppMetadataForm helpPlatform="IBM_POWER" /></LanguageProvider>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'About Source HMC' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('production LPAR')
    rerender(<LanguageProvider><AppMetadataForm helpPlatform={undefined} /></LanguageProvider>)
    expect(screen.getByRole('button', { name: 'About Source compute provider' })).toBeInTheDocument()
  })

  it('keeps a controlled raw address, reports invalid input and supports clearing', async () => {
    function EmailHarness() {
      const [notificationEmail, setEmail] = useState<string | null>('stored@example.test')
      return <LanguageProvider><AppMetadataForm initialValues={{ fileName: 'app', name: 'App', description: 'Description', environment: 'dev', platform: '', notificationEmail }} onMetadataChange={patch => { if (patch.notificationEmail !== undefined) setEmail(patch.notificationEmail) }} /></LanguageProvider>
    }
    const user = userEvent.setup()
    render(<EmailHarness />)
    const input = await screen.findByLabelText('Notification email')
    expect(input).toHaveValue('stored@example.test')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
    await user.clear(input)
    await user.type(input, 'invalid')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Enter a valid email address.')
    await user.clear(input)
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
    expect(input).not.toBeRequired()
  })
})
