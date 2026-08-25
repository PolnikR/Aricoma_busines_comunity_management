import { ChecklistResultDialog } from '@/shared/components/modal/ChecklistResultDialog'
import { DetailRow } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
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

  return (
    <ChecklistResultDialog
      open={open}
      title={t('platformProviders.smtpDialog.title')}
      primaryName={provider.name}
      subtitle={provider.id}
      badges={[{ label: provider.type, color: 'info' }]}
      checks={[]}
      responseData={null}
      onClose={onClose}
    >
      <dl className="px-1">
        <DetailRow label={t('details.providerId')} value={<span className="font-mono">{provider.id}</span>} />
        <DetailRow label={t('tables.provider.name')} value={provider.name} />
        <DetailRow label={t('details.description')} value={provider.description || '-'} />
        <DetailRow label={t('details.type')} value={provider.type} />
        <DetailRow label={t('details.ipAddress')} value={<span className="font-mono">{provider.ipAddress}</span>} />
        <DetailRow label={t('details.port')} value={<span className="font-mono">{provider.port}</span>} />
        <DetailRow
          label={t('details.url')}
          value={provider.url ? (
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="wrap-break-word text-accent underline hover:text-accent/80"
            >
              {provider.url}
            </a>
          ) : '-'}
        />
        <DetailRow label={t('details.fromEmail')} value={provider.fromEmail ?? '-'} />
        <DetailRow label={t('details.disableSsl')} value={provider.disableSsl == null ? '-' : String(provider.disableSsl)} />
        <DetailRow label={t('details.disableTls')} value={provider.disableTls == null ? '-' : String(provider.disableTls)} />
      </dl>
    </ChecklistResultDialog>
  )
}
