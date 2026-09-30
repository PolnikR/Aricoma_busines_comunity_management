import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input } from '@/shared/components/form/FormControls'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'

interface Props {
  value: string
  onChange: (value: string) => void
  loading: boolean
  error: Error | null
  onRetry: () => void
  warning: string
  unresolvedCount: number
  missingGroup: boolean
  mismatch: boolean
}

export function RecoveryGroupMetroMirrorFields({ value, onChange, loading, error, onRetry, warning, unresolvedCount, missingGroup, mismatch }: Props) {
  const { t } = useTranslation()
  const key = (name: string) => `pages.recoveryGroupBuilder.topology.lookup.${name}`
  return (
    <div className="min-w-0 shrink-0 space-y-2">
      <div className="grid min-w-0 items-end gap-2 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Field label={t('pages.recoveryGroupBuilder.topology.consistencyGroup')} htmlFor="storage-consistency-group">
          <Input id="storage-consistency-group" value={value} invalid={!value.trim()}
            onChange={event => { onChange(event.target.value) }} />
        </Field>
        <p className="text-xs text-text-muted" role="status">{t(key(loading ? 'loading' : 'hint'))}</p>
      </div>
      {error ? <FetchErrorAlert title={t(key('error'))} onRetry={onRetry} retryLabel={t('buttons.retry')} /> : null}
      {warning || unresolvedCount > 0 || missingGroup ? <Alert variant="warning" title={t(key('incomplete'))}
        description={<>{warning ? <p>{warning}</p> : null}{unresolvedCount > 0 ? <p>{t(key('unresolved'))}: {unresolvedCount}</p> : null}{missingGroup ? <p>{t(key('missingGroup'))}</p> : null}</>} /> : null}
      {mismatch ? <p className="text-xs text-text-muted" role="status">{t(key('mismatch'))}</p> : null}
    </div>
  )
}
