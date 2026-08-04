import type { ChangeEvent, KeyboardEvent } from 'react'
import { CheckboxField, Field, Input, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { SnapshotPolicy } from '@/features/recovery-plans/snapshot-policies/model/snapshotPolicyTypes'

export interface PolicySetFormData {
  id: string
  name: string
  description: string
  policyIds: string[]
}

interface PolicySetFormProps {
  data: PolicySetFormData
  errors: Partial<Record<keyof PolicySetFormData, string>>
  availablePolicies: SnapshotPolicy[]
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => void
  onSubmit: () => void
}

export function PolicySetForm({
  data,
  errors,
  availablePolicies,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: PolicySetFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const togglePolicy = (policyId: string, checked: boolean) => {
    onChange('policyIds', checked
      ? [...data.policyIds, policyId]
      : data.policyIds.filter(id => id !== policyId))
  }

  return (
    <div className="custom-scrollbar max-h-[min(68vh,640px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('policySets.form.id')} htmlFor="policy-set-id">
          <Input id="policy-set-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('policySets.form.name')} htmlFor="policy-set-name">
          <Input id="policy-set-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('policySets.form.description')} htmlFor="policy-set-description">
        <Textarea id="policy-set-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.policies')}</span>
        {availablePolicies.length === 0 ? (
          <p className="text-xs text-text-muted">{t('policySets.form.noPolicies')}</p>
        ) : (
          <div className="space-y-2">
            {availablePolicies.map(policy => (
              <CheckboxField
                key={policy.id}
                id={`policy-set-policy-${policy.id}`}
                label={`${policy.name} (${policy.id})`}
                checked={data.policyIds.includes(policy.id)}
                disabled={isSubmitting}
                variant="bordered"
                onChange={(event: ChangeEvent<HTMLInputElement>) => { togglePolicy(policy.id, event.target.checked) }}
              />
            ))}
          </div>
        )}
        {errors.policyIds ? <p className="mt-1 text-xs text-red-600">{errors.policyIds}</p> : null}
      </div>
    </div>
  )
}
