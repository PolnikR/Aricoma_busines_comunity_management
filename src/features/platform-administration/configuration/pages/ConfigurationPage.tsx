import { useState } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { PlatformProviderConfigList } from '../components/PlatformProviderConfigList'
import { PlatformProviderConfigPanel } from '../components/PlatformProviderConfigPanel'
import { PLATFORM_PROVIDER_CONFIG_MOCKS } from '../mocks/platformProviderConfigMocks'
import type { PlatformProviderConfig } from '../mocks/platformProviderConfigMocks'

export function ConfigurationPage() {
  const [providers, setProviders] = useState<PlatformProviderConfig[]>(PLATFORM_PROVIDER_CONFIG_MOCKS)
  const [savedProviders, setSavedProviders] = useState<PlatformProviderConfig[]>(PLATFORM_PROVIDER_CONFIG_MOCKS)
  const [selectedProviderId, setSelectedProviderId] = useState(PLATFORM_PROVIDER_CONFIG_MOCKS[0]?.id ?? '')

  const selectedProvider = providers.find(provider => provider.id === selectedProviderId)
  const savedSelectedProvider = savedProviders.find(provider => provider.id === selectedProviderId)

  const updateSelectedProvider = (patch: Partial<PlatformProviderConfig>) => {
    setProviders(prev => prev.map(provider => (
      provider.id === selectedProviderId ? { ...provider, ...patch } : provider
    )))
  }

  const resetField = (field: 'workDirectory' | 'tempDirectory' | 'logDirectory' | 'sessionTimeoutMinutes') => {
    if (!selectedProvider) return

    if (field === 'sessionTimeoutMinutes') {
      updateSelectedProvider({ sessionTimeoutMinutes: selectedProvider.sessionTimeoutDefault })
      return
    }

    const defaultsByField = {
      workDirectory: selectedProvider.workDirectoryDefault,
      tempDirectory: selectedProvider.tempDirectoryDefault,
      logDirectory: selectedProvider.logDirectoryDefault,
    } as const

    updateSelectedProvider({ [field]: defaultsByField[field] })
  }

  const handleCancel = () => {
    if (!savedSelectedProvider) return
    updateSelectedProvider(savedSelectedProvider)
  }

  const handleSave = () => {
    if (!selectedProvider) return
    setSavedProviders(prev => prev.map(provider => (
      provider.id === selectedProviderId ? selectedProvider : provider
    )))
  }

  const isDirty = Boolean(
    selectedProvider
    && savedSelectedProvider
    && JSON.stringify(selectedProvider) !== JSON.stringify(savedSelectedProvider),
  )

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Platform Administration"
        title="Configuration"
        description="Runtime directories and session behaviour for each connected platform provider."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 lg:flex-row">
        <PlatformProviderConfigList
          providers={providers}
          selectedProviderId={selectedProviderId}
          onSelect={setSelectedProviderId}
        />

        {selectedProvider ? (
          <PlatformProviderConfigPanel
            provider={selectedProvider}
            isDirty={isDirty}
            onWorkDirectoryChange={value => { updateSelectedProvider({ workDirectory: value }) }}
            onTempDirectoryChange={value => { updateSelectedProvider({ tempDirectory: value }) }}
            onLogDirectoryChange={value => { updateSelectedProvider({ logDirectory: value }) }}
            onSessionTimeoutChange={value => { updateSelectedProvider({ sessionTimeoutMinutes: value }) }}
            onAutoRenewChange={value => { updateSelectedProvider({ autoRenewOnActivity: value }) }}
            onResetField={resetField}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : null}
      </div>
    </div>
  )
}
