import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { isValidRecoveryApplicationFileName } from '../utils/recoveryApplicationFileName'
import { getEligibleSourceProviders, getEligiblePlatformProviders } from '../utils/eligibleProviders'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'

interface AppMetadataFormProps {
  onMetadataChange?: (metadata: Partial<RecoveryApplicationFormState>) => void
  initialValues?: {
    fileName: string
    name: string
    description: string
    environment: 'dev' | 'staging' | 'prod'
    platform: string
    orchestrationProviderId: string
  }
  providers?: ProviderRecord[]
  providersLoading?: boolean
  providersError?: Error | null
  onRetryProviders?: () => void
  platformProviders?: PlatformProviderRecord[]
  platformProvidersLoading?: boolean
  platformProvidersError?: Error | null
  onRetryPlatformProviders?: () => void
  disableFileName?: boolean
}

export function AppMetadataForm({
  onMetadataChange,
  initialValues,
  providers = [],
  providersLoading = false,
  providersError = null,
  onRetryProviders,
  platformProviders = [],
  platformProvidersLoading = false,
  platformProvidersError = null,
  onRetryPlatformProviders,
  disableFileName = false,
}: AppMetadataFormProps) {
  const { t } = useTranslation()
  const [fileName, setFileName] = useState(initialValues?.fileName ?? '')
  const [name, setName] = useState(initialValues?.name ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [environment, setEnvironment] = useState<'dev' | 'staging' | 'prod'>(
    initialValues?.environment ?? 'dev'
  )
  const [platform, setPlatform] = useState(initialValues?.platform ?? '')
  const [orchestrationProviderId, setOrchestrationProviderId] = useState(
    initialValues?.orchestrationProviderId ?? '',
  )
  const eligibleProviders = getEligibleSourceProviders(providers)
  const selectedPlatformIsMissing = Boolean(
    platform && !eligibleProviders.some(provider => provider.id === platform),
  )
  const eligiblePlatformProviders = getEligiblePlatformProviders(platformProviders)
  const selectedOrchestrationProviderIsMissing = Boolean(
    orchestrationProviderId
    && !eligiblePlatformProviders.some(provider => provider.id === orchestrationProviderId),
  )

  const handleChange = (field: string, value: string) => {
    switch (field) {
      case 'fileName':
        setFileName(value)
        onMetadataChange?.({ fileName: value })
        break
      case 'name':
        setName(value)
        onMetadataChange?.({ name: value })
        break
      case 'description':
        setDescription(value)
        onMetadataChange?.({ description: value })
        break
      case 'environment':
        setEnvironment(value as 'dev' | 'staging' | 'prod')
        onMetadataChange?.({ environment: value as 'dev' | 'staging' | 'prod' })
        break
      case 'platform':
        setPlatform(value)
        onMetadataChange?.({ platform: value })
        break
      case 'orchestrationProviderId':
        setOrchestrationProviderId(value)
        onMetadataChange?.({ orchestrationProviderId: value })
        break
    }
  }

  return (
    <form
      autoComplete="off"
      className="grid grid-cols-1 gap-4 items-end sm:grid-cols-2 xl:grid-cols-5"
    >
      <Field label={t('recovery.application.form.fileName')} htmlFor="application-file-name">
        <Input
          id="application-file-name"
          type="text"
          autoComplete="off"
          value={fileName}
          onChange={e => { handleChange('fileName', e.target.value); }}
          placeholder={t('recovery.application.form.fileNamePlaceholder')}
          invalid={Boolean(fileName) && !isValidRecoveryApplicationFileName(fileName)}
          disabled={disableFileName}
          required
        />
        {fileName && !isValidRecoveryApplicationFileName(fileName) ? (
          <p className="mt-1 text-xs text-red-600">
            {t('recovery.application.validation.fileNameInvalid')}
          </p>
        ) : null}
      </Field>

      <Field label={t('forms.applicationName')} htmlFor="application-name">
        <Input
          id="application-name"
          type="text"
          autoComplete="off"
          value={name}
          onChange={e => { handleChange('name', e.target.value); }}
          placeholder={t('forms.applicationNameExample')}
          required
        />
      </Field>

      <Field label={t('forms.applicationDescription')} htmlFor="application-description">
        <Input
          id="application-description"
          type="text"
          autoComplete="off"
          value={description}
          onChange={e => { handleChange('description', e.target.value); }}
          placeholder={t('forms.applicationDescriptionExample')}
          required
        />
      </Field>

      <Field label={t('forms.environment')} htmlFor="application-environment">
        <Select
          id="application-environment"
          value={environment}
          onChange={e => { handleChange('environment', e.target.value); }}
          required
        >
          <option value="dev">{t('forms.environmentDev')}</option>
          <option value="staging">{t('forms.environmentStaging')}</option>
          <option value="prod">{t('forms.environmentProd')}</option>
        </Select>
      </Field>

      <Field label={t('forms.platform')} htmlFor="application-platform">
        <Select
          id="application-platform"
          value={platform}
          onChange={e => { handleChange('platform', e.target.value); }}
          disabled={providersLoading || providersError !== null}
          required
        >
          <option value="">
            {providersLoading ? t('platformProviders.loading') : t('forms.platformSelect')}
          </option>
          {selectedPlatformIsMissing ? (
            <option value={platform}>{t('providers.credentials.unavailable').replace('{id}', platform)}</option>
          ) : null}
          {eligibleProviders.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.type}
            </option>
          ))}
        </Select>
        {providersError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {t('platformProviders.loadFailed')}{' '}
            {onRetryProviders ? (
              <button type="button" className="font-semibold underline" onClick={onRetryProviders}>
                {t('buttons.retry')}
              </button>
            ) : null}
          </p>
        ) : null}
      </Field>

      <Field label={t('forms.platformProvider')} htmlFor="application-platform-provider">
        <Select
          id="application-platform-provider"
          value={orchestrationProviderId}
          onChange={e => { handleChange('orchestrationProviderId', e.target.value); }}
          disabled={platformProvidersLoading || platformProvidersError !== null}
          required
        >
          <option value="">
            {platformProvidersLoading ? t('platformProviders.loading') : t('forms.platformProviderSelect')}
          </option>
          {selectedOrchestrationProviderIsMissing ? (
            <option value={orchestrationProviderId}>
              {t('providers.credentials.unavailable').replace('{id}', orchestrationProviderId)}
            </option>
          ) : null}
          {eligiblePlatformProviders.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.type}
            </option>
          ))}
        </Select>
        {platformProvidersError ? (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {t('platformProviders.loadFailed')}{' '}
            {onRetryPlatformProviders ? (
              <button type="button" className="font-semibold underline" onClick={onRetryPlatformProviders}>
                {t('buttons.retry')}
              </button>
            ) : null}
          </p>
        ) : null}
      </Field>
    </form>
  )
}
