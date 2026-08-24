import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import { buildAirflowDagUrl } from '@/config/externalServices'
import type { OrchestratorPush } from '../model/recoveryApplicationTypes'

interface RecoveryApplicationOrchestratorSuccessModalProps {
  open: boolean
  onClose: () => void
  applicationName: string
  orchestratorPush: OrchestratorPush
  providerUrl?: string | undefined
}

export function RecoveryApplicationOrchestratorSuccessModal({
  open,
  onClose,
  applicationName,
  orchestratorPush,
  providerUrl,
}: RecoveryApplicationOrchestratorSuccessModalProps) {
  const { t } = useTranslation()

  const checks: CheckItem[] = [
    {
      name: t('recovery.application.orchestratorModal.status'),
      detail: orchestratorPush.status,
      status: 'ok',
    },
    {
      name: t('recovery.application.orchestratorModal.dag'),
      detail: orchestratorPush.dag.substring(0, 100) + (orchestratorPush.dag.length > 100 ? '...' : ''),
      status: 'ok',
    },
  ]

  return (
    <ChecklistResultDialog
      open={open}
      title={t('recovery.application.orchestratorModal.title')}
      primaryName={applicationName}
      subtitle={orchestratorPush.dag_id}
      statusBar={{
        title: t('recovery.application.orchestratorModal.title'),
        status: 'success',
        passedCount: checks.length,
        totalCount: checks.length,
      }}
      checks={checks}
      responseData={orchestratorPush}
      responseSchemaType="OrchestratorPush"
      onClose={onClose}
      externalActionLabel={t('recovery.application.orchestratorModal.viewInAirflow')}
      onExternalAction={() => {
        window.open(buildAirflowDagUrl(orchestratorPush.dag_id, providerUrl), '_blank', 'noopener,noreferrer')
      }}
    />
  )
}
