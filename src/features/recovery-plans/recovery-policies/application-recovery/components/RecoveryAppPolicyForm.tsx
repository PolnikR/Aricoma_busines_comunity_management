import type { ChangeEvent, KeyboardEvent } from 'react'
import { CheckboxField, Field, Input, Select, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import {
  RECOVERY_APP_POLICY_SELECTION_MODES,
  RECOVERY_APP_POLICY_TIME_UNITS,
} from '../model/recoveryAppPolicyTypes'

const POLICY_LEVELS = ['critical', 'high', 'medium', 'low'] as const

export interface RecoveryAppPolicyFormData {
  id: string
  name: string
  description: string
  level: string
  frequencyValue: string
  frequencyUnit: string
  retentionValue: string
  retentionUnit: string
  bootVerify: boolean
  snapshotSelectionMode: string
  snapshotMaxAgeValue: string
  snapshotMaxAgeUnit: string
  snapshotTargetTime: string
  enabled: boolean
}

interface RecoveryAppPolicyFormProps {
  data: RecoveryAppPolicyFormData
  errors: Partial<Record<keyof RecoveryAppPolicyFormData, string>>
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof RecoveryAppPolicyFormData>(field: K, value: RecoveryAppPolicyFormData[K]) => void
  onSubmit: () => void
}

export function RecoveryAppPolicyForm({
  data,
  errors,
  isSubmitting,
  idDisabled = false,
  onChange,
  onSubmit,
}: RecoveryAppPolicyFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const selectionMode = data.snapshotSelectionMode
  const selectedLevelIsCustom = Boolean(data.level && !POLICY_LEVELS.some(level => level === data.level))

  return (
    <div className="custom-scrollbar max-h-[min(72vh,700px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('recoveryAppPolicies.form.id')} htmlFor="recovery-app-policy-id">
          <Input id="recovery-app-policy-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('recoveryAppPolicies.form.name')} htmlFor="recovery-app-policy-name">
          <Input id="recovery-app-policy-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('recoveryAppPolicies.form.description')} htmlFor="recovery-app-policy-description">
        <Textarea id="recovery-app-policy-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <Field label={t('recoveryAppPolicies.form.level')} htmlFor="recovery-app-policy-level">
        <Select id="recovery-app-policy-level" value={data.level} disabled={isSubmitting} aria-invalid={Boolean(errors.level)} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('level', event.target.value) }}>
          <option value="">{t('recoveryAppPolicies.form.selectLevel')}</option>
          {selectedLevelIsCustom ? <option value={data.level}>{data.level}</option> : null}
          {POLICY_LEVELS.map(level => <option key={level} value={level}>{t(`recoveryAppPolicies.level.${level}`)}</option>)}
        </Select>
        {errors.level ? <p className="mt-1 text-xs text-red-600">{errors.level}</p> : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-[1fr_1.2fr] gap-2">
          <Field label={t('recoveryAppPolicies.form.frequency')} htmlFor="recovery-app-policy-frequency">
            <Input id="recovery-app-policy-frequency" type="number" min={1} step={1} value={data.frequencyValue} disabled={isSubmitting} invalid={Boolean(errors.frequencyValue)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('frequencyValue', event.target.value) }} />
          </Field>
          <Field label={t('recoveryAppPolicies.form.frequencyUnit')} htmlFor="recovery-app-policy-frequency-unit">
            <Select id="recovery-app-policy-frequency-unit" value={data.frequencyUnit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('frequencyUnit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.frequencyValue ? <p className="col-span-2 text-xs text-red-600">{errors.frequencyValue}</p> : null}
        </div>
        <div className="grid grid-cols-[1fr_1.2fr] gap-2">
          <Field label={t('recoveryAppPolicies.form.retention')} htmlFor="recovery-app-policy-retention">
            <Input id="recovery-app-policy-retention" type="number" min={1} step={1} value={data.retentionValue} disabled={isSubmitting} invalid={Boolean(errors.retentionValue)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('retentionValue', event.target.value) }} />
          </Field>
          <Field label={t('recoveryAppPolicies.form.retentionUnit')} htmlFor="recovery-app-policy-retention-unit">
            <Select id="recovery-app-policy-retention-unit" value={data.retentionUnit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('retentionUnit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.retentionValue ? <p className="col-span-2 text-xs text-red-600">{errors.retentionValue}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('recoveryAppPolicies.form.snapshotSection')}</h3>
        <div className="mt-3 space-y-4">
          <Field label={t('recoveryAppPolicies.form.snapshotSelection')} htmlFor="recovery-app-policy-selection">
            <Select id="recovery-app-policy-selection" value={data.snapshotSelectionMode} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshotSelectionMode', event.target.value) }}>
              {RECOVERY_APP_POLICY_SELECTION_MODES.map(mode => <option key={mode} value={mode}>{t(`recoveryAppPolicies.selection.${mode}`)}</option>)}
            </Select>
            {errors.snapshotSelectionMode ? <p className="mt-1 text-xs text-red-600">{errors.snapshotSelectionMode}</p> : null}
          </Field>

          {selectionMode === 'time_range' ? (
            <div className="grid grid-cols-[1fr_1.2fr] gap-2">
              <Field label={t('recoveryAppPolicies.form.maxAge')} htmlFor="recovery-app-policy-max-age">
                <Input id="recovery-app-policy-max-age" type="number" min={1} step={1} value={data.snapshotMaxAgeValue} disabled={isSubmitting} invalid={Boolean(errors.snapshotMaxAgeValue)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshotMaxAgeValue', event.target.value) }} />
                {errors.snapshotMaxAgeValue ? <p className="mt-1 text-xs text-red-600">{errors.snapshotMaxAgeValue}</p> : null}
              </Field>
              <Field label={t('recoveryAppPolicies.form.maxAgeUnit')} htmlFor="recovery-app-policy-max-age-unit">
                <Select id="recovery-app-policy-max-age-unit" value={data.snapshotMaxAgeUnit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshotMaxAgeUnit', event.target.value) }}>
                  <option value="">{t('recoveryAppPolicies.form.selectUnit')}</option>
                  {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
                </Select>
              </Field>
            </div>
          ) : null}

          {selectionMode === 'exact_time' ? (
            <Field label={t('recoveryAppPolicies.form.targetTime')} htmlFor="recovery-app-policy-target-time">
              <Input id="recovery-app-policy-target-time" type="time" value={data.snapshotTargetTime} disabled={isSubmitting} invalid={Boolean(errors.snapshotTargetTime)} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshotTargetTime', event.target.value) }} />
              {errors.snapshotTargetTime ? <p className="mt-1 text-xs text-red-600">{errors.snapshotTargetTime}</p> : null}
            </Field>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CheckboxField id="recovery-app-policy-boot-verify" label={t('recoveryAppPolicies.form.bootVerify')} checked={data.bootVerify} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('bootVerify', event.target.checked) }} />
        <CheckboxField id="recovery-app-policy-enabled" label={t('recoveryAppPolicies.form.enabled')} checked={data.enabled} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('enabled', event.target.checked) }} />
      </div>
    </div>
  )
}
