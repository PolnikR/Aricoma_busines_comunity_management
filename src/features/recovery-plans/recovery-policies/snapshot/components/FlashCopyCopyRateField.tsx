import type { CSSProperties, KeyboardEvent } from 'react'
import { Input } from '@/shared/components/form/FormControls'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useTranslation } from '@/hooks/useTranslation'
import {
  snapshotPolicyFlashcopyCopyRateMin as MIN_COPY_RATE,
  snapshotPolicyFlashcopyCopyRateMax as MAX_COPY_RATE,
} from '@/generated/query/zod/snapshotPolicy.gen'
import styles from './FlashCopyCopyRateField.module.css'

interface FlashCopyCopyRateFieldProps {
  value: string
  error: string | undefined
  disabled: boolean
  onChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

const PRESETS = [MIN_COPY_RATE, 50, 100, MAX_COPY_RATE]

export function FlashCopyCopyRateField({ value, error, disabled, onChange, onKeyDown }: FlashCopyCopyRateFieldProps) {
  const { t } = useTranslation()
  const rate = Number(value)
  const isValid = value.trim() !== '' && Number.isInteger(rate) && rate >= MIN_COPY_RATE && rate <= MAX_COPY_RATE
  const sliderValue = isValid ? rate : MIN_COPY_RATE
  const state = t(sliderValue === 0 ? 'snapshotPolicies.form.flashcopyCopyRateOff' : 'snapshotPolicies.form.flashcopyCopyRateOn')
  const description = error ? 'snapshot-policy-copy-rate-help snapshot-policy-copy-rate-error' : 'snapshot-policy-copy-rate-help'
  const sliderStyle: CSSProperties & { '--copy-rate-progress': string } = {
    '--copy-rate-progress': `${String((sliderValue - MIN_COPY_RATE) / (MAX_COPY_RATE - MIN_COPY_RATE) * 100)}%`,
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor="snapshot-policy-copy-rate" className="text-xs font-medium text-text-secondary">{t('snapshotPolicies.form.flashcopyCopyRate')}</label>
          <KeyedHelpPopover helpKey="snapshotPolicies.fieldHelp.flashcopyCopyRate" sections={[]} />
        </div>
        {isValid ? <span className={`rounded-md px-2 py-1 text-xs font-medium text-text-secondary ${rate === 0 ? 'bg-surface-muted' : 'bg-accent-soft'}`}>{state}</span> : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_5rem] items-start gap-3">
        <div className="min-w-0">
          <input
            id="snapshot-policy-copy-rate-slider"
            className={styles['slider']}
            style={sliderStyle}
            type="range"
            min={MIN_COPY_RATE}
            max={MAX_COPY_RATE}
            step={1}
            value={sliderValue}
            disabled={disabled}
            aria-label={t('snapshotPolicies.form.flashcopyCopyRateSlider')}
            aria-valuetext={isValid ? `${String(rate)} · ${state}` : undefined}
            aria-describedby={description}
            aria-invalid={error ? true : undefined}
            onKeyDown={onKeyDown}
            onChange={event => { onChange(event.target.value) }}
          />
          <div aria-hidden="true" className="flex justify-between text-xs tabular-nums text-text-muted">
            {PRESETS.map(preset => <span key={preset}>{preset}</span>)}
          </div>
        </div>
        <div>
          <Input id="snapshot-policy-copy-rate" type="number" min={MIN_COPY_RATE} max={MAX_COPY_RATE} step={1} value={value} disabled={disabled} invalid={Boolean(error)} aria-describedby={description} className="text-center font-semibold tabular-nums" onKeyDown={onKeyDown} onChange={event => { onChange(event.target.value) }} />
          <span className="mt-1 block text-center text-xs text-text-muted">{t('snapshotPolicies.form.flashcopyCopyRateValue')}</span>
        </div>
      </div>
      <p id="snapshot-policy-copy-rate-help" className="mt-2 text-xs text-text-muted">{t('snapshotPolicies.form.flashcopyCopyRateHelp')}</p>
      {error ? <p id="snapshot-policy-copy-rate-error" className="mt-1 text-xs text-red-600">{error}</p> : null}
      <div role="group" aria-labelledby="snapshot-policy-copy-rate-presets" className="mt-2 flex flex-wrap items-center gap-2">
        <span id="snapshot-policy-copy-rate-presets" className="mr-1 w-full text-xs text-text-muted sm:w-auto">{t('snapshotPolicies.form.flashcopyCopyRatePresets')}</span>
        {PRESETS.map(preset => (
          <button key={preset} type="button" disabled={disabled} aria-pressed={isValid && rate === preset} onClick={() => { onChange(String(preset)) }} className={`min-h-8 rounded-md border px-3 text-xs font-medium text-text-secondary transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15 disabled:cursor-not-allowed disabled:opacity-50 ${isValid && rate === preset ? 'border-accent bg-accent-soft' : 'border-border bg-surface hover:border-accent'}`}>
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}
