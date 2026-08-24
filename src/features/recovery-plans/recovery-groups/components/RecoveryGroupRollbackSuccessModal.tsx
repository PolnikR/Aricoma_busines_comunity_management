import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { CheckIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'

interface RecoveryGroupRollbackSuccessModalProps {
  open: boolean
  onClose: () => void
  groupName: string
}

export function RecoveryGroupRollbackSuccessModal({
  open,
  onClose,
  groupName,
}: RecoveryGroupRollbackSuccessModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t('recoveryGroups.rollback.resultAriaLabel')}
      footer={
        <Button size="sm" className="w-full" onClick={onClose}>
          {t('buttons.close')}
        </Button>
      }
    >
      <div className="flex items-start gap-3.5 px-6 py-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
          <CheckIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {t('recoveryGroups.rollback.resultSuccessTitle')}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t('recoveryGroups.rollback.resultSuccessDescription').replace('{groupName}', groupName)}
          </p>
          <Badge color="success" size="sm" className="mt-3">
            {t('recoveryGroups.rollback.resultSuccessBadge')}
          </Badge>
        </div>
      </div>
    </Modal>
  )
}
