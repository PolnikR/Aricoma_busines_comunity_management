import { useTranslation } from '@/hooks/useTranslation'
import { buildAirflowDagUrl } from '@/config/externalServices'
import { OrchestratorResultModal } from '@/shared/components/modal/OrchestratorResultModal'
import type { OrchestratorPush } from '../model/recoveryApplicationTypes'

interface RecoveryApplicationOrchestratorSuccessModalProps {
  open: boolean
  onClose: () => void
  applicationName: string
  orchestratorPush: OrchestratorPush
}

export function RecoveryApplicationOrchestratorSuccessModal({
  open,
  onClose,
  applicationName,
  orchestratorPush,
}: RecoveryApplicationOrchestratorSuccessModalProps) {
  const { t } = useTranslation()

  return (
    <OrchestratorResultModal
      open={open}
      onClose={onClose}
      title={t('recovery.application.orchestratorModal.title')}
      ariaLabel={t('recovery.application.orchestratorModal.ariaLabel')}
      description={t('recovery.application.orchestratorModal.description').replace('{applicationName}', applicationName)}
      statusLabel={t('recovery.application.orchestratorModal.status')}
      status={orchestratorPush.status}
      closeLabel={t('buttons.close')}
      externalActionLabel={t('recovery.application.orchestratorModal.viewInAirflow')}
      onExternalAction={() => { window.open(buildAirflowDagUrl(orchestratorPush.dag_id), '_blank', 'noopener,noreferrer') }}
      details={[
        { label: t('recovery.application.orchestratorModal.dag'), value: orchestratorPush.dag, mono: true },
        { label: t('recovery.application.orchestratorModal.json'), value: orchestratorPush.json, mono: true },
        { label: t('recovery.application.orchestratorModal.dagId'), value: orchestratorPush.dag_id, mono: true },
      ]}
    />
  )
}
