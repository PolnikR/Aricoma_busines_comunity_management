import type { ChangeEvent, KeyboardEvent } from 'react'
import { CheckboxField, Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'

export interface CleanRoomPolicyFormData {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface CleanRoomPolicyFormProps {
  data: CleanRoomPolicyFormData
  errors: Partial<Record<keyof CleanRoomPolicyFormData, string>>
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof CleanRoomPolicyFormData>(field: K, value: CleanRoomPolicyFormData[K]) => void
  onSubmit: () => void
}

export function CleanRoomPolicyForm({ data, errors, isSubmitting, idDisabled = false, onChange, onSubmit }: CleanRoomPolicyFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="custom-scrollbar max-h-[min(68vh,640px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('cleanRoomPolicies.form.id')} htmlFor="clean-room-policy-id">
          <Input id="clean-room-policy-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('cleanRoomPolicies.form.name')} htmlFor="clean-room-policy-name">
          <Input id="clean-room-policy-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('cleanRoomPolicies.form.description')} htmlFor="clean-room-policy-description">
        <Textarea id="clean-room-policy-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <CheckboxField id="clean-room-policy-enabled" label={t('cleanRoomPolicies.form.enabled')} checked={data.enabled} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('enabled', event.target.checked) }} />
    </div>
  )
}
