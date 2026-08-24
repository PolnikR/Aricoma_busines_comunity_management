import type { ChangeEvent } from 'react'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { Field, Select } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'

interface InfrastructureSourceSelectorProps {
  platform: InfrastructureTopologyPlatform
  providers: ProviderRecord[]
  providerId: string
  disabled?: boolean
  onPlatformChange: (platform: InfrastructureTopologyPlatform) => void
  onProviderChange: (providerId: string) => void
}

export function InfrastructureSourceSelector({
  platform,
  providers,
  providerId,
  disabled = false,
  onPlatformChange,
  onProviderChange,
}: InfrastructureSourceSelectorProps) {
  const { t } = useTranslation()
  const handlePlatformChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onPlatformChange(event.target.value as InfrastructureTopologyPlatform)
  }

  return (
    <div className="mb-4 grid shrink-0 gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm sm:grid-cols-2 lg:max-w-2xl">
      <Field htmlFor="infrastructure-platform" label={t('topology.source.platformLabel')}>
        <Select
          id="infrastructure-platform"
          value={platform}
          disabled={disabled}
          onChange={handlePlatformChange}
        >
          <option value="vmware">{t('topology.source.vmware')}</option>
          <option value="ibm-power">{t('topology.source.ibmPower')}</option>
          <option value="flashsystem">{t('topology.source.flashsystem')}</option>
        </Select>
      </Field>

      <Field htmlFor="infrastructure-provider" label={t('topology.source.providerLabel')}>
        <Select
          id="infrastructure-provider"
          value={providerId}
          disabled={disabled || providers.length === 0}
          onChange={(event) => { onProviderChange(event.target.value) }}
        >
          {providers.length === 0 ? (
            <option value="">{t('topology.source.noProviders')}</option>
          ) : null}
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} ({provider.id})
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
