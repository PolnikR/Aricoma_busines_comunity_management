import { OrchestratorResultModal } from '@/shared/components/modal/OrchestratorResultModal'
import { useTranslation } from '@/hooks/useTranslation'
import { EXTERNAL_SERVICES } from '@/config/externalServices'

interface RecoveryGroupOrchestratorSuccessModalProps {
  open: boolean
  onClose: () => void
  groupName: string
  runId?: string | null
  providerName?: string | null
}

export function RecoveryGroupOrchestratorSuccessModal({
  open,
  onClose,
  groupName,
  runId,
  providerName,
}: RecoveryGroupOrchestratorSuccessModalProps) {
  const { t } = useTranslation()

  return (
    <OrchestratorResultModal
      open={open}
      onClose={onClose}
      title={t('recoveryGroups.orchestratorSuccessModal.title')}
      ariaLabel={t('recoveryGroups.orchestratorSuccessModal.ariaLabel')}
      description={t('recoveryGroups.orchestratorSuccessModal.description').replace('{groupName}', groupName)}
      statusLabel={t('recoveryGroups.orchestratorSuccessModal.status')}
      status={t('recoveryGroups.orchestratorSuccessModal.queued')}
      closeLabel={t('buttons.close')}
      externalActionLabel={t('recoveryGroups.orchestratorSuccessModal.viewInAirflow')}
      onExternalAction={() => { window.open(EXTERNAL_SERVICES.airflow.dagsUrl, '_blank', 'noopener,noreferrer') }}
      details={[
        ...(providerName ? [{ label: t('recoveryGroups.orchestratorSuccessModal.provider'), value: providerName }] : []),
        ...(runId ? [{ label: t('recoveryGroups.orchestratorSuccessModal.runId'), value: runId, mono: true }] : []),
      ]}
    />
  )
}
