import { useState } from 'react'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { RuntimeConfigurationPanel } from '../components/RuntimeConfigurationPanel'
import { DEFAULT_RUNTIME_CONFIGURATION } from '../mocks/platformProviderConfigMocks'
import type { RuntimeConfiguration } from '../mocks/platformProviderConfigMocks'

export function ConfigurationPage() {
  const [configuration, setConfiguration] = useState<RuntimeConfiguration>(DEFAULT_RUNTIME_CONFIGURATION)
  const [savedConfiguration, setSavedConfiguration] = useState<RuntimeConfiguration>(DEFAULT_RUNTIME_CONFIGURATION)

  const updateConfiguration = (patch: Partial<RuntimeConfiguration>) => {
    setConfiguration(current => ({ ...current, ...patch }))
  }

  const resetField = (field: 'workDirectory' | 'tempDirectory' | 'logDirectory' | 'sessionTimeoutMinutes') => {
    if (field === 'sessionTimeoutMinutes') {
      updateConfiguration({ sessionTimeoutMinutes: configuration.sessionTimeoutDefault })
      return
    }

    const defaultsByField = {
      workDirectory: configuration.workDirectoryDefault,
      tempDirectory: configuration.tempDirectoryDefault,
      logDirectory: configuration.logDirectoryDefault,
    } as const

    updateConfiguration({ [field]: defaultsByField[field] })
  }

  const handleCancel = () => {
    setConfiguration(savedConfiguration)
  }

  const handleSave = () => {
    setSavedConfiguration(configuration)
  }

  const isDirty = JSON.stringify(configuration) !== JSON.stringify(savedConfiguration)

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Platform Administration"
        title="Configuration"
        description="Runtime directories and session behaviour for the recovery platform."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        <RuntimeConfigurationPanel
          configuration={configuration}
          isDirty={isDirty}
          onWorkDirectoryChange={value => { updateConfiguration({ workDirectory: value }) }}
          onTempDirectoryChange={value => { updateConfiguration({ tempDirectory: value }) }}
          onLogDirectoryChange={value => { updateConfiguration({ logDirectory: value }) }}
          onSessionTimeoutChange={value => { updateConfiguration({ sessionTimeoutMinutes: value }) }}
          onResetField={resetField}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
