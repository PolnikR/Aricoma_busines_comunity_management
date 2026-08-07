import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { DetailRow } from '@/shared/components/data-table'
import { Modal } from '@/shared/components/modal/Modal'
import { CheckIcon, ExternalLinkIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { EXTERNAL_SERVICES } from '@/config/externalServices'

interface RecoveryGroupOrchestratorSuccessModalProps {
  open: boolean
  onClose: () => void
  groupName: string
  runId?: string | null
  providerName?: string | null
  providerUrl?: string | null
}

export function RecoveryGroupOrchestratorSuccessModal({
  open,
  onClose,
  groupName,
  runId,
  providerName,
  providerUrl,
}: RecoveryGroupOrchestratorSuccessModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t('recoveryGroups.orchestratorSuccessModal.ariaLabel')}
      footer={(
        <>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('buttons.close')}
          </Button>
          <Button
            className="flex-1"
            endIcon={<ExternalLinkIcon className="size-4" />}
            onClick={() => { window.open(EXTERNAL_SERVICES.airflow.dagsUrl, '_blank', 'noopener,noreferrer') }}
          >
            {t('recoveryGroups.orchestratorSuccessModal.viewInAirflow')}
          </Button>
        </>
      )}
    >
      <div className="flex items-start gap-3.5 border-b border-border px-6 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
          <CheckIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {t('recoveryGroups.orchestratorSuccessModal.title')}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t('recoveryGroups.orchestratorSuccessModal.description').replace('{groupName}', groupName)}
          </p>
        </div>
      </div>
      <dl className="px-6">
        {providerName ? (
          <DetailRow label={t('recoveryGroups.orchestratorSuccessModal.provider')} value={providerName} />
        ) : null}
        {runId ? (
          <DetailRow
            label={t('recoveryGroups.orchestratorSuccessModal.runId')}
            value={<span className="font-mono">{runId}</span>}
          />
        ) : null}
        <DetailRow
          label={t('recoveryGroups.orchestratorSuccessModal.status')}
          value={<Badge color="success" size="sm">{t('recoveryGroups.orchestratorSuccessModal.queued')}</Badge>}
        />
      </dl>
    </Modal>
  )
}
