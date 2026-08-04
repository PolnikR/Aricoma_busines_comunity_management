import type { ChangeEvent, KeyboardEvent } from 'react'
import { Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { CredentialFormData } from '../model/credentialTypes'

export interface CredentialCreateFormData extends CredentialFormData {
  confirmPassword: string
}

interface CredentialCreateFormProps {
  data: CredentialCreateFormData
  errors: Partial<Record<keyof CredentialCreateFormData, string>>
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: (field: keyof CredentialCreateFormData, value: string) => void
  onSubmit: () => void
}

export function CredentialCreateForm({
  data,
  errors,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: CredentialCreateFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const input = (
    field: keyof CredentialCreateFormData,
    type = 'text',
    autoComplete = 'off',
  ) => (
    <Input
      id={`credential-${field}`}
      type={type}
      value={data[field]}
      disabled={isSubmitting || (field === 'id' && idDisabled)}
      autoComplete={autoComplete}
      aria-invalid={Boolean(errors[field])}
      onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange(field, event.target.value) }}
      onKeyDown={handleKeyDown}
      required
    />
  )

  return (
    <div className="space-y-4 px-6 py-4">
      <Field label={t('credentials.fields.id')} htmlFor="credential-id">
        {input('id')}
        {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
      </Field>
      <Field label={t('credentials.fields.name')} htmlFor="credential-name">
        {input('name')}
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
      </Field>
      <Field label={t('credentials.fields.description')} htmlFor="credential-description">
        <Textarea
          id="credential-description"
          value={data.description}
          disabled={isSubmitting}
          rows={3}
          aria-invalid={Boolean(errors.description)}
          onChange={event => { onChange('description', event.target.value) }}
          required
        />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>
      <Field label={t('credentials.fields.username')} htmlFor="credential-username">
        {input('username', 'text', 'username')}
        {errors.username ? <p className="mt-1 text-xs text-red-600">{errors.username}</p> : null}
      </Field>
      <Field label={t('credentials.fields.password')} htmlFor="credential-password">
        {input('password', 'password', 'new-password')}
        <p className="mt-1 text-xs text-text-muted">{t('credentials.fields.passwordHelp')}</p>
        {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
      </Field>
      <Field label={t('credentials.fields.confirmPassword')} htmlFor="credential-confirmPassword">
        {input('confirmPassword', 'password', 'new-password')}
        {errors.confirmPassword ? (
          <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
        ) : null}
      </Field>
    </div>
  )
}
