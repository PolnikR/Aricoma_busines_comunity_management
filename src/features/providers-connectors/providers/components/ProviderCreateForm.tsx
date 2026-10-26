import type { ChangeEvent } from 'react'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { MultiSelect } from '@/shared/components/form/MultiSelect'
import { useTranslation } from '@/hooks/useTranslation'
import { PROVIDER_ROLES, PROVIDER_TYPES } from '../model/providerTypes'
import { getProviderFieldConfig } from '../model/providerFieldConfig'
import type { CredentialRecord } from '@/generated/query/zod'

export interface ProviderCreateFormData {
  id: string
  name: string
  description: string
  type: string
  role: string
  ipAddress: string
  url: string
  credentialId: string
  vmPrefix: string
  vmTags: string[]
  backingStorageProviderIds: string[]
  partnerProviderId: string
  managedSystem: string
  notificationEmail: string
  cacheRefreshSeconds: string
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
  // Storage-type providers that may back a compute provider.
  backingStorageProviders?: { id: string; name: string }[]
  // Partner-capable providers; the edited provider itself is excluded here.
  partnerProviders?: { id: string; name: string }[]
  onBackingStorageChange: (ids: string[]) => void
  credentialsLoading: boolean
  credentialsError: boolean
  onRetryCredentials: () => void
  tags?: string[]
  tagsLoading?: boolean
  tagsError?: boolean
  tagsDisabled?: boolean
  onRetryTags?: () => void
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
  backingStorageProviders = [],
  partnerProviders = [],
  onBackingStorageChange,
  credentialsLoading,
  credentialsError,
  onRetryCredentials,
  tags = [],
  tagsLoading = false,
  tagsError = false,
  tagsDisabled = false,
  onRetryTags,
  onChange,
  onTagsChange,
  onIdBlur,
  onSubmit,
}: ProviderCreateFormProps) {
  const { t } = useTranslation()
  const showCommonHelp = PROVIDER_TYPES.some(type => type === data.type)
  const fieldConfig = getProviderFieldConfig(data.type)
  const partnerOptions = partnerProviders.filter(provider => provider.id !== data.id)
  const partnerMissing = data.partnerProviderId && !partnerOptions.some(provider => provider.id === data.partnerProviderId)
  const storageOptions = [
    ...backingStorageProviders.map(provider => ({ value: provider.id, label: provider.name + ' — ' + provider.id })),
    ...data.backingStorageProviderIds.filter(id => !backingStorageProviders.some(provider => provider.id === id))
      .map(id => ({ value: id, label: t('providers.credentials.unavailable').replace('{id}', id) })),
  ]
  const selectedCredentialIsMissing = Boolean(
    data.credentialId && !credentials.some(credential => credential.id === data.credentialId),
  )
  const vmTagOptions = [...new Set([...tags, ...data.vmTags])].map(tag => ({ value: tag, label: tag }))
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

        <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-role" className="text-xs font-medium text-text-secondary">{t('forms.role')}</label>
            {showCommonHelp ? <KeyedHelpPopover helpKey="providers.fieldHelp.role" sections={[]} /> : null}
          </div>
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:[&>:last-child:nth-child(odd)]:col-span-2">
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

        {fieldConfig.partnerProviderId ? (
          <div className="block">
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="create-partnerProviderId" className="text-xs font-medium text-text-secondary">{t('forms.partnerProvider')}</label>
              <KeyedHelpPopover helpKey="providers.fieldHelp.partnerProviderId" sections={[]} />
            </div>
            <Select id="create-partnerProviderId" value={data.partnerProviderId} aria-label={t('forms.partnerProvider')}
              disabled={isSubmitting} aria-invalid={Boolean(errors.partnerProviderId)}
              onChange={event => { onChange('partnerProviderId', event.target.value) }}>
              <option value="">{t('forms.partnerProviderNone')}</option>
              {partnerMissing ? <option value={data.partnerProviderId} disabled>{data.partnerProviderId} ({t('forms.partnerProviderUnavailable')})</option> : null}
              {partnerOptions.map(provider => <option key={provider.id} value={provider.id}>{provider.name} — {provider.id}</option>)}
            </Select>
            <p className="mt-1 text-xs text-text-muted">{t('forms.partnerProviderHelper')}</p>
            {errors.partnerProviderId ? <p role="alert" className="mt-1 text-xs text-red-600">{errors.partnerProviderId}</p> : null}
          </div>
        ) : null}

        {fieldConfig.backingStorageProviderIds ? (
          <div className="block">
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="create-backingStorageProviders" className="text-xs font-medium text-text-secondary">{t('forms.backingStorageProviders')}</label>
              <KeyedHelpPopover helpKey="providers.fieldHelp.backingStorageProviderIds" sections={[]} />
            </div>
            <MultiSelect id="create-backingStorageProviders" label={t('forms.backingStorageProviders')}
              options={storageOptions} value={data.backingStorageProviderIds}
              onChange={onBackingStorageChange} disabled={isSubmitting}
              placeholder={t('forms.backingStorageProvidersSelect')} emptyText={t('forms.backingStorageProvidersEmpty')} />
            <p className="mt-1 text-xs text-text-muted">{t('forms.backingStorageProvidersHelper')}</p>
          </div>
        ) : null}

        <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-cacheRefreshSeconds" className="text-xs font-medium text-text-secondary">{t('forms.cacheRefreshSeconds')}</label>
            {showCommonHelp ? <KeyedHelpPopover helpKey="providers.fieldHelp.cacheRefreshSeconds" sections={[]} /> : null}
          </div>
          <Input
            id="create-cacheRefreshSeconds"
            type="number"
            min={1}
            step={1}
            value={data.cacheRefreshSeconds}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('cacheRefreshSeconds', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.cacheRefreshSeconds)}
          />
          <p className="mt-1 text-xs text-text-muted">{t('forms.cacheRefreshSecondsHelper')}</p>
          {errors.cacheRefreshSeconds ? <p className="mt-1 text-xs text-red-600">{errors.cacheRefreshSeconds}</p> : null}
        </div>

        {fieldConfig.managedSystem ? (
          <div className="block">
            <div className="mb-1.5 flex items-center gap-1.5">
              <label htmlFor="create-managedSystem" className="text-xs font-medium text-text-secondary">{t('forms.managedSystem')}</label>
              <KeyedHelpPopover helpKey="providers.fieldHelp.managedSystem" sections={[]} />
            </div>
            <Input id="create-managedSystem" type="text" value={data.managedSystem} aria-label={t('forms.managedSystem')}
              onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('managedSystem', event.target.value) }}
              onKeyDown={handleKeyDown} disabled={isSubmitting} aria-invalid={Boolean(errors.managedSystem)} />
            <p className="mt-1 text-xs text-text-muted">{t('forms.managedSystemHelper')}</p>
            {errors.managedSystem ? <p className="mt-1 text-xs text-red-600">{errors.managedSystem}</p> : null}
          </div>
        ) : null}

        {fieldConfig.vmPrefix ? <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-vmPrefix" className="text-xs font-medium text-text-secondary">{t('forms.vmPrefix')}</label>
            <KeyedHelpPopover helpKey="providers.fieldHelp.vmPrefix" sections={[]} />
          </div>
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
        </div> : null}

        {fieldConfig.vmTags ? <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-vmTags" className="text-xs font-medium text-text-secondary">{t('forms.vmTags')}</label>
            <KeyedHelpPopover helpKey="providers.fieldHelp.vmTags" sections={[]} />
          </div>
          <MultiSelect id="create-vmTags" label={t('forms.vmTags')}
            options={vmTagOptions} value={data.vmTags} onChange={onTagsChange}
            disabled={isSubmitting || tagsDisabled}
            placeholder={t('forms.vmTagsSelect')} emptyText={t('forms.vmTagsEmpty')} />
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
        </div> : null}

        <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-credentials" className="text-xs font-medium text-text-secondary">{t('forms.credentials')}</label>
            {showCommonHelp ? <KeyedHelpPopover helpKey="providers.fieldHelp.credentialId" sections={[]} /> : null}
          </div>
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
        </div>

        <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-url" className="text-xs font-medium text-text-secondary">{t('forms.url')}</label>
            {showCommonHelp ? <KeyedHelpPopover helpKey="providers.fieldHelp.url" sections={[]} /> : null}
          </div>
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
        </div>

        <div className="block">
          <div className="mb-1.5 flex items-center gap-1.5">
            <label htmlFor="create-notificationEmail" className="text-xs font-medium text-text-secondary">{t('forms.notificationEmail')}</label>
            {showCommonHelp ? <KeyedHelpPopover helpKey="providers.fieldHelp.notificationEmail" sections={[]} /> : null}
          </div>
          <Input
            id="create-notificationEmail"
            type="email"
            value={data.notificationEmail}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('notificationEmail', event.target.value) }}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.notificationEmail)}
          />
          {errors.notificationEmail ? <p className="mt-1 text-xs text-red-600">{errors.notificationEmail}</p> : null}
        </div>

      </div>

    </div>
  )
}
