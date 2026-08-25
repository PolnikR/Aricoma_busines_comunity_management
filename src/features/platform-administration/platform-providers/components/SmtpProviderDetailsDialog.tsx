import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { toPlatformProviderJson } from '../helpers/platformProviderJson'
import type { PlatformProviderRecord } from '../model/platformProviderTypes'

interface SmtpProviderDetailsDialogProps {
  open: boolean
  provider: PlatformProviderRecord
  onClose: () => void
}

export function SmtpProviderDetailsDialog({
  open,
  provider,
  onClose,
}: SmtpProviderDetailsDialogProps) {
  const { t } = useTranslation()
  const title = t('platformProviders.smtpDialog.title')
  const fields = [
    { label: t('tables.provider.name'), value: provider.name },
    { label: t('details.fromEmail'), value: provider.fromEmail ?? '-' },
    { label: t('details.disableSsl'), value: provider.disableSsl == null ? '-' : String(provider.disableSsl) },
    { label: t('details.disableTls'), value: provider.disableTls == null ? '-' : String(provider.disableTls) },
  ]

  return (
    <ChecklistResultDialog
      open={open}
      title={title}
      primaryName={provider.name}
      subtitle={provider.id}
      badges={[
        { label: provider.type, color: 'info' },
        ...(provider.role ? [{
          label: t(`forms.role.${provider.role}`),
          color: provider.role === 'source' ? 'success' as const : 'warning' as const,
        }] : []),
      ]}
      checks={[]}
      responseData={toPlatformProviderJson(provider)}
      onClose={onClose}
    >
      <dl role="list" aria-label={title} className="space-y-2">
        {fields.map(field => (
          <div
            key={field.label}
            role="listitem"
            className="rounded-lg border border-border bg-surface-subtle px-3 py-2.5"
          >
            <dt className="text-xs text-text-muted">{field.label}</dt>
            <dd className="mt-0.5 wrap-break-word text-sm font-medium text-text-primary">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </ChecklistResultDialog>
  )
}
