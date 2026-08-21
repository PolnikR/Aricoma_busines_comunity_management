import type { ChangeEvent } from 'react'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import { PROVIDER_ROLES, PROVIDER_TYPES } from '../model/providerTypes'
import type { ProviderRecord } from '../model/providerTypes'
import type { CredentialRecord } from '../../credentials/model/credentialTypes'

export interface ProviderCreateFormData {
  id: string
  name: string
  description: string
  type: string
  role: string
  ipAddress: string
  url: string
  port: string
  credentialId: string
  defaultFlashcopyProviderId: string
  orchestratorConnId: string
  vmPrefix: string
  vmTags: string[]
}

interface ProviderCreateFormProps {
  data: ProviderCreateFormData
  errors: Partial<Record<keyof ProviderCreateFormData, string>>
  isSubmitting: boolean
  // Locks the ID field (edit mode): changing an existing id would create a new
  // provider rather than update the current one.
  idDisabled?: boolean
  typeDisabled?: boolean
  credentials: CredentialRecord[]
  credentialsLoading: boolean
  credentialsError: boolean
  onRetryCredentials: () => void
  tags?: string[]
  tagsLoading?: boolean
  tagsError?: boolean
  tagsDisabled?: boolean
  onRetryTags?: () => void
  flashcopyProviders?: ProviderRecord[]
  onChange: (field: keyof ProviderCreateFormData, value: string) => void
  onTagsChange: (tags: string[]) => void
  onIdBlur?: () => void
  onSubmit: () => void
}

