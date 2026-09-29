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
  frequency_value: string
  frequency_unit: string
  retention_value: string
  retention_unit: string
  boot_verify: boolean
  snapshot_selection_mode: string
  snapshot_max_age_value: string
  snapshot_max_age_unit: string
  snapshot_target_time: string
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
  const selectionMode = data.snapshot_selection_mode
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
            <Input id="recovery-app-policy-frequency" type="number" min={1} step={1} value={data.frequency_value} disabled={isSubmitting} invalid={Boolean(errors.frequency_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('frequency_value', event.target.value) }} />
          </Field>
          <Field label={t('recoveryAppPolicies.form.frequencyUnit')} htmlFor="recovery-app-policy-frequency-unit">
            <Select id="recovery-app-policy-frequency-unit" value={data.frequency_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('frequency_unit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.frequency_value ? <p className="col-span-2 text-xs text-red-600">{errors.frequency_value}</p> : null}
        </div>
        <div className="grid grid-cols-[1fr_1.2fr] gap-2">
          <Field label={t('recoveryAppPolicies.form.retention')} htmlFor="recovery-app-policy-retention">
            <Input id="recovery-app-policy-retention" type="number" min={1} step={1} value={data.retention_value} disabled={isSubmitting} invalid={Boolean(errors.retention_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('retention_value', event.target.value) }} />
          </Field>
          <Field label={t('recoveryAppPolicies.form.retentionUnit')} htmlFor="recovery-app-policy-retention-unit">
            <Select id="recovery-app-policy-retention-unit" value={data.retention_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('retention_unit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.retention_value ? <p className="col-span-2 text-xs text-red-600">{errors.retention_value}</p> : null}
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('recoveryAppPolicies.form.snapshotSection')}</h3>
        <div className="mt-3 space-y-4">
          <Field label={t('recoveryAppPolicies.form.snapshotSelection')} htmlFor="recovery-app-policy-selection">
            <Select id="recovery-app-policy-selection" value={data.snapshot_selection_mode} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshot_selection_mode', event.target.value) }}>
              {RECOVERY_APP_POLICY_SELECTION_MODES.map(mode => <option key={mode} value={mode}>{t(`recoveryAppPolicies.selection.${mode}`)}</option>)}
            </Select>
            {errors.snapshot_selection_mode ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_selection_mode}</p> : null}
          </Field>

          {selectionMode === 'time_range' ? (
            <div className="grid grid-cols-[1fr_1.2fr] gap-2">
              <Field label={t('recoveryAppPolicies.form.maxAge')} htmlFor="recovery-app-policy-max-age">
                <Input id="recovery-app-policy-max-age" type="number" min={1} step={1} value={data.snapshot_max_age_value} disabled={isSubmitting} invalid={Boolean(errors.snapshot_max_age_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshot_max_age_value', event.target.value) }} />
                {errors.snapshot_max_age_value ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_max_age_value}</p> : null}
              </Field>
              <Field label={t('recoveryAppPolicies.form.maxAgeUnit')} htmlFor="recovery-app-policy-max-age-unit">
                <Select id="recovery-app-policy-max-age-unit" value={data.snapshot_max_age_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshot_max_age_unit', event.target.value) }}>
                  <option value="">{t('recoveryAppPolicies.form.selectUnit')}</option>
                  {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
                </Select>
              </Field>
            </div>
          ) : null}

          {selectionMode === 'exact_time' ? (
            <Field label={t('recoveryAppPolicies.form.targetTime')} htmlFor="recovery-app-policy-target-time">
              <Input id="recovery-app-policy-target-time" type="time" value={data.snapshot_target_time} disabled={isSubmitting} invalid={Boolean(errors.snapshot_target_time)} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshot_target_time', event.target.value) }} />
              {errors.snapshot_target_time ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_target_time}</p> : null}
            </Field>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CheckboxField id="recovery-app-policy-boot-verify" label={t('recoveryAppPolicies.form.bootVerify')} checked={data.boot_verify} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('boot_verify', event.target.checked) }} />
        <CheckboxField id="recovery-app-policy-enabled" label={t('recoveryAppPolicies.form.enabled')} checked={data.enabled} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('enabled', event.target.checked) }} />
      </div>
    </div>
  )
}
