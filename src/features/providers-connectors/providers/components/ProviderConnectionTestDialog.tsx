import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import { toProviderConnectionTestJson } from '../helpers/providerConnectionTestJson'
import type { ProviderRole } from '../model/providerTypes'
import type { ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

interface ProviderConnectionTestDialogProps {
  open: boolean
  providerName: string
  providerId: string
  providerRole?: ProviderRole
  isPending: boolean
  result: ProviderConnectionTestResult | null
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
  const isFailed = Boolean(error) || (result !== null && !result.ok)
  const okCount = result ? result.checks.filter(check => isCheckOk(check.status)).length : 0

  const checks: CheckItem[] = result?.checks.map(check => ({
    name: check.name,
    detail: check.detail,
    status: check.status,
  })) ?? []

  const badges = result ? [
    { label: providerTypeLabel(result.providerType), color: 'info' as const },
    { label: t(`forms.role.${providerRole}`), color: providerRole === 'source' ? 'success' as const : 'warning' as const },
  ] : []

  const statusBarStatus = isPending ? 'warning' : isFailed ? 'error' : 'success'

  return (
    <ChecklistResultDialog
      open={open}
      title={t('providers.connectionTest.title')}
      primaryName={providerName}
      subtitle={providerId}
      badges={badges}
      statusBar={{
        title: error
          ? resolveUserFacingErrorMessage(error, t('providers.connectionTest.failed'))
          : t('providers.connectionTest.success'),
        status: statusBarStatus,
        passedCount: okCount,
        totalCount: result?.checks.length ?? 0,
      }}
      checks={checks}
      responseData={result ? toProviderConnectionTestJson(result) : null}
      responseSchemaType="ProviderTestResponse"
      onClose={onClose}
      {...(isFailed ? { onRetry } : {})}
      isPending={isPending}
    />
  )
}
