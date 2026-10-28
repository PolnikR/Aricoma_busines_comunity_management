import type { ChangeEvent, KeyboardEvent } from 'react'
import { Field, Input, Select, Textarea } from '@/shared/components/form/FormControls'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
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
  target_lpar_prefix: string
  manual_zoning: boolean
  manual_wwpn_entry: boolean
  source_shutdown_timeout_seconds: string
  zoning_wait_minutes: string
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
    <div className="custom-scrollbar max-h-[min(72vh,700px)] space-y-3 overflow-y-auto px-6 py-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
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
        <Textarea id="recovery-app-policy-description" className="h-10 min-h-10! resize-y" value={data.description} disabled={isSubmitting} invalid={Boolean(errors.description)} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { onChange('description', event.target.value) }} />
        {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
      </Field>

      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor="recovery-app-policy-level" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.level')}</label>
          <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.level" sections={[]} />
        </div>
        <Select id="recovery-app-policy-level" value={data.level} disabled={isSubmitting} aria-invalid={Boolean(errors.level)} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('level', event.target.value) }}>
          <option value="">{t('recoveryAppPolicies.form.selectLevel')}</option>
          {selectedLevelIsCustom ? <option value={data.level}>{data.level}</option> : null}
          {POLICY_LEVELS.map(level => <option key={level} value={level}>{t(`recoveryAppPolicies.level.${level}`)}</option>)}
        </Select>
        {errors.level ? <p className="mt-1 text-xs text-red-600">{errors.level}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2">
          <div className="col-span-2 mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
            <label htmlFor="recovery-app-policy-frequency" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.frequency')}</label>
            <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.frequency" sections={[]} />
          </div>
          <Input id="recovery-app-policy-frequency" type="number" min={data.frequency_unit === 'minutes' ? 15 : 1} step={data.frequency_unit === 'minutes' ? 15 : 1} value={data.frequency_value} disabled={isSubmitting} invalid={Boolean(errors.frequency_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('frequency_value', event.target.value) }} />
          <Field label={t('recoveryAppPolicies.form.frequencyUnit')} htmlFor="recovery-app-policy-frequency-unit" className="self-end [&>span]:sr-only">
            <Select id="recovery-app-policy-frequency-unit" value={data.frequency_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('frequency_unit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.frequency_value ? <p className="col-span-2 text-xs text-red-600">{errors.frequency_value}</p> : null}
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2">
          <div className="col-span-2 mb-1.5 flex flex-wrap items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
            <label htmlFor="recovery-app-policy-retention" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.retention')}</label>
            <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.retention" sections={[]} />
            <span id="recovery-app-policy-retention-note" className="rounded bg-surface-muted px-1.5 text-[10px] leading-4 text-text-secondary">{t('recoveryAppPolicies.reservedForFutureUse')}</span>
          </div>
          <Input id="recovery-app-policy-retention" aria-describedby="recovery-app-policy-retention-note" type="number" min={data.retention_unit === 'minutes' ? 15 : 1} step={data.retention_unit === 'minutes' ? 15 : 1} value={data.retention_value} disabled={isSubmitting} invalid={Boolean(errors.retention_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('retention_value', event.target.value) }} />
          <Field label={t('recoveryAppPolicies.form.retentionUnit')} htmlFor="recovery-app-policy-retention-unit" className="self-end [&>span]:sr-only">
            <Select id="recovery-app-policy-retention-unit" aria-describedby="recovery-app-policy-retention-note" value={data.retention_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('retention_unit', event.target.value) }}>
              {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
            </Select>
          </Field>
          {errors.retention_value ? <p className="col-span-2 text-xs text-red-600">{errors.retention_value}</p> : null}
        </div>
      </div>

      {data.manual_zoning || data.manual_wwpn_entry ? (
        <p className="text-xs text-text-muted">{t('recoveryAppPolicies.form.manualFrequencyInfo')}</p>
      ) : null}

      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('recoveryAppPolicies.form.snapshotSection')}</h3>
        <div className="mt-3 space-y-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
              <label htmlFor="recovery-app-policy-selection" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.snapshotSelection')}</label>
              <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.snapshot_selection_mode" sections={[]} />
            </div>
            <Select id="recovery-app-policy-selection" value={data.snapshot_selection_mode} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshot_selection_mode', event.target.value) }}>
              {RECOVERY_APP_POLICY_SELECTION_MODES.map(mode => <option key={mode} value={mode}>{t(`recoveryAppPolicies.selection.${mode}`)}</option>)}
            </Select>
            {errors.snapshot_selection_mode ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_selection_mode}</p> : null}
          </div>

          {selectionMode === 'time_range' ? (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-x-2">
              <div className="col-span-2 mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
                <label htmlFor="recovery-app-policy-max-age" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.maxAge')}</label>
                <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.snapshot_max_age" sections={[]} />
              </div>
              <Input id="recovery-app-policy-max-age" type="number" min={1} step={1} value={data.snapshot_max_age_value} disabled={isSubmitting} invalid={Boolean(errors.snapshot_max_age_value)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshot_max_age_value', event.target.value) }} />
              <Field label={t('recoveryAppPolicies.form.maxAgeUnit')} htmlFor="recovery-app-policy-max-age-unit" className="self-end [&>span]:sr-only">
                <Select id="recovery-app-policy-max-age-unit" value={data.snapshot_max_age_unit} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLSelectElement>) => { onChange('snapshot_max_age_unit', event.target.value) }}>
                  <option value="">{t('recoveryAppPolicies.form.selectUnit')}</option>
                  {RECOVERY_APP_POLICY_TIME_UNITS.map(unit => <option key={unit} value={unit}>{t(`recoveryAppPolicies.unit.${unit}`)}</option>)}
                </Select>
              </Field>
              {errors.snapshot_max_age_value ? <p className="col-span-2 text-xs text-red-600">{errors.snapshot_max_age_value}</p> : null}
            </div>
          ) : null}

          {selectionMode === 'exact_time' ? (
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
                <label htmlFor="recovery-app-policy-target-time" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.targetTime')}</label>
                <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.snapshot_target_time" sections={[]} />
              </div>
              <Input id="recovery-app-policy-target-time" type="time" value={data.snapshot_target_time} disabled={isSubmitting} invalid={Boolean(errors.snapshot_target_time)} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('snapshot_target_time', event.target.value) }} />
              {errors.snapshot_target_time ? <p className="mt-1 text-xs text-red-600">{errors.snapshot_target_time}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div className={`flex min-h-10 items-center gap-2 rounded-xl border border-border-strong bg-surface px-2 text-xs text-text-secondary shadow-sm ${isSubmitting ? 'opacity-60' : ''}`}>
          <input type="checkbox" className="size-4 shrink-0 rounded border-border-strong accent-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15" id="recovery-app-policy-boot-verify" checked={data.boot_verify} disabled={isSubmitting} aria-describedby="recovery-app-policy-boot-verify-note" onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('boot_verify', event.target.checked) }} />
          <div className="flex min-w-0 flex-wrap items-center gap-1 [&>span]:h-4 [&>span]:items-center [&>span>button]:size-6">
            <label htmlFor="recovery-app-policy-boot-verify" className="cursor-pointer font-medium">{t('recoveryAppPolicies.form.bootVerify')}</label>
            <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.boot_verify" sections={[]} />
            <span id="recovery-app-policy-boot-verify-note" className="rounded bg-surface-muted px-1.5 text-[10px] leading-4 text-text-secondary">{t('recoveryAppPolicies.reservedForFutureUse')}</span>
          </div>
        </div>
        <div className={`flex min-h-10 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 text-xs text-text-secondary shadow-sm ${isSubmitting ? 'opacity-60' : ''}`}>
          <input type="checkbox" className="size-4 shrink-0 rounded border-border-strong accent-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15" id="recovery-app-policy-enabled" checked={data.enabled} disabled={isSubmitting} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('enabled', event.target.checked) }} />
          <div className="flex min-w-0 items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
            <label htmlFor="recovery-app-policy-enabled" className="cursor-pointer font-medium">{t('recoveryAppPolicies.form.enabled')}</label>
            <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.enabled" sections={[]} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface-subtle p-4">
        <h3 className="text-sm font-semibold text-text-primary">{t('recoveryAppPolicies.form.ibmPowerSection')}</h3>
        <p className="mt-1 text-xs text-text-muted">{t('recoveryAppPolicies.form.ibmPowerHint')}</p>
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
              <label htmlFor="recovery-app-policy-target-lpar-prefix" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.targetLparPrefix')}</label>
              <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.target_lpar_prefix" sections={[]} />
            </div>
            <Input id="recovery-app-policy-target-lpar-prefix" value={data.target_lpar_prefix} disabled={isSubmitting} invalid={Boolean(errors.target_lpar_prefix)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('target_lpar_prefix', event.target.value) }} />
            {errors.target_lpar_prefix ? <p className="mt-1 text-xs text-red-600">{errors.target_lpar_prefix}</p> : null}
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:col-span-2 sm:grid-cols-2">
            <div className={`flex min-h-10 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 text-xs text-text-secondary shadow-sm ${isSubmitting ? 'opacity-60' : ''}`}>
              <input type="checkbox" className="size-4 shrink-0 rounded border-border-strong accent-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15" id="recovery-app-policy-manual-zoning" checked={data.manual_zoning} disabled={isSubmitting} aria-invalid={Boolean(errors.manual_zoning)} aria-describedby={errors.manual_zoning ? 'recovery-app-policy-manual-mode-error' : undefined} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('manual_zoning', event.target.checked) }} />
              <div className="flex min-w-0 items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
                <label htmlFor="recovery-app-policy-manual-zoning" className="cursor-pointer font-medium">{t('recoveryAppPolicies.form.manualZoning')}</label>
                <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.manual_zoning" sections={[]} />
              </div>
            </div>
            <div className={`flex min-h-10 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 text-xs text-text-secondary shadow-sm ${isSubmitting ? 'opacity-60' : ''}`}>
              <input type="checkbox" className="size-4 shrink-0 rounded border-border-strong accent-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15" id="recovery-app-policy-manual-wwpn-entry" checked={data.manual_wwpn_entry} disabled={isSubmitting} aria-invalid={Boolean(errors.manual_zoning)} aria-describedby={errors.manual_zoning ? 'recovery-app-policy-manual-mode-error' : undefined} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('manual_wwpn_entry', event.target.checked) }} />
              <div className="flex min-w-0 items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
                <label htmlFor="recovery-app-policy-manual-wwpn-entry" className="cursor-pointer font-medium">{t('recoveryAppPolicies.form.manualWwpnEntry')}</label>
                <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.manual_wwpn_entry" sections={[]} />
              </div>
            </div>
            {errors.manual_zoning ? <p id="recovery-app-policy-manual-mode-error" className="text-xs text-red-600 sm:col-span-2">{errors.manual_zoning}</p> : null}
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
              <label htmlFor="recovery-app-policy-source-shutdown-timeout" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.sourceShutdownTimeout')}</label>
              <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.source_shutdown_timeout_seconds" sections={[]} />
            </div>
            <Input id="recovery-app-policy-source-shutdown-timeout" type="number" min={1} step={1} value={data.source_shutdown_timeout_seconds} disabled={isSubmitting} invalid={Boolean(errors.source_shutdown_timeout_seconds)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('source_shutdown_timeout_seconds', event.target.value) }} />
            {errors.source_shutdown_timeout_seconds ? <p className="mt-1 text-xs text-red-600">{errors.source_shutdown_timeout_seconds}</p> : null}
          </div>
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
              <label htmlFor="recovery-app-policy-zoning-wait" className="text-xs font-medium text-text-secondary">{t('recoveryAppPolicies.form.zoningWait')}</label>
              <KeyedHelpPopover helpKey="recoveryAppPolicies.fieldHelp.zoning_wait_minutes" sections={[]} />
            </div>
            <Input id="recovery-app-policy-zoning-wait" type="number" min={1} step={1} value={data.zoning_wait_minutes} disabled={isSubmitting} invalid={Boolean(errors.zoning_wait_minutes)} onKeyDown={handleKeyDown} onChange={(event: ChangeEvent<HTMLInputElement>) => { onChange('zoning_wait_minutes', event.target.value) }} />
            {errors.zoning_wait_minutes ? <p className="mt-1 text-xs text-red-600">{errors.zoning_wait_minutes}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
