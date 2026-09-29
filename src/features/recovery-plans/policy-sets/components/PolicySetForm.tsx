import type { ChangeEvent, KeyboardEvent } from 'react'
import { extractBackendErrorDetail } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, RadioField, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { CleanRoomPolicyRecord, RecoveryAppPolicyRecord, SnapshotPolicyRecord } from '@/generated/query/zod'

export interface PolicySetFormData {
  id: string
  name: string
  description: string
  snapshot_policy_id: string
  recovery_app_policy_id: string
  clean_room_policy_id: string
}

interface PolicySetFormProps {
  data: PolicySetFormData
  errors: Partial<Record<keyof PolicySetFormData, string>>
  availableSnapshotPolicies: SnapshotPolicyRecord[]
  availableRecoveryAppPolicies: RecoveryAppPolicyRecord[]
  availableCleanRoomPolicies: CleanRoomPolicyRecord[]
  isRecoveryAppPoliciesLoading: boolean
  recoveryAppPoliciesError: Error | null
  onRetryRecoveryAppPolicies: () => void
  isCleanRoomPoliciesLoading: boolean
  cleanRoomPoliciesError: Error | null
  onRetryCleanRoomPolicies: () => void
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
  availableCleanRoomPolicies,
  isRecoveryAppPoliciesLoading,
  recoveryAppPoliciesError,
  onRetryRecoveryAppPolicies,
  isCleanRoomPoliciesLoading,
  cleanRoomPoliciesError,
  onRetryCleanRoomPolicies,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: PolicySetFormProps) {
  const { t } = useTranslation()
  const recoveryAppPoliciesErrorDetail = extractBackendErrorDetail(recoveryAppPoliciesError)
  const cleanRoomPoliciesErrorDetail = extractBackendErrorDetail(cleanRoomPoliciesError)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const selectSnapshotPolicy = (policyId: string) => {
    onChange('snapshot_policy_id', policyId)
  }
  const selectRecoveryAppPolicy = (policyId: string) => {
    onChange('recovery_app_policy_id', policyId)
  }
  const selectCleanRoomPolicy = (policyId: string) => {
    onChange('clean_room_policy_id', policyId)
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
                checked={data.snapshot_policy_id === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { selectSnapshotPolicy(policy.id) }}
              />
            ))}
          </div>
        )}
        {errors.snapshot_policy_id ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_policy_id}</p> : null}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.recoveryAppPolicy')}</span>
        {isRecoveryAppPoliciesLoading ? (
          <p className="text-xs text-text-muted" role="status">{t('policySets.form.loadingRecoveryAppPolicies')}</p>
        ) : recoveryAppPoliciesError ? (
          <div className="space-y-2" role="alert">
            <p className="text-xs text-red-600">{t('policySets.form.recoveryAppPoliciesLoadFailed')}</p>
            {recoveryAppPoliciesErrorDetail ? <p className="text-xs text-red-600">{recoveryAppPoliciesErrorDetail}</p> : null}
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
                checked={data.recovery_app_policy_id === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { selectRecoveryAppPolicy(policy.id) }}
              />
            ))}
            {data.recovery_app_policy_id && !availableRecoveryAppPolicies.some(policy => policy.id === data.recovery_app_policy_id) ? (
              <p className="text-xs text-amber-700" role="status">
                {t('policySets.form.unavailableRecoveryAppPolicy').replace('{id}', data.recovery_app_policy_id)}
              </p>
            ) : null}
          </div>
        )}
        {errors.recovery_app_policy_id ? <p className="mt-1 text-xs text-red-600">{errors.recovery_app_policy_id}</p> : null}
      </div>

      <div>
        <span className="mb-1.5 block text-xs font-medium text-text-secondary">{t('policySets.form.cleanRoomPolicy')}</span>
        {isCleanRoomPoliciesLoading ? (
          <p className="text-xs text-text-muted" role="status">{t('policySets.form.loadingCleanRoomPolicies')}</p>
        ) : cleanRoomPoliciesError ? (
          <div className="space-y-2" role="alert">
            <p className="text-xs text-red-600">{t('policySets.form.cleanRoomPoliciesLoadFailed')}</p>
            {cleanRoomPoliciesErrorDetail ? <p className="text-xs text-red-600">{cleanRoomPoliciesErrorDetail}</p> : null}
            <Button type="button" size="xs" variant="outline" onClick={onRetryCleanRoomPolicies} disabled={isSubmitting}>
              {t('buttons.retry')}
            </Button>
          </div>
        ) : availableCleanRoomPolicies.length === 0 ? (
          <p className="text-xs text-text-muted">{t('policySets.form.noCleanRoomPolicies')}</p>
        ) : (
          <div className="space-y-2">
            {availableCleanRoomPolicies.map(policy => (
              <RadioField
                key={policy.id}
                id={`policy-set-clean-room-policy-${policy.id}`}
                name="policy-set-clean-room-policy"
                label={`${policy.name} (${policy.id})`}
                checked={data.clean_room_policy_id === policy.id}
                disabled={isSubmitting}
                variant="bordered"
                onChange={() => { selectCleanRoomPolicy(policy.id) }}
              />
            ))}
            {data.clean_room_policy_id && !availableCleanRoomPolicies.some(policy => policy.id === data.clean_room_policy_id) ? (
              <p className="text-xs text-amber-700" role="status">
                {t('policySets.form.unavailableCleanRoomPolicy').replace('{id}', data.clean_room_policy_id)}
              </p>
            ) : null}
          </div>
        )}
        {errors.clean_room_policy_id ? <p className="mt-1 text-xs text-red-600">{errors.clean_room_policy_id}</p> : null}
      </div>
    </div>
  )
}
