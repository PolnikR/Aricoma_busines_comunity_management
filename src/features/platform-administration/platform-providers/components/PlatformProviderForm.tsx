import type { ChangeEvent } from 'react'
import { CheckboxField, Field, Input, Select } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import { PLATFORM_PROVIDER_TYPES } from '../model/platformProviderTypes'
import type { CredentialRecord } from '@/features/providers-connectors/credentials/model/credentialTypes'

export interface PlatformProviderFormData {
  id: string
  name: string
  description: string
  type: string
  ipAddress: string
  url: string
  port: string
  dagDir: string
  credentialId: string
  vmPrefix: string
  vmTags: string[]
  notificationEmail: string
  fromEmail: string
  disableSsl: boolean | null
  disableTls: boolean | null
  loggingEnabled: boolean | null
  jwtEnabled: boolean | null
  realm: string
  clientId: string
}

interface PlatformProviderFormProps {
  data: PlatformProviderFormData
  errors: Partial<Record<keyof PlatformProviderFormData, string>>
  isSubmitting: boolean
  idDisabled?: boolean
  credentials: CredentialRecord[]
  credentialsLoading: boolean
  credentialsError: boolean
  onRetryCredentials: () => void
  tags?: string[]
  tagsDisabled?: boolean
  onChange: (field: keyof PlatformProviderFormData, value: string | boolean) => void
  onTagsChange: (tags: string[]) => void
  onSubmit: () => void
}

