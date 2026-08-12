import type { ChangeEvent, KeyboardEvent } from 'react'
import { CheckboxField, Field, Input, Select, Textarea } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import { SNAPSHOT_POLICY_TIME_UNITS } from '../model/snapshotPolicyTypes'

const POLICY_LEVELS = ['critical', 'high', 'medium', 'low'] as const

export interface SnapshotPolicyFormData {
  id: string
  name: string
  description: string
  level: string
  frequencyValue: string
  frequencyUnit: string
  retentionValue: string
  retentionUnit: string
  maxSnapshots: string
  enabled: boolean
}

interface SnapshotPolicyFormProps {
  data: SnapshotPolicyFormData
  errors: Partial<Record<keyof SnapshotPolicyFormData, string>>
  isSubmitting: boolean
  idDisabled?: boolean
  onChange: <K extends keyof SnapshotPolicyFormData>(field: K, value: SnapshotPolicyFormData[K]) => void
  onSubmit: () => void
}

export function SnapshotPolicyForm({ data, errors, isSubmitting, idDisabled = false, onChange, onSubmit }: SnapshotPolicyFormProps) {
  const { t } = useTranslation()
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault()
      onSubmit()
    }
  }
  const selectedLevelIsCustom = Boolean(data.level && !POLICY_LEVELS.some(level => level === data.level))

  return (
    <div className="custom-scrollbar max-h-[min(68vh,640px)] space-y-4 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('snapshotPolicies.form.id')} htmlFor="snapshot-policy-id">
          <Input id="snapshot-policy-id" value={data.id} disabled={isSubmitting || idDisabled} invalid={Boolean(errors.id)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('id', event.target.value) }} />
          {errors.id ? <p className="mt-1 text-xs text-red-600">{errors.id}</p> : null}
        </Field>
        <Field label={t('snapshotPolicies.form.name')} htmlFor="snapshot-policy-name">
          <Input id="snapshot-policy-name" value={data.name} disabled={isSubmitting} invalid={Boolean(errors.name)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('name', event.target.value) }} />
          {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
        </Field>
      </div>

      <Field label={t('snapshotPolicies.form.description')} htmlFor="snapshot-policy-description">
        <Textarea id="snapshot-policy-description" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <Field label={t('snapshotPolicies.form.level')} htmlFor="snapshot-policy-level">
        <Select id="snapshot-policy-level" value={data.level} disabled={isSubmitting} aria-invalid={Boolean(errors.level)} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('level', event.target.value) }}>
          <option value="">{t('snapshotPolicies.form.selectLevel')}</option>
          {selectedLevelIsCustom ? <option value={data.level}>{data.level}</option> : null}
          {POLICY_LEVELS.map(level => <option key={level} value={level}>{t(`snapshotPolicies.level.${level}`)}</option>)}
        </Select>
        {errors.level ? <p className="mt-1 text-xs text-red-600">{errors.level}</p> : null}
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-[1fr_1.2fr] gap-2">
          <Field label={t('snapshotPolicies.form.frequency')} htmlFor="snapshot-policy-frequency">
            <Input id="snapshot-policy-frequency" type="number" min={1} step={1} value={data.frequencyValue} disabled={isSubmitting} invalid={Boolean(errors.frequencyValue)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('frequencyValue', event.target.value) }} />
          </Field>
          <Field label={t('snapshotPolicies.form.frequencyUnit')} htmlFor="snapshot-policy-frequency-unit">
            <Select id="snapshot-policy-frequency-unit" value={data.frequencyUnit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('frequencyUnit', event.target.value) }}>
              {SNAPSHOT_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`snapshotPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.frequencyValue ? <p className="col-span-2 text-xs text-red-600">{errors.frequencyValue}</p> : null}
        </div>
        <div className="grid grid-cols-[1fr_1.2fr] gap-2">
          <Field label={t('snapshotPolicies.form.retention')} htmlFor="snapshot-policy-retention">
            <Input id="snapshot-policy-retention" type="number" min={1} step={1} value={data.retentionValue} disabled={isSubmitting} invalid={Boolean(errors.retentionValue)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('retentionValue', event.target.value) }} />
          </Field>
          <Field label={t('snapshotPolicies.form.retentionUnit')} htmlFor="snapshot-policy-retention-unit">
            <Select id="snapshot-policy-retention-unit" value={data.retentionUnit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('retentionUnit', event.target.value) }}>
              {SNAPSHOT_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`snapshotPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.retentionValue ? <p className="col-span-2 text-xs text-red-600">{errors.retentionValue}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
        <Field label={t('snapshotPolicies.form.maxSnapshots')} htmlFor="snapshot-policy-max-snapshots">
          <Input id="snapshot-policy-max-snapshots" type="number" min={1} step={1} value={data.maxSnapshots} placeholder={t('snapshotPolicies.form.noLimit')} disabled={isSubmitting} invalid={Boolean(errors.maxSnapshots)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('maxSnapshots', event.target.value) }} />
          {errors.maxSnapshots ? <p className="mt-1 text-xs text-red-600">{errors.maxSnapshots}</p> : null}
        </Field>
        <CheckboxField id="snapshot-policy-enabled" label={t('snapshotPolicies.form.enabled')} checked={data.enabled} disabled={isSubmitting} variant="bordered" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('enabled', event.target.checked) }} />
      </div>
    </div>
  )
}