// Presentational form for creating or editing a provider.
export function ProviderCreateForm({
  data,
  errors,
  isSubmitting,
  idDisabled = false,
  typeDisabled = false,
  credentials,
  credentialsLoading,
  credentialsError,
  onRetryCredentials,
  tags = [],
  tagsLoading = false,
  tagsError = false,
  tagsDisabled = false,
  onRetryTags,
  flashcopyProviders = [],
  onChange,
  onTagsChange,
  onIdBlur,
  onSubmit,
}: ProviderCreateFormProps) {
  const { t } = useTranslation()
  const selectedCredentialIsMissing = Boolean(
    data.credentialId && !credentials.some(credential => credential.id === data.credentialId),
  )
  const selectedVmTag = data.vmTags[0] ?? ''
  const vmTagOptions = selectedVmTag && !tags.includes(selectedVmTag)
    ? [selectedVmTag, ...tags]
    : tags
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="space-y-4 px-6 py-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.id')} htmlFor="create-id">
          <Input
            id="create-id"
            type="text"
            placeholder={t('forms.idExample')}
            value={data.id}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }}
            onBlur={onIdBlur}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting || idDisabled}
            aria-invalid={Boolean(errors.id)}
          />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>

        <Field label={t('forms.name')} htmlFor="create-name">
          <Input
            id="create-name"
            type="text"
            placeholder={t('forms.nameExample')}
            value={data.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('forms.description')} htmlFor="create-description">
        <Input
          id="create-description"
          type="text"
          placeholder={t('forms.descriptionExample')}
          value={data.description}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('description', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.type')} htmlFor="create-type">
          <Select
            id="create-type"
            value={data.type}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('type', event.target.value) }}
            disabled={isSubmitting || typeDisabled}
            aria-invalid={Boolean(errors.type)}
          >
            <option value="">{t('forms.typeSelect')}</option>
            {PROVIDER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          {errors.type ? <p className="mt-1 text-xs text-red-600">{errors.type}</p> : null}
        </Field>

        <Field label={t('forms.role')} htmlFor="create-role">
          <Select
            id="create-role"
            value={data.role}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('role', event.target.value) }}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.role)}
          >
            <option value="">{t('forms.roleSelect')}</option>
            {PROVIDER_ROLES.map((role) => (
              <option key={role} value={role}>{t(`forms.role.${role}`)}</option>
            ))}
          </Select>
          {errors.role ? <p className="mt-1 text-xs text-red-600">{errors.role}</p> : null}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <Field label={t('forms.ip')} htmlFor="create-ipAddress">
          <Input
            id="create-ipAddress"
            type="text"
            placeholder={t('forms.ipExample')}
            value={data.ipAddress}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('ipAddress', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.ipAddress)}
          />
          {errors.ipAddress ? <p className="mt-1 text-xs text-red-600">{errors.ipAddress}</p> : null}
        </Field>

        <Field label={t('forms.port')} htmlFor="create-port">
          <Input
            id="create-port"
            type="number"
            min={1}
            max={65535}
            step={1}
            value={data.port}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('port', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.port)}
          />
          {errors.port ? <p className="mt-1 text-xs text-red-600">{errors.port}</p> : null}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.vmPrefix')} htmlFor="create-vmPrefix">
          <Input
            id="create-vmPrefix"
            type="text"
            value={data.vmPrefix}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('vmPrefix', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.vmPrefix)}
          />
          {errors.vmPrefix ? <p className="mt-1 text-xs text-red-600">{errors.vmPrefix}</p> : null}
        </Field>

        <Field label={t('forms.vmTags')} htmlFor="create-vmTags">
          <Select
            id="create-vmTags"
            value={selectedVmTag}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onTagsChange(event.target.value ? [event.target.value] : [])
            }}
            disabled={isSubmitting || tagsDisabled}
          >
            <option value="">{t('forms.vmTagsSelect')}</option>
            {vmTagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </Select>
          {tagsLoading ? <p className="mt-1 text-xs text-text-muted" role="status">{t('providers.tags.loading')}</p> : null}
          {tagsError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {t('providers.tags.loadFailed')}{' '}
              {onRetryTags ? (
                <button type="button" className="font-semibold underline" onClick={onRetryTags}>
                  {t('buttons.retry')}
                </button>
              ) : null}
            </p>
          ) : null}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.credentials')} htmlFor="create-credentials">
          <Select
            id="create-credentials"
            value={data.credentialId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('credentialId', event.target.value) }}
            disabled={isSubmitting || credentialsLoading || credentialsError}
          >
            <option value="">
              {credentialsLoading ? t('providers.credentials.loading') : t('forms.credentialsSelect')}
            </option>
            {selectedCredentialIsMissing ? (
              <option value={data.credentialId}>
                {t('providers.credentials.unavailable').replace('{id}', data.credentialId)}
              </option>
            ) : null}
            {credentials.map(credential => (
              <option key={credential.id} value={credential.id}>
                {credential.name} — {credential.username}
              </option>
            ))}
          </Select>
          {credentialsError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {t('providers.credentials.loadFailed')}{' '}
              <button type="button" className="font-semibold underline" onClick={onRetryCredentials}>
                {t('buttons.retry')}
              </button>
            </p>
          ) : null}
        </Field>

        <Field label={t('forms.defaultFlashcopyProvider')} htmlFor="create-defaultFlashcopyProviderId">
          <Select
            id="create-defaultFlashcopyProviderId"
            value={data.defaultFlashcopyProviderId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('defaultFlashcopyProviderId', event.target.value) }}
            disabled={isSubmitting}
          >
            <option value="">{t('forms.optionalSelect')}</option>
            {data.defaultFlashcopyProviderId && !flashcopyProviders.some(provider => provider.id === data.defaultFlashcopyProviderId) ? (
              <option value={data.defaultFlashcopyProviderId}>{data.defaultFlashcopyProviderId} ({t('forms.unavailable')})</option>
            ) : null}
            {flashcopyProviders.map(provider => (
              <option key={provider.id} value={provider.id}>{provider.name} — {provider.id}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.url')} htmlFor="create-url">
          <Input
            id="create-url"
            type="url"
            value={data.url}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('url', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.url)}
          />
          {errors.url ? <p className="mt-1 text-xs text-red-600">{errors.url}</p> : null}
        </Field>

        <Field label={t('forms.orchestratorConnId')} htmlFor="create-orchestratorConnId">
          <Input
            id="create-orchestratorConnId"
            type="text"
            placeholder={t('forms.orchestratorConnIdExample')}
            value={data.orchestratorConnId}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('orchestratorConnId', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </Field>
      </div>
    </div>
  )
}