export function PlatformProviderForm({
  data,
  errors,
  isSubmitting,
  idDisabled = false,
  credentials,
  credentialsLoading,
  credentialsError,
  onRetryCredentials,
  tags = [],
  tagsDisabled = false,
  onChange,
  onTagsChange,
  onSubmit,
}: PlatformProviderFormProps) {
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
        <Field label={t('forms.id')} htmlFor="platform-provider-id">
        <Input
          id="platform-provider-id"
          value={data.id}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting || idDisabled}
          aria-invalid={Boolean(errors.id)}
        />
        {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>

        <Field label={t('forms.name')} htmlFor="platform-provider-name">
        <Input
          id="platform-provider-name"
          value={data.name}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('forms.description')} htmlFor="platform-provider-description">
        <Input
          id="platform-provider-description"
          value={data.description}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('description', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.description)}
        />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.type')} htmlFor="platform-provider-type">
        <Select
          id="platform-provider-type"
          value={data.type}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('type', event.target.value) }}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.type)}
        >
          <option value="">{t('forms.typeSelect')}</option>
          {PLATFORM_PROVIDER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </Select>
        {errors.type ? <p className="mt-1 text-xs text-red-600">{errors.type}</p> : null}
        </Field>

        <Field label={t('forms.credentials')} htmlFor="platform-provider-credentials">
          <Select
            id="platform-provider-credentials"
            value={data.credentialId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('credentialId', event.target.value) }}
            disabled={isSubmitting || credentialsLoading || credentialsError}
            aria-invalid={Boolean(errors.credentialId)}
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
                {credential.name} - {credential.username}
              </option>
            ))}
          </Select>
          {errors.credentialId ? <p className="mt-1 text-xs text-red-600">{errors.credentialId}</p> : null}
          {credentialsError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {t('providers.credentials.loadFailed')}{' '}
              <button type="button" className="font-semibold underline" onClick={onRetryCredentials}>
                {t('buttons.retry')}
              </button>
            </p>
          ) : null}
        </Field>
      </div>

      {data.type !== 'KEYCLOAK' ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem]">
        <Field label={t('forms.ip')} htmlFor="platform-provider-ip">
          <Input
            id="platform-provider-ip"
            value={data.ipAddress}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('ipAddress', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.ipAddress)}
          />
          {errors.ipAddress ? <p className="mt-1 text-xs text-red-600">{errors.ipAddress}</p> : null}
        </Field>

        <Field label={t('forms.port')} htmlFor="platform-provider-port">
          <Input
            id="platform-provider-port"
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
      ) : null}

      {data.type !== 'KEYCLOAK' ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.vmPrefix')} htmlFor="platform-provider-vm-prefix">
          <Input
            id="platform-provider-vm-prefix"
            value={data.vmPrefix}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('vmPrefix', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.vmPrefix)}
          />
          {errors.vmPrefix ? <p className="mt-1 text-xs text-red-600">{errors.vmPrefix}</p> : null}
        </Field>

        <Field label={t('forms.vmTags')} htmlFor="platform-provider-vm-tags">
          <Select
            id="platform-provider-vm-tags"
            value={selectedVmTag}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onTagsChange(event.target.value ? [event.target.value] : [])
            }}
            disabled={isSubmitting || tagsDisabled}
          >
            <option value="">{t('forms.vmTagsSelect')}</option>
            {vmTagOptions.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </Select>
          <p className="mt-1 text-xs text-text-muted">{t('providers.tags.platformHint')}</p>
        </Field>
      </div>
      ) : null}

      {data.type === 'KEYCLOAK' ? (
        <>
          <Field label={t('forms.url')} htmlFor="platform-provider-url">
            <Input
              id="platform-provider-url"
              type="url"
              value={data.url}
              onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('url', event.target.value) }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.url)}
            />
            {errors.url ? <p className="mt-1 text-xs text-red-600">{errors.url}</p> : null}
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t('forms.realm')} htmlFor="platform-provider-realm">
              <Input
                id="platform-provider-realm"
                value={data.realm}
                onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('realm', event.target.value) }}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.realm)}
              />
              {errors.realm ? <p className="mt-1 text-xs text-red-600">{errors.realm}</p> : null}
            </Field>
            <Field label={t('forms.clientId')} htmlFor="platform-provider-client-id">
              <Input
                id="platform-provider-client-id"
                value={data.clientId}
                onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('clientId', event.target.value) }}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.clientId)}
              />
              {errors.clientId ? <p className="mt-1 text-xs text-red-600">{errors.clientId}</p> : null}
            </Field>
          </div>
        </>
      ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.url')} htmlFor="platform-provider-url">
        <Input
          id="platform-provider-url"
          type="url"
          value={data.url}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('url', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.url)}
        />
        {errors.url ? <p className="mt-1 text-xs text-red-600">{errors.url}</p> : null}
        </Field>

        <Field label={t('forms.dagDir')} htmlFor="platform-provider-dag-dir">
        <Input
          id="platform-provider-dag-dir"
          value={data.dagDir}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('dagDir', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.dagDir)}
        />
        {errors.dagDir ? <p className="mt-1 text-xs text-red-600">{errors.dagDir}</p> : null}
        </Field>
      </div>
      )}

      {data.type === 'BACKEND' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CheckboxField
            id="platform-provider-logging-enabled"
            label={t('forms.loggingEnabled')}
            checked={data.loggingEnabled === true}
            disabled={isSubmitting}
            variant="bordered"
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('loggingEnabled', event.target.checked) }}
          />
          <div>
            <CheckboxField
              id="platform-provider-jwt-enabled"
              label={t('forms.jwtEnabled')}
              checked={data.jwtEnabled === true}
              disabled={isSubmitting}
              variant="bordered"
              onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('jwtEnabled', event.target.checked) }}
            />
            <p className="mt-1 text-xs text-text-muted">{t('forms.jwtEnabledHelper')}</p>
          </div>
        </div>
      ) : null}

      {data.type !== 'KEYCLOAK' ? (
      <>
      <Field label={t('forms.notificationEmail')} htmlFor="platform-provider-notificationEmail">
        <Input
          id="platform-provider-notificationEmail"
          type="email"
          value={data.notificationEmail}
          onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('notificationEmail', event.target.value) }}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.notificationEmail)}
        />
        {errors.notificationEmail ? <p className="mt-1 text-xs text-red-600">{errors.notificationEmail}</p> : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={t('forms.fromEmail')} htmlFor="platform-provider-from-email">
          <Input
            id="platform-provider-from-email"
            type="email"
            value={data.fromEmail}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('fromEmail', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
        </Field>

        <div className="flex items-end gap-3 pb-0.5">
          <CheckboxField
            id="platform-provider-disable-ssl"
            label={t('forms.disableSsl')}
            checked={data.disableSsl === true}
            disabled={isSubmitting}
            variant="bordered"
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('disableSsl', event.target.checked) }}
          />
          <CheckboxField
            id="platform-provider-disable-tls"
            label={t('forms.disableTls')}
            checked={data.disableTls === true}
            disabled={isSubmitting}
            variant="bordered"
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('disableTls', event.target.checked) }}
          />
        </div>
      </div>
      </>
      ) : null}
    </div>
  )
}
