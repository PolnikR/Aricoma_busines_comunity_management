import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input } from '@/shared/components/form/FormControls'
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
  const hasWarning = Boolean(warning || unresolvedCount > 0 || missingGroup)
  return (
    <div className="min-w-0 shrink-0 space-y-2">
      <div className="grid min-w-0 items-start gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <Field label={t('pages.recoveryGroupBuilder.topology.consistencyGroup')} htmlFor="storage-consistency-group">
          <Input id="storage-consistency-group" size="sm" value={value} invalid={!value.trim()}
            onChange={event => { onChange(event.target.value) }} />
        </Field>
        <div className="min-w-0 sm:pt-5">
          {loading ? <p className="py-2 text-xs text-text-muted" role="status">{t(key('loading'))}</p> : null}
          {hasWarning || mismatch ? (
            <details className="min-w-0 text-xs">
              <summary className="cursor-pointer rounded-md py-2 text-warning-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-warning-200">
                {t(key(hasWarning ? 'incomplete' : 'mismatch'))}
              </summary>
              <div className="mt-1 space-y-1 border-l-2 border-warning-200 py-1 pl-3 text-text-secondary [overflow-wrap:anywhere] dark:border-warning-800">
                <p>{t(key('hint'))}</p>
                {warning ? <p>{warning}</p> : null}
                {unresolvedCount > 0 ? <p>{t(key('unresolved'))}: {unresolvedCount}</p> : null}
                {missingGroup ? <p>{t(key('missingGroup'))}</p> : null}
                {mismatch && hasWarning ? <p>{t(key('mismatch'))}</p> : null}
              </div>
            </details>
          ) : !loading ? <p className="py-2 text-xs text-text-muted">{t(key('hint'))}</p> : null}
        </div>
      </div>
      {error ? <FetchErrorAlert title={t(key('error'))} onRetry={onRetry} retryLabel={t('buttons.retry')} /> : null}
    </div>
  )
}
