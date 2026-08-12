import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Spinner } from '@/shared/components/spinner/Spinner'
import { ConfirmDialog } from '@/shared/components/modal/ConfirmDialog'
import { Modal } from '@/shared/components/modal/Modal'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSubmitRecoveryAppPolicy } from '../hooks/useSubmitRecoveryAppPolicy'
import type {
  RecoveryAppPolicy,
  RecoveryAppPolicySelectionMode,
  RecoveryAppPolicySubmitData,
  RecoveryAppPolicyTimeUnit,
} from '../model/recoveryAppPolicyTypes'
import { RecoveryAppPolicyForm } from './RecoveryAppPolicyForm'
import type { RecoveryAppPolicyFormData } from './RecoveryAppPolicyForm'

interface RecoveryAppPolicyModalProps {
  open: boolean
  onClose: () => void
  existingPolicies: RecoveryAppPolicy[]
  policy?: RecoveryAppPolicy
}

const EMPTY_FORM: RecoveryAppPolicyFormData = {
  id: '', name: '', description: '', level: '', frequencyValue: '1', frequencyUnit: 'minutes',
  retentionValue: '1', retentionUnit: 'days', bootVerify: false, snapshotSelectionMode: 'latest',
  snapshotMaxAgeValue: '', snapshotMaxAgeUnit: '', snapshotTargetTime: '', enabled: true,
}

function toFormData(policy: RecoveryAppPolicy): RecoveryAppPolicyFormData {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    level: policy.level,
    frequencyValue: String(policy.frequencyValue),
    frequencyUnit: policy.frequencyUnit,
    retentionValue: String(policy.retentionValue),
    retentionUnit: policy.retentionUnit,
    bootVerify: policy.bootVerify,
    snapshotSelectionMode: policy.snapshotSelectionMode,
    snapshotMaxAgeValue: policy.snapshotMaxAgeValue === null ? '' : String(policy.snapshotMaxAgeValue),
    snapshotMaxAgeUnit: policy.snapshotMaxAgeUnit ?? '',
    snapshotTargetTime: policy.snapshotTargetTime ?? '',
    enabled: policy.enabled,
  }
}

function initialForm(policy?: RecoveryAppPolicy) {
  return policy ? toFormData(policy) : EMPTY_FORM
}

function isSelectionMode(value: string): value is RecoveryAppPolicySelectionMode {
  return value === 'latest' || value === 'time_range' || value === 'exact_time'
}

function isTimeUnit(value: string): value is RecoveryAppPolicyTimeUnit {
  return value === 'minutes' || value === 'hours' || value === 'days'
}

