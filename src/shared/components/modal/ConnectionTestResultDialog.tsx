import { ChecklistResultDialog, type CheckItem } from './ChecklistResultDialog'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'

interface ConnectionTestResultDialogProps {
  open: boolean
  providerName: string
  providerId: string
  providerRole?: 'source' | 'target'
  providerTypeLabel?: (type: string) => string
  isPending: boolean
  result: ProviderTestResponseOutput | null
  error: Error | null
  onClose: () => void
  onRetry: () => void
}

export function ConnectionTestResultDialog({
  open,
  providerName,
  providerId,
  providerRole,
  providerTypeLabel = (type) => type,
  isPending,
  result,
  error,
  onClose,
  onRetry,
}: ConnectionTestResultDialogProps) {
  const { t } = useTranslation()
  const isWaiting = isPending || (!result && !error)
  const completedResult = isWaiting ? null : result
  const isFailed = !isWaiting && (Boolean(error) || (completedResult !== null && !completedResult.ok))
  const okCount = completedResult?.checks.filter(check => check.status.trim().toLowerCase() === 'ok').length ?? 0
  const skippedCount = completedResult?.checks.filter(check => check.status.trim().toLowerCase() === 'skipped').length ?? 0
  const checks: CheckItem[] = completedResult?.checks.map(check => ({
    name: check.name,
    detail: check.detail,
    status: check.status,
  })) ?? []
  const badges = completedResult ? [
    { label: providerTypeLabel(completedResult.provider_type), color: 'info' as const },
    ...(providerRole ? [{ label: t(`forms.role.${providerRole}`), color: providerRole === 'source' ? 'success' as const : 'warning' as const }] : []),
  ] : []
  const statusBar = isWaiting ? undefined : {
    title: error
      ? resolveUserFacingErrorMessage(error, t('providers.connectionTest.failed'))
      : t(isFailed ? 'providers.connectionTest.failed' : 'providers.connectionTest.success'),
    status: isFailed ? 'error' as const : 'success' as const,
    ...(completedResult ? {
      passedCount: okCount,
      totalCount: completedResult.checks.length,
      countLabel: t(skippedCount ? 'providers.connectionTest.passedSkippedCount' : 'providers.connectionTest.passedCount', {
        ok: okCount,
        total: completedResult.checks.length,
        skipped: skippedCount,
      }),
    } : {}),
  }

  return (
    <ChecklistResultDialog
      open={open}
      title={t('providers.connectionTest.title')}
      primaryName={providerName}
      subtitle={providerId}
      badges={badges}
      {...(statusBar ? { statusBar } : {})}
      checks={checks}
      checksAriaLabel={t('providers.connectionTest.checksLabel')}
      responseData={completedResult}
      responseSchemaType="ProviderTestResponse"
      onClose={onClose}
      {...(isFailed ? { onRetry } : {})}
      isPending={isWaiting}
      allowCloseWhilePending
      closeOnBackdrop={false}
    >
      {isWaiting ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center" role="status" aria-label={t('providers.connectionTest.running')} aria-live="polite" aria-busy="true">
          <span className="size-7 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden="true" />
          <p className="text-sm font-medium text-text-secondary">{t('providers.connectionTest.running')}</p>
        </div>
      ) : null}
    </ChecklistResultDialog>
  )
}
