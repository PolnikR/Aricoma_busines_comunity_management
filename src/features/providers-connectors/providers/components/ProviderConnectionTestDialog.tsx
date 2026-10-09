import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { ProviderRole } from '../model/providerTypes'
import type { ProviderTestResponseOutput } from '@/generated/query/zod'

interface ProviderConnectionTestDialogProps {
  open: boolean
  providerName: string
  providerId: string
  providerRole?: ProviderRole
  isPending: boolean
  result: ProviderTestResponseOutput | null
  error: Error | null
  onClose: () => void
  onRetry: () => void
}

function isCheckOk(status: string): boolean {
  return status.trim().toLowerCase() === 'ok'
}

export function ProviderConnectionTestDialog({
  open,
  providerName,
  providerId,
  providerRole = 'source',
  isPending,
  result,
  error,
  onClose,
  onRetry,
}: ProviderConnectionTestDialogProps) {
  const { t } = useTranslation()
  const isWaiting = isPending || (!result && !error)
  const completedResult = isWaiting ? null : result
  const isFailed = !isWaiting && (Boolean(error) || (completedResult !== null && !completedResult.ok))
  const okCount = completedResult ? completedResult.checks.filter(check => isCheckOk(check.status)).length : 0

  const checks: CheckItem[] = completedResult?.checks.map(check => ({
    name: check.name,
    detail: check.detail,
    status: check.status,
  })) ?? []

  const badges = completedResult ? [
    { label: providerTypeLabel(completedResult.provider_type), color: 'info' as const },
    { label: t(`forms.role.${providerRole}`), color: providerRole === 'source' ? 'success' as const : 'warning' as const },
  ] : []

  const statusBar = isWaiting ? undefined : {
    title: error
      ? resolveUserFacingErrorMessage(error, t('providers.connectionTest.failed'))
      : t(isFailed ? 'providers.connectionTest.failed' : 'providers.connectionTest.success'),
    status: isFailed ? 'error' as const : 'success' as const,
    ...(completedResult ? { passedCount: okCount, totalCount: completedResult.checks.length } : {}),
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
      responseData={completedResult}
      responseSchemaType="ProviderTestResponse"
      onClose={onClose}
      {...(isFailed ? { onRetry } : {})}
      isPending={isWaiting}
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