export function RecoveryAppPolicyModal({ open, onClose, existingPolicies, policy }: RecoveryAppPolicyModalProps) {
  const { t } = useTranslation()
  const submitPolicy = useSubmitRecoveryAppPolicy()
  const isEdit = Boolean(policy)
  const [formData, setFormData] = useState<RecoveryAppPolicyFormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof RecoveryAppPolicyFormData, string>>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const initial = initialForm(policy)
  const isDirty = open && JSON.stringify(formData) !== JSON.stringify(initial)
  const navigationGuard = useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialForm(policy))
    setErrors({})
    setErrorMessage('')
  }, [open, policy])

  const close = () => {
    setFormData(EMPTY_FORM)
    setErrors({})
    setErrorMessage('')
    onClose()
  }

  const requestClose = () => {
    if (!submitPolicy.isPending) navigationGuard.requestNavigation(close)
  }

  const handleChange = <K extends keyof RecoveryAppPolicyFormData>(field: K, value: RecoveryAppPolicyFormData[K]) => {
    setFormData(previous => ({ ...previous, [field]: value }))
    if (errors[field]) {
      setErrors(previous => {
        const next = { ...previous }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete next[field]
        return next
      })
    }
    setErrorMessage('')
  }

  const validate = () => {
    const next: Partial<Record<keyof RecoveryAppPolicyFormData, string>> = {}
    const frequency = Number(formData.frequencyValue)
    const retention = Number(formData.retentionValue)
    const maxAge = formData.snapshotMaxAgeValue === '' ? null : Number(formData.snapshotMaxAgeValue)
    const mode = formData.snapshotSelectionMode
    if (!formData.id.trim()) next.id = t('recoveryAppPolicies.validation.idRequired')
    else if (!isEdit && existingPolicies.some(entry => entry.id === formData.id.trim())) next.id = t('recoveryAppPolicies.validation.idExists')
    if (!formData.name.trim()) next.name = t('recoveryAppPolicies.validation.nameRequired')
    if (!formData.description.trim()) next.description = t('recoveryAppPolicies.validation.descriptionRequired')
    if (!formData.level.trim()) next.level = t('recoveryAppPolicies.validation.levelRequired')
    if (!Number.isInteger(frequency) || frequency < 1) next.frequencyValue = t('recoveryAppPolicies.validation.positiveInteger')
    if (!Number.isInteger(retention) || retention < 1) next.retentionValue = t('recoveryAppPolicies.validation.positiveInteger')
    if (!isSelectionMode(mode)) next.snapshotSelectionMode = t('recoveryAppPolicies.validation.selectionRequired')
    if (mode === 'time_range') {
      if (maxAge === null || !Number.isInteger(maxAge) || maxAge < 1) next.snapshotMaxAgeValue = t('recoveryAppPolicies.validation.positiveInteger')
      if (!isTimeUnit(formData.snapshotMaxAgeUnit)) next.snapshotMaxAgeUnit = t('recoveryAppPolicies.validation.unitRequired')
    }
    if (mode === 'exact_time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(formData.snapshotTargetTime)) next.snapshotTargetTime = t('recoveryAppPolicies.validation.targetTime')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const mode = formData.snapshotSelectionMode as RecoveryAppPolicySelectionMode
    const commonRecord = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description.trim(),
      level: formData.level.trim(),
      frequencyValue: Number(formData.frequencyValue),
      frequencyUnit: formData.frequencyUnit as RecoveryAppPolicyTimeUnit,
      retentionValue: Number(formData.retentionValue),
      retentionUnit: formData.retentionUnit as RecoveryAppPolicyTimeUnit,
      bootVerify: formData.bootVerify,
      enabled: formData.enabled,
    }
    const record: RecoveryAppPolicySubmitData = mode === 'time_range'
      ? {
        ...commonRecord,
        snapshotSelectionMode: 'time_range',
        snapshotMaxAgeValue: Number(formData.snapshotMaxAgeValue),
        snapshotMaxAgeUnit: formData.snapshotMaxAgeUnit as RecoveryAppPolicyTimeUnit,
      }
      : mode === 'exact_time'
        ? {
          ...commonRecord,
          snapshotSelectionMode: 'exact_time',
          snapshotTargetTime: formData.snapshotTargetTime,
        }
        : {
          ...commonRecord,
          snapshotSelectionMode: 'latest',
        }
    submitPolicy.mutate(record, {
      onSuccess: () => { navigationGuard.runWithoutBlocking(close) },
      onError: (error: unknown) => {
        const detail = error instanceof Error ? error.message : ''
        setErrorMessage(detail ? `${t('recoveryAppPolicies.submitFailed')}: ${detail}` : t('recoveryAppPolicies.submitFailed'))
      },
    })
  }

  return (
    <>
      <Modal
        open={open}
        onClose={requestClose}
        closeOnBackdrop={false}
        size="lg"
        title={t(isEdit ? 'recoveryAppPolicies.modal.editTitle' : 'recoveryAppPolicies.modal.createTitle')}
        footer={(
          <>
            <Button onClick={requestClose} disabled={submitPolicy.isPending} size="sm" variant="outline" className="flex-1">{t('buttons.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitPolicy.isPending} startIcon={submitPolicy.isPending ? <Spinner /> : undefined} size="sm" className="flex-1">
              {submitPolicy.isPending ? t('messages.saving') : t(isEdit ? 'recoveryAppPolicies.modal.editTitle' : 'recoveryAppPolicies.modal.createTitle')}
            </Button>
          </>
        )}
      >
        {errorMessage ? <div className="mx-6 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</div> : null}
        <p className="mx-6 mt-4 text-sm text-text-muted">{t('recoveryAppPolicies.modal.description')}</p>
        <RecoveryAppPolicyForm data={formData} errors={errors} isSubmitting={submitPolicy.isPending} idDisabled={isEdit} onChange={handleChange} onSubmit={handleSubmit} />
      </Modal>
      <ConfirmDialog
        open={navigationGuard.isNavigationBlocked}
        title={t('recoveryAppPolicies.discard.title')}
        message={t('recoveryAppPolicies.discard.message')}
        cancelLabel={t('recoveryAppPolicies.discard.stay')}
        confirmLabel={t('recoveryAppPolicies.discard.confirm')}
        tone="danger"
        onCancel={navigationGuard.cancelNavigation}
        onConfirm={navigationGuard.confirmNavigation}
      />
    </>
  )
}
