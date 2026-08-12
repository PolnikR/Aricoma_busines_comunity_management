import type { ChangeEvent, KeyboardEvent } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, RadioField, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { SnapshotPolicy } from '@/features/recovery-plans/recovery-policies/snapshot/model/snapshotPolicyTypes'
import type { RecoveryAppPolicy } from '@/features/recovery-plans/recovery-policies/application-recovery/model/recoveryAppPolicyTypes'

export interface PolicySetFormData {
  id: string
  name: string
  description: string
  snapshotPolicyId: string
  recoveryAppPolicyId: string
}

interface PolicySetFormProps {
  data: PolicySetFormData
  errors: Partial<Record<keyof PolicySetFormData, string>>
  availableSnapshotPolicies: SnapshotPolicy[]
  availableRecoveryAppPolicies: RecoveryAppPolicy[]
  isRecoveryAppPoliciesLoading: boolean
  recoveryAppPoliciesError: Error | null
  onRetryRecoveryAppPolicies: () => void
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof PolicySetFormData>(field: K, value: PolicySetFormData[K]) => void
  onSubmit: () => void
}

export function PolicySetForm({
  data,
  errors,
  availableSnapshotPolicies,
  availableRecoveryAppPolicies,
  isRecoveryAppPoliciesLoading,
  recoveryAppPoliciesError,
  onRetryRecoveryAppPolicies,
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
  const selectSnapshotPolicy = (policyId: string) => {
    onChange('snapshotPolicyId', policyId)
  }
  const selectRecoveryAppPolicy = (policyId: string) => {
    onChange('recoveryAppPolicyId', policyId)
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
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.snapshotPolicies')}</span>
        {availableSnapshotPolicies.length === 0 ? (
          <p className="text-xs text-text-muted">{t('policySets.form.noPolicies')}</p>
        ) : (
          <div className="space-y-2">
            {availableSnapshotPolicies.map(policy => (
              <RadioField
                key={policy.id}
                id={`policy-set-policy-${policy.id}`}
                name="policy-set-policy"
                label={`${policy.name} (${policy.id})`}
                checked={data.snapshotPolicyId === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { selectSnapshotPolicy(policy.id) }}
              />
            ))}
          </div>
        )}
        {errors.snapshotPolicyId ? <p className="mt-1 text-xs text-red-600">{errors.snapshotPolicyId}</p> : null}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.recoveryAppPolicy')}</span>
        {isRecoveryAppPoliciesLoading ? (
          <p className="text-xs text-text-muted" role="status">{t('policySets.form.loadingRecoveryAppPolicies')}</p>
        ) : recoveryAppPoliciesError ? (
          <div className="space-y-2" role="alert">
            <p className="text-xs text-red-600">{t('policySets.form.recoveryAppPoliciesLoadFailed')}</p>
            <Button type="button" size="xs" variant="outline" onClick={onRetryRecoveryAppPolicies} disabled={isSubmitting}>
              {t('buttons.retry')}
            </Button>
          </div>
        ) : availableRecoveryAppPolicies.length === 0 ? (
          <p className="text-xs text-text-muted">{t('policySets.form.noRecoveryAppPolicies')}</p>
        ) : (
          <div className="space-y-2">
            {availableRecoveryAppPolicies.map(policy => (
              <RadioField
                key={policy.id}
                id={`policy-set-recovery-app-policy-${policy.id}`}
                name="policy-set-recovery-app-policy"
                label={`${policy.name} (${policy.id})`}
                checked={data.recoveryAppPolicyId === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { selectRecoveryAppPolicy(policy.id) }}
              />
            ))}
            {data.recoveryAppPolicyId && !availableRecoveryAppPolicies.some(policy => policy.id === data.recoveryAppPolicyId) ? (
              <p className="text-xs text-amber-700" role="status">
                {t('policySets.form.unavailableRecoveryAppPolicy').replace('{id}', data.recoveryAppPolicyId)}
              </p>
            ) : null}
          </div>
        )}
        {errors.recoveryAppPolicyId ? <p className="mt-1 text-xs text-red-600">{errors.recoveryAppPolicyId}</p> : null}
      </div>
    </div>
  )
}
