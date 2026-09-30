import { useTranslation } from '@/hooks/useTranslation'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/shared/components/form/FormControls'
import { Button } from '@/shared/components/button/Button'
import { DetailDrawer } from '@/shared/components/data-table/DetailDrawer'
import { cn } from '@/shared/utils/cn'
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
  missingNamesCount?: number
  providerName?: string | undefined
}

export function RecoveryGroupMetroMirrorFields({ value, onChange, loading, error, onRetry, warning, unresolvedCount, missingGroup, mismatch, missingNamesCount = 0, providerName }: Props) {
  const { t } = useTranslation()
  const [reviewOpen, setReviewOpen] = useState(false)
  const inputId = useId()
  const key = (name: string) => `pages.recoveryGroupBuilder.topology.lookup.${name}`
  const requiredCount = Number(!value.trim()) + missingNamesCount
  const needsReview = requiredCount > 0 || error !== null || warning.length > 0 || unresolvedCount > 0 || missingGroup || mismatch
  return (
    <>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface-subtle px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="text-xs text-text-secondary" htmlFor={inputId}>{t('pages.recoveryGroupBuilder.topology.consistencyGroup')}</label>
          <div className="w-32"><Input id={inputId} size="sm" value={value} invalid={!value.trim()}
            onChange={event => { onChange(event.target.value) }} /></div>
        </div>
        {providerName ? <span className="min-w-0 truncate text-xs text-text-muted" title={providerName}>{providerName}</span> : null}
        <Button size="xs" variant="outline" aria-haspopup="dialog" aria-busy={loading} onClick={() => { setReviewOpen(true) }}
          className={cn('ml-auto max-w-full', needsReview && 'border-warning-200 text-warning-800 dark:border-warning-800 dark:text-warning-200')}>
          {t(key('review'))}{requiredCount > 0 ? <span aria-label={t(key('requiredFields'), { count: requiredCount })}>({requiredCount})</span> : null}
        </Button>
      </div>
      {reviewOpen ? createPortal(
        <DetailDrawer open onClose={() => { setReviewOpen(false) }} title={t(key('reviewTitle'))} ariaLabel={t(key('reviewTitle'))} closeLabel={t('buttons.close')}>
          <div className="space-y-4 p-5 text-sm text-text-secondary [overflow-wrap:anywhere]">
            <p>{t(key('hint'))}</p>
            {loading ? <p role="status">{t(key('loading'))}</p> : null}
            {error ? <FetchErrorAlert title={t(key('error'))} onRetry={onRetry} retryLabel={t('buttons.retry')} /> : null}
            {requiredCount > 0 ? <p>{t(key('requiredFields'), { count: requiredCount })}</p> : null}
            {warning ? <p>{warning}</p> : null}
            {unresolvedCount > 0 ? <p>{t(key('unresolved'))}: {unresolvedCount}</p> : null}
            {missingGroup ? <p>{t(key('missingGroup'))}</p> : null}
            {mismatch ? <p>{t(key('mismatch'))}</p> : null}
          </div>
        </DetailDrawer>, document.body,
      ) : null}
    </>
  )
}
